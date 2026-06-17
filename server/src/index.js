// ============================================================
// index.js — Server Entry Point
// ============================================================
//
// This file:
//   1. Creates an Express HTTP server
//   2. Attaches Socket.io to it
//   3. Configures CORS (so React on port 5173 can talk to server on 4000)
//   4. Starts listening on port 4000
// ============================================================

const express    = require("express");
const http       = require("http");
const { Server } = require("socket.io");
const cors       = require("cors");
const { initSocket } = require("./socket");

const app    = express();
const server = http.createServer(app); // Socket.io needs the raw HTTP server

// Where the frontend is hosted. In production set CLIENT_URL to your Vercel URL
// (e.g. https://my-chat.vercel.app); falls back to the Vite dev server locally.
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// ── CORS setup ─────────────────────────────────────────────
// Without this, browser blocks requests from different origins
app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

// ── Attach Socket.io to the HTTP server ────────────────────
const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,  // React frontend
    methods: ["GET", "POST"],
  },
});

// ── Health check endpoint ──────────────────────────────────
// Visit http://localhost:4000/health to check if server is running
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Chat server is running!" });
});

// ── Initialize all Socket.io event handlers ─────────────────
initSocket(io);

// ── Start server ───────────────────────────────────────────
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`\n🚀 Chat Server running at http://localhost:${PORT}`);
  console.log(`📡 WebSocket server ready for connections\n`);
});
