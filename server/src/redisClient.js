// ============================================================
// redisClient.js — Redis Connection
// ============================================================
//
// WHAT IS REDIS?
// Redis is an in-memory database — it stores data in RAM (super fast).
// We use it for two things:
//   1. STORAGE   → Save last 50 messages so new users see chat history
//   2. PUB/SUB   → Broadcast messages across multiple server instances
//
// WHY TWO CLIENTS?
// Redis Pub/Sub requires SEPARATE connections for publishing and subscribing.
// A client in "subscribe" mode can ONLY listen — it can't also write data.
// So we need:
//   - publisher  → writes messages + reads history
//   - subscriber → listens for new messages to broadcast
// ============================================================

const Redis = require("ioredis");

// Publisher client — used to SEND messages and READ/WRITE data
const publisher = new Redis({
  host: "127.0.0.1", // localhost — where Redis is running
  port: 6379,        // default Redis port
});

// Subscriber client — used ONLY to LISTEN for messages
const subscriber = new Redis({
  host: "127.0.0.1",
  port: 6379,
});

// Log connection status
publisher.on("connect", () => console.log("✅ Redis publisher connected"));
subscriber.on("connect", () => console.log("✅ Redis subscriber connected"));

publisher.on("error", (err) => console.error("❌ Redis publisher error:", err.message));
subscriber.on("error", (err) => console.error("❌ Redis subscriber error:", err.message));

module.exports = { publisher, subscriber };
