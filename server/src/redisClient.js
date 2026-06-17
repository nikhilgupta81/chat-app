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

// In production, set REDIS_URL to your hosted Redis (e.g. Upstash):
//   rediss://default:<password>@<host>:<port>
// Locally it falls back to a Redis running on 127.0.0.1:6379.
const REDIS_URL = process.env.REDIS_URL;
const makeClient = () => (REDIS_URL ? new Redis(REDIS_URL) : new Redis({ host: "127.0.0.1", port: 6379 }));

// Publisher client — used to SEND messages and READ/WRITE data
const publisher = makeClient();

// Subscriber client — used ONLY to LISTEN for messages
const subscriber = makeClient();

// Log connection status
publisher.on("connect", () => console.log("✅ Redis publisher connected"));
subscriber.on("connect", () => console.log("✅ Redis subscriber connected"));

publisher.on("error", (err) => console.error("❌ Redis publisher error:", err.message));
subscriber.on("error", (err) => console.error("❌ Redis subscriber error:", err.message));

module.exports = { publisher, subscriber };
