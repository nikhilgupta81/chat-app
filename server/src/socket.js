// ============================================================
// socket.js — All Real-Time Logic (The Heart of the App)
// ============================================================
//
// HOW SOCKET.IO WORKS:
//
//   Client (React)          Server (Node.js)
//       |                        |
//       |--- socket.emit() ----->|   Client SENDS an event
//       |                        |
//       |<-- socket.emit() ------|   Server sends to ONE client
//       |<-- io.emit() ---------|   Server sends to ALL clients
//       |<-- socket.to(room) ---|   Server sends to a ROOM
//
// EVENTS WE HANDLE:
//   "join_room"     → User enters a chat room
//   "send_message"  → User sends a message to a room
//   "open_dm"       → User opens a 1-on-1 conversation
//   "send_dm"       → User sends a private message
//   "add_reaction"  → User reacts to a message
//   "mark_seen"     → User has viewed the conversation
//   "typing"        → User is typing
//   "stop_typing"   → User stopped typing
//   "disconnect"    → User closes the browser tab
// ============================================================

const { publisher, subscriber } = require("./redisClient");

// REDIS KEYS — these are like "folder names" in Redis
const MESSAGES_KEY  = (room) => `chat:messages:${room}`;  // e.g. "chat:messages:general"
const USERS_KEY     = (room) => `chat:users:${room}`;      // e.g. "chat:users:general"
const REACTIONS_KEY = (room) => `chat:reactions:${room}`;  // Redis HASH: messageId → {emoji:[users]}
const REDIS_CHANNEL = "chat_channel"; // Pub/Sub channel name

// Common emoji set allowed for reactions (keeps payloads sane)
const ALLOWED_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

// Deterministic conversation id for a 1-on-1 DM.
// Sorting the names means Alice→Bob and Bob→Alice map to the SAME id.
const dmId = (a, b) => `dm:${[a, b].sort().join(":")}`;

// Store connected users in memory (socket.id → user info)
// In production you'd use Redis for this too
const connectedUsers = new Map();

// Join every locally-connected socket belonging to `username` into `room`.
// Used so a DM recipient receives messages even if they haven't opened the
// conversation yet. Each server instance only knows its own sockets, which is
// exactly what we want behind a load balancer.
function joinUserToRoom(io, username, room) {
  for (const [sid, u] of connectedUsers) {
    if (u.username === username) {
      io.sockets.sockets.get(sid)?.join(room);
    }
  }
}

function initSocket(io) {

  // ── Subscribe to Redis channel ─────────────────────────────
  // When ANY server publishes a message to "chat_channel",
  // ALL server instances receive it here and broadcast to their clients.
  // This is how you scale to multiple servers!
  subscriber.subscribe(REDIS_CHANNEL, (err) => {
    if (err) console.error("Redis subscribe error:", err);
    else console.log(`📡 Subscribed to Redis channel: ${REDIS_CHANNEL}`);
  });

  // When Redis receives a published message → broadcast to all Socket clients
  subscriber.on("message", (channel, rawMessage) => {
    if (channel === REDIS_CHANNEL) {
      const messageData = JSON.parse(rawMessage);
      // For DMs, make sure both participants' sockets are in the conversation
      // room (lazy join) so the recipient receives it even if they haven't
      // opened the chat. messageData.room is the dm conversation id here.
      if (messageData.isDM) {
        joinUserToRoom(io, messageData.from, messageData.room);
        joinUserToRoom(io, messageData.to, messageData.room);
      }
      // Send to everyone in that specific room / conversation
      io.to(messageData.room).emit("receive_message", messageData);
    }
  });

  // ── Handle each new Socket.io connection ──────────────────
  io.on("connection", (socket) => {
    console.log(`🔌 New connection: ${socket.id}`);

    // ── EVENT: User joins a room ─────────────────────────────
    socket.on("join_room", async ({ username, room }) => {

      // Leave previous room if switching rooms
      const prevUser = connectedUsers.get(socket.id);
      if (prevUser) {
        socket.leave(prevUser.room);
        await publisher.srem(USERS_KEY(prevUser.room), prevUser.username);
        io.to(prevUser.room).emit("user_left", { username: prevUser.username });
        await broadcastUserList(io, prevUser.room);
      }

      // Save user info
      connectedUsers.set(socket.id, { username, room });

      // Join Socket.io room — now this socket receives room-specific events
      socket.join(room);

      // Add username to Redis Set for this room
      await publisher.sadd(USERS_KEY(room), username);

      // Send last 50 messages to the newly joined user (chat history)
      const rawMessages = await publisher.lrange(MESSAGES_KEY(room), 0, 49);
      const history = rawMessages.map((m) => JSON.parse(m)).reverse(); // oldest first
      socket.emit("message_history", history);

      // Send current reactions for this room so they survive refresh/rejoin
      const rawReactions = await publisher.hgetall(REACTIONS_KEY(room));
      const reactions = {};
      for (const [mid, val] of Object.entries(rawReactions)) reactions[mid] = JSON.parse(val);
      socket.emit("reactions_snapshot", reactions);

      // Tell everyone in the room a new user joined
      socket.to(room).emit("user_joined", { username });

      // Send updated online users list to entire room
      await broadcastUserList(io, room);

      console.log(`👤 ${username} joined room: ${room}`);
    });

    // ── EVENT: User sends a message ──────────────────────────
    socket.on("send_message", async ({ message, room }) => {
      const user = connectedUsers.get(socket.id);
      if (!user) return; // Safety check

      // Build the message object
      const messageData = {
        id:        `${Date.now()}-${socket.id}`, // unique ID
        username:  user.username,
        message:   message.trim(),
        room,
        timestamp: new Date().toISOString(),
      };

      // Save to Redis LIST (lpush = add to the LEFT/front of the list)
      // We keep only 50 messages — ltrim removes older ones
      await publisher.lpush(MESSAGES_KEY(room), JSON.stringify(messageData));
      await publisher.ltrim(MESSAGES_KEY(room), 0, 49); // keep last 50

      // Publish to Redis channel → subscriber picks it up → broadcasts to all clients
      await publisher.publish(REDIS_CHANNEL, JSON.stringify(messageData));

      console.log(`💬 [${room}] ${user.username}: ${message}`);
    });

    // ── EVENT: Open a 1-on-1 direct message conversation ─────
    // Joins the DM "room" and returns its history + reactions.
    socket.on("open_dm", async ({ to }) => {
      const me = connectedUsers.get(socket.id);
      if (!me || !to || to === me.username) return;

      const cid = dmId(me.username, to);
      socket.join(cid); // so typing/reactions reach me before the first message

      const rawMessages = await publisher.lrange(MESSAGES_KEY(cid), 0, 49);
      const messages = rawMessages.map((m) => JSON.parse(m)).reverse();

      const rawReactions = await publisher.hgetall(REACTIONS_KEY(cid));
      const reactions = {};
      for (const [mid, val] of Object.entries(rawReactions)) reactions[mid] = JSON.parse(val);

      socket.emit("dm_opened", { conversationId: cid, withUser: to, messages, reactions });
      console.log(`✉️  ${me.username} opened DM with ${to}`);
    });

    // ── EVENT: Send a direct (private) message ───────────────
    socket.on("send_dm", async ({ to, message }) => {
      const me = connectedUsers.get(socket.id);
      if (!me || !to || !message?.trim()) return;

      const cid = dmId(me.username, to);
      const messageData = {
        id:             `${Date.now()}-${socket.id}`,
        username:       me.username, // keep "username" so the client renders it like any message
        from:           me.username,
        to,
        message:        message.trim(),
        room:           cid,   // delivery target (the conversation)
        conversationId: cid,
        isDM:           true,
        timestamp:      new Date().toISOString(),
      };

      // Persist history per conversation (last 50), then publish for delivery
      await publisher.lpush(MESSAGES_KEY(cid), JSON.stringify(messageData));
      await publisher.ltrim(MESSAGES_KEY(cid), 0, 49);
      await publisher.publish(REDIS_CHANNEL, JSON.stringify(messageData));

      console.log(`🔒 DM ${me.username} → ${to}: ${message}`);
    });

    // ── EVENT: Add / remove a reaction on a message ──────────
    // Toggling: clicking the same emoji again removes your reaction.
    socket.on("add_reaction", async ({ messageId, emoji, room }) => {
      const user = connectedUsers.get(socket.id);
      if (!user || !ALLOWED_REACTIONS.includes(emoji)) return;

      const key = REACTIONS_KEY(room);
      const raw = await publisher.hget(key, messageId);
      const map = raw ? JSON.parse(raw) : {}; // { "👍": ["Alice", "Bob"], ... }

      const list = map[emoji] || [];
      const idx = list.indexOf(user.username);
      if (idx === -1) list.push(user.username); // add
      else list.splice(idx, 1);                 // remove (toggle off)

      if (list.length) map[emoji] = list;
      else delete map[emoji];

      // Persist (or clear the field if no reactions remain)
      if (Object.keys(map).length) await publisher.hset(key, messageId, JSON.stringify(map));
      else await publisher.hdel(key, messageId);

      // Broadcast the updated reaction map for this message to the whole room
      io.to(room).emit("reaction_update", { messageId, reactions: map });
    });

    // ── EVENT: User has seen the room (for read receipts) ────
    // Tell everyone else in the room so senders can show blue ticks.
    socket.on("mark_seen", ({ room }) => {
      const user = connectedUsers.get(socket.id);
      if (user) socket.to(room).emit("messages_seen", { username: user.username });
    });

    // ── EVENT: Typing indicator ───────────────────────────────
    // socket.to(room) = send to everyone in room EXCEPT the sender
    socket.on("typing", ({ room }) => {
      const user = connectedUsers.get(socket.id);
      if (user) {
        socket.to(room).emit("user_typing", { username: user.username });
      }
    });

    socket.on("stop_typing", ({ room }) => {
      const user = connectedUsers.get(socket.id);
      if (user) {
        socket.to(room).emit("user_stop_typing", { username: user.username });
      }
    });

    // ── EVENT: User disconnects (closes tab/browser) ─────────
    socket.on("disconnect", async () => {
      const user = connectedUsers.get(socket.id);
      if (user) {
        // Remove from Redis users set
        await publisher.srem(USERS_KEY(user.room), user.username);
        // Remove from memory
        connectedUsers.delete(socket.id);
        // Notify room
        io.to(user.room).emit("user_left", { username: user.username });
        // Update user list
        await broadcastUserList(io, user.room);
        console.log(`👋 ${user.username} disconnected`);
      }
    });
  });
}

// ── Helper: get all users in a room and broadcast ─────────────
async function broadcastUserList(io, room) {
  // smembers = get ALL members of a Redis Set
  const users = await publisher.smembers(USERS_KEY(room));
  io.to(room).emit("room_users", { room, users });
}

module.exports = { initSocket };
