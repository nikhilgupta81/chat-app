// ============================================================
// conversation.js — Conversation id helpers
// ============================================================
//
// A "conversation" is either a group room ("General") or a 1-on-1
// direct message. For DMs we build a deterministic id by sorting
// the two usernames, so both people resolve to the SAME id.
// This MUST match the server's dmId() exactly.
// ============================================================

export const dmId = (a, b) => `dm:${[a, b].sort().join(":")}`;

// The id of whatever conversation an incoming message belongs to:
// DMs carry conversationId; group messages just use their room name.
export const conversationOf = (msg) => msg.conversationId || msg.room;
