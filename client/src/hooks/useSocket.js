// ============================================================
// useSocket.js — Custom React Hook for Socket.io
// ============================================================
//
// WHY A CUSTOM HOOK?
// Instead of connecting to the socket inside every component,
// we create ONE hook that manages the connection.
// Any component can call useSocket() and get the same socket.
// ============================================================

import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { playPing } from "../utils/sound";
import { conversationOf } from "../utils/conversation";

const SERVER_URL = "http://localhost:4000"; // Our Node.js server

export function useSocket() {
  // useRef stores the socket without causing re-renders when it changes
  const socketRef = useRef(null);
  // Remember my own username so we don't ping/sound on our own messages
  const usernameRef = useRef(null);
  // The conversation currently on screen (a room name OR a dm conversation id)
  const activeConvRef = useRef(null);

  const [isConnected, setIsConnected] = useState(false);
  const [messages,    setMessages]    = useState([]);  // messages of the ACTIVE conversation
  const [onlineUsers, setOnlineUsers] = useState([]); // who's online
  const [typingUsers, setTypingUsers] = useState([]); // who's typing
  const [reactions,   setReactions]   = useState({}); // { messageId: { emoji: [users] } }
  const [seenAt,      setSeenAt]      = useState(null); // last time someone else saw the room
  const [unread,      setUnread]      = useState({});  // { conversationId: count }
  const [dmPartners,  setDmPartners]  = useState([]);  // usernames you have DMs with

  // useEffect runs ONCE when component mounts (empty [] dependency array)
  useEffect(() => {
    // Create the WebSocket connection to server
    socketRef.current = io(SERVER_URL, {
      transports: ["websocket"], // use WebSocket (not long-polling)
    });

    const socket = socketRef.current;

    // ── Listen for connection events ──────────────────────────
    socket.on("connect", () => {
      console.log("✅ Connected to server, socket ID:", socket.id);
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("❌ Disconnected from server");
      setIsConnected(false);
    });

    // ── Listen for incoming messages from server ──────────────
    socket.on("receive_message", (messageData) => {
      const cid = conversationOf(messageData);

      // Track DM partners so they always appear in the sidebar
      if (messageData.isDM) {
        const partner =
          messageData.from === usernameRef.current ? messageData.to : messageData.from;
        setDmPartners((p) => (p.includes(partner) ? p : [...p, partner]));
      }

      if (cid === activeConvRef.current) {
        // Belongs to the open conversation → show it
        setMessages((prev) => [...prev, messageData]);
      } else {
        // For another conversation → bump its unread badge
        setUnread((u) => ({ ...u, [cid]: (u[cid] || 0) + 1 }));
      }

      // Play a subtle chime for messages from OTHER people only
      if (messageData.username !== usernameRef.current) playPing();
    });

    // ── A direct-message conversation was opened ──────────────
    socket.on("dm_opened", ({ conversationId, withUser, messages: history, reactions: rx }) => {
      activeConvRef.current = conversationId;
      setMessages(history || []);
      setReactions(rx || {});
      setSeenAt(null);
      setUnread((u) => ({ ...u, [conversationId]: 0 }));
      setDmPartners((p) => (p.includes(withUser) ? p : [...p, withUser]));
    });

    // ── Load chat history when joining a room ─────────────────
    socket.on("message_history", (history) => {
      setMessages(history); // Replace messages with history
    });

    // ── Reactions ─────────────────────────────────────────────
    // Full snapshot on join, then incremental updates per message
    socket.on("reactions_snapshot", (all) => setReactions(all || {}));
    socket.on("reaction_update", ({ messageId, reactions: r }) => {
      setReactions((prev) => {
        const next = { ...prev };
        if (r && Object.keys(r).length) next[messageId] = r;
        else delete next[messageId];
        return next;
      });
    });

    // ── Read receipts ─────────────────────────────────────────
    // Someone else viewed the room → mark our delivered messages as "read"
    socket.on("messages_seen", () => setSeenAt(new Date().toISOString()));

    // ── Online users list ─────────────────────────────────────
    socket.on("room_users", ({ users }) => {
      setOnlineUsers(users);
    });

    // ── User joined/left notifications ────────────────────────
    socket.on("user_joined", ({ username }) => {
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), type: "system", message: `${username} joined the room 👋`, timestamp: new Date().toISOString() },
      ]);
    });

    socket.on("user_left", ({ username }) => {
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), type: "system", message: `${username} left the room`, timestamp: new Date().toISOString() },
      ]);
    });

    // ── Typing indicators ─────────────────────────────────────
    socket.on("user_typing", ({ username }) => {
      setTypingUsers((prev) =>
        prev.includes(username) ? prev : [...prev, username]
      );
    });

    socket.on("user_stop_typing", ({ username }) => {
      setTypingUsers((prev) => prev.filter((u) => u !== username));
    });

    // ── Cleanup when component unmounts ───────────────────────
    return () => {
      socket.disconnect();
    };
  }, []); // [] = run only once on mount

  // ── Functions to EMIT events to server ───────────────────────

  // Join a group room with a username
  const joinRoom = (username, room) => {
    usernameRef.current = username;
    activeConvRef.current = room;
    setReactions({});  // reset reactions when switching conversations
    setSeenAt(null);
    setUnread((u) => ({ ...u, [room]: 0 }));
    socketRef.current?.emit("join_room", { username, room });
  };

  // Open a 1-on-1 direct conversation (server replies with "dm_opened")
  const openDm = (toUser) => {
    socketRef.current?.emit("open_dm", { to: toUser });
  };

  // Send a private message to a specific person
  const sendDm = (toUser, message) => {
    socketRef.current?.emit("send_dm", { to: toUser, message });
  };

  // Send a message to the current room
  const sendMessage = (message, room) => {
    socketRef.current?.emit("send_message", { message, room });
  };

  // Tell server user started typing
  const startTyping = (room) => {
    socketRef.current?.emit("typing", { room });
  };

  // Tell server user stopped typing
  const stopTyping = (room) => {
    socketRef.current?.emit("stop_typing", { room });
  };

  // Toggle a reaction emoji on a message
  const addReaction = (messageId, emoji, room) => {
    socketRef.current?.emit("add_reaction", { messageId, emoji, room });
  };

  // Tell the room we've seen the latest messages (drives read receipts)
  const markSeen = (room) => {
    socketRef.current?.emit("mark_seen", { room });
  };

  // Return everything components need
  return {
    socket: socketRef.current,
    isConnected,
    messages,
    onlineUsers,
    typingUsers,
    reactions,
    seenAt,
    unread,
    dmPartners,
    joinRoom,
    openDm,
    sendMessage,
    sendDm,
    startTyping,
    stopTyping,
    addReaction,
    markSeen,
  };
}
