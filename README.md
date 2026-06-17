# 💬 Real-Time Chat App

A full-stack, multi-room chat application with live messaging, presence, typing
indicators, reactions, read receipts and **private direct messages** — built with
**React + Socket.io + Redis** and designed to **scale across multiple server
instances** via Redis Pub/Sub.

> A modern, dark "glassmorphism" UI with animated messages, live presence dots, and
> consistent per-user avatar colors.

---

## ✨ Features

- ⚡ **Real-time messaging** over WebSockets (Socket.io)
- 🔒 **Private 1-on-1 direct messages** — click a person to chat privately
- 🟢 **Live online-users list** that updates as people join/leave
- ✍️ **Typing indicators** ("Nikhil is typing…") with animated dots
- ❤️ **Message reactions** (synced live, persisted in Redis)
- ✓✓ **Delivery / read receipts** (grey → blue ticks)
- 🗓️ **Date separators + message grouping** (WhatsApp-style)
- 🔔 **Notification chime + unread badges**
- 🕘 **Message history** — last 50 messages per conversation, persisted in Redis
- 🚪 **Multiple rooms** (General, Tech Talk, Random)
- 🎨 **Modern UI** — dark glassmorphism, gradient bubbles, doodle wallpaper

---

## 🏗️ Architecture

```
   ┌──────────────┐        WebSocket         ┌──────────────┐
   │ React client │  ◄────────────────────►  │  Node server │
   │  (Vite)      │       (Socket.io)        │  + Express   │
   └──────────────┘                          └──────┬───────┘
                                                     │
                                       publish ▲     │ ▼ subscribe
                                               │     │
                                          ┌────┴─────┴────┐
                                          │     Redis     │
                                          │  Pub/Sub +    │
                                          │  message store│
                                          └───────────────┘
```

**Message flow:** client emits → server saves to Redis + publishes → every server
instance (subscribed) broadcasts to its clients. Routing through Redis Pub/Sub means
the app scales horizontally: a message sent to server A still reaches users on server B.

**Direct messages** use a deterministic conversation id (`dm:alice:bob`, names sorted)
so both people resolve to the same private conversation.

**Redis usage**

| Purpose | Structure | Key |
|---------|-----------|-----|
| Message history | List (last 50) | `chat:messages:<conv>` |
| Online users | Set | `chat:users:<room>` |
| Reactions | Hash | `chat:reactions:<conv>` |
| Cross-server broadcast | Pub/Sub channel | `chat_channel` |

---

## 🗂️ Project Structure

```
chat-app/
├── server/                      ← Node.js backend
│   └── src/
│       ├── index.js             ← Express + HTTP server, Socket.io, CORS, /health
│       ├── socket.js            ← Core real-time logic (all socket events)
│       └── redisClient.js       ← Redis connection (publisher + subscriber)
│
└── client/                      ← React frontend (Vite)
    └── src/
        ├── App.jsx              ← Routes + active-conversation state
        ├── index.css            ← Theme tokens (CSS variables) + animations
        ├── hooks/
        │   └── useSocket.js     ← Custom hook: socket connection + all state
        ├── pages/
        │   └── Login.jsx        ← Username + room entry screen
        ├── components/
        │   ├── ChatRoom.jsx     ← Main chat layout
        │   ├── MessageList.jsx  ← Messages (dates, grouping, reactions, ticks)
        │   ├── MessageInput.jsx ← Input + emoji picker + typing
        │   └── UserList.jsx     ← Rooms + online users + direct messages
        └── utils/
            ├── avatarColor.js   ← Deterministic gradient per username
            ├── conversation.js  ← DM conversation-id helpers
            └── sound.js         ← Notification chime (Web Audio)
```

---

## ⚙️ Prerequisites

1. **Node.js** (v18+) → https://nodejs.org
2. **Redis** → https://redis.io/docs/getting-started/installation/

```bash
# macOS
brew install redis && redis-server
```

---

## 🚀 How to Run

```bash
# 1. Start Redis
redis-server

# 2. Start the backend  → http://localhost:4000
cd server && npm install && npm run dev

# 3. Start the frontend → http://localhost:5173
cd client && npm install && npm run dev
```

Open **http://localhost:5173** in two tabs with different usernames. Chat in a room,
or click a person in the sidebar to start a private conversation. 🎉

> The backend's CORS is configured for `http://localhost:5173`, so run the client on
> that port.

---

## 🔮 Possible Improvements

- 🔐 **Authentication** — usernames are currently unverified.
- 🌐 **Shared presence** — online users live in an in-memory `Map`; moving it into
  Redis would make presence fully multi-instance.
- 📨 **Reactions/read-receipts via Pub/Sub** — currently broadcast directly (single
  instance); messages already use Pub/Sub.
- 💾 **Durable history** — swap the 50-message Redis list for a database.
