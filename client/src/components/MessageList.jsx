// ============================================================
// MessageList.jsx — Renders All Chat Messages
// ============================================================
//
// WhatsApp-style touches:
//   - Date separators ("Today" / "Yesterday" / date)
//   - Grouping consecutive messages from the same person
//   - Hover-to-react emoji bar + reaction chips (synced live)
//   - Delivery / read ticks on your own messages (✓✓ → blue)
//   - Smart auto-scroll + floating "jump to latest" button
// ============================================================

import { useEffect, useRef, useState } from "react";
import { avatarGradient } from "../utils/avatarColor";

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
const GROUP_GAP_MS = 5 * 60 * 1000; // messages within 5 min from same user are grouped

// ── Date helpers ──────────────────────────────────────────────
const dayKey = (iso) => new Date(iso).toDateString();
function dayLabel(iso) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}
const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function MessageList({
  messages,
  currentUsername,
  room,
  reactions = {},
  seenAt,
  onReact,
  onSeen,
}) {
  const containerRef = useRef(null);
  const bottomRef = useRef(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const isNearBottom = () => {
    const el = containerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 100;
  };

  // Auto-scroll only if the user is already near the bottom (don't yank them
  // down while they're reading history) — otherwise reveal the jump button.
  useEffect(() => {
    if (isNearBottom()) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      setShowScrollBtn(false);
    } else {
      setShowScrollBtn(true);
    }
    // Mark the room as seen if our tab is focused (drives read receipts)
    if (typeof document === "undefined" || document.hasFocus()) onSeen?.(room);
  }, [messages, room]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleScroll = () => setShowScrollBtn(!isNearBottom());
  const jumpToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowScrollBtn(false);
  };

  // ── Build the rendered list with day separators + grouping ──
  const items = [];
  let lastDay = null;
  let prevMsg = null;

  messages.forEach((msg) => {
    // Day separator when the calendar day changes
    const dk = dayKey(msg.timestamp);
    if (dk !== lastDay) {
      items.push(
        <div key={`day-${dk}-${msg.id}`} style={styles.dayWrap}>
          <span style={styles.dayChip}>{dayLabel(msg.timestamp)}</span>
        </div>
      );
      lastDay = dk;
      prevMsg = null; // a new day always starts a fresh group
    }

    // System messages (join/leave) — centered, break grouping
    if (msg.type === "system") {
      items.push(
        <div key={msg.id} className="msg-enter" style={styles.system}>
          {msg.message}
        </div>
      );
      prevMsg = null;
      return;
    }

    const isOwn = msg.username === currentUsername;
    const startsGroup =
      !prevMsg ||
      prevMsg.username !== msg.username ||
      new Date(msg.timestamp) - new Date(prevMsg.timestamp) > GROUP_GAP_MS;
    prevMsg = msg;

    const msgReactions = reactions[msg.id] || {};
    const hasReactions = Object.keys(msgReactions).length > 0;
    const isRead = isOwn && seenAt && new Date(msg.timestamp) <= new Date(seenAt);

    items.push(
      <div
        key={msg.id}
        className="msg-enter"
        style={{
          ...styles.row,
          justifyContent: isOwn ? "flex-end" : "flex-start",
          marginTop: startsGroup ? 10 : 2,
        }}
        onMouseEnter={() => setHoveredId(msg.id)}
        onMouseLeave={() => setHoveredId((id) => (id === msg.id ? null : id))}
      >
        {/* Avatar for others (only on the first message of a group) */}
        {!isOwn && (
          <div style={{ width: 32, flexShrink: 0 }}>
            {startsGroup && (
              <div style={{ ...styles.avatar, background: avatarGradient(msg.username) }}>
                {msg.username[0].toUpperCase()}
              </div>
            )}
          </div>
        )}

        <div style={{ ...styles.col, alignItems: isOwn ? "flex-end" : "flex-start" }}>
          {/* Username label (others, first of group only) */}
          {!isOwn && startsGroup && (
            <div style={styles.usernameLabel}>{msg.username}</div>
          )}

          {/* Hover reaction picker */}
          {hoveredId === msg.id && (
            <div
              className="reaction-bar"
              style={{ ...styles.reactionBar, [isOwn ? "right" : "left"]: 0 }}
            >
              {REACTIONS.map((emoji) => (
                <span
                  key={emoji}
                  className="reaction-emoji"
                  style={styles.pickerEmoji}
                  onClick={() => onReact?.(msg.id, emoji, room)}
                >
                  {emoji}
                </span>
              ))}
            </div>
          )}

          {/* Bubble */}
          <div
            className={`bubble-base ${isOwn ? "bubble-own" : "bubble-other"} ${
              startsGroup ? "has-tail" : ""
            }`}
            style={{
              ...styles.bubble,
              background: isOwn ? "var(--accent-grad)" : "var(--bubble-other)",
              color: isOwn ? "#fff" : "var(--text)",
              border: isOwn ? "none" : "1px solid var(--border)",
              borderRadius: isOwn ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              boxShadow: isOwn ? "0 4px 14px rgba(99,102,241,0.35)" : "none",
            }}
          >
            {msg.message}
            <span style={styles.meta}>
              <span style={{ ...styles.time, color: isOwn ? "rgba(255,255,255,0.7)" : "var(--text-faint)" }}>
                {formatTime(msg.timestamp)}
              </span>
              {isOwn && (
                <span style={{ ...styles.tick, color: isRead ? "#38bdf8" : "rgba(255,255,255,0.7)" }}>
                  ✓✓
                </span>
              )}
            </span>
          </div>

          {/* Reaction chips */}
          {hasReactions && (
            <div style={styles.reactionChips}>
              {Object.entries(msgReactions).map(([emoji, users]) => {
                const mine = users.includes(currentUsername);
                return (
                  <span
                    key={emoji}
                    onClick={() => onReact?.(msg.id, emoji, room)}
                    title={users.join(", ")}
                    style={{
                      ...styles.chip,
                      background: mine ? "var(--accent-soft)" : "var(--surface-strong)",
                      border: `1px solid ${mine ? "var(--accent-2)" : "var(--border)"}`,
                    }}
                  >
                    {emoji} {users.length}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  });

  return (
    <div style={styles.outer}>
      <div ref={containerRef} onScroll={handleScroll} className="chat-wallpaper" style={styles.container}>
        {messages.length === 0 && (
          <div style={styles.empty}>
            <span style={{ fontSize: 40 }}>👋</span>
            <p>No messages yet. Say hello!</p>
          </div>
        )}

        {items}
        <div ref={bottomRef} />
      </div>

      {/* Floating jump-to-latest button */}
      {showScrollBtn && (
        <button className="scroll-btn" style={styles.scrollBtn} onClick={jumpToBottom} title="Jump to latest">
          ↓
        </button>
      )}
    </div>
  );
}

const styles = {
  outer: { flex: 1, position: "relative", display: "flex", overflow: "hidden" },
  container: {
    flex: 1,
    overflowY: "auto",
    padding: "16px 20px",
    display: "flex",
    flexDirection: "column",
  },
  empty: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--text-faint)",
    gap: 8,
    marginTop: 60,
  },
  dayWrap: { display: "flex", justifyContent: "center", margin: "14px 0 6px" },
  dayChip: {
    fontSize: 11,
    fontWeight: 600,
    color: "var(--text-dim)",
    background: "var(--surface-strong)",
    border: "1px solid var(--border)",
    padding: "4px 12px",
    borderRadius: 20,
  },
  system: {
    textAlign: "center",
    color: "var(--text-dim)",
    fontSize: 12,
    padding: "5px 14px",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 20,
    alignSelf: "center",
    margin: "4px 0",
  },
  row: { display: "flex", alignItems: "flex-end", gap: 8 },
  col: { display: "flex", flexDirection: "column", maxWidth: "70%", position: "relative" },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 700,
  },
  usernameLabel: {
    fontSize: 11,
    color: "var(--text-dim)",
    fontWeight: 600,
    marginBottom: 3,
    marginLeft: 4,
  },
  bubble: {
    padding: "8px 12px 6px",
    fontSize: 14,
    lineHeight: 1.45,
    wordBreak: "break-word",
  },
  meta: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    float: "right",
    margin: "4px 0 -2px 10px",
  },
  time: { fontSize: 10 },
  tick: { fontSize: 11, letterSpacing: -1 },
  reactionBar: {
    position: "absolute",
    top: -36,
    display: "flex",
    gap: 4,
    background: "var(--surface-strong)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    border: "1px solid var(--border-strong)",
    borderRadius: 22,
    padding: "5px 9px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.4)",
    zIndex: 5,
  },
  pickerEmoji: { fontSize: 18, display: "inline-block" },
  reactionChips: { display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 },
  chip: {
    fontSize: 11,
    fontWeight: 600,
    color: "var(--text)",
    padding: "2px 8px",
    borderRadius: 20,
    cursor: "pointer",
    userSelect: "none",
  },
  scrollBtn: {
    position: "absolute",
    bottom: 16,
    right: 20,
    width: 42,
    height: 42,
    borderRadius: "50%",
    background: "var(--surface-strong)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    border: "1px solid var(--border-strong)",
    color: "var(--text)",
    fontSize: 20,
    cursor: "pointer",
    boxShadow: "0 8px 20px rgba(0,0,0,0.45)",
    zIndex: 10,
  },
};
