// ============================================================
// MessageInput.jsx — Text Input + Send Button
// ============================================================
//
// KEY CONCEPTS:
//   - Controlled input (value tied to React state)
//   - Debounced typing indicator (stop_typing after 1.5s of no input)
//   - useRef for the typing timeout
//   - Emoji picker panel
// ============================================================

import { useState, useRef } from "react";

// A compact, curated emoji set for the picker
const EMOJIS = [
  "😀","😂","😍","😎","🤔","😅","😭","😡","👍","👎",
  "🙏","👏","🔥","🎉","❤️","💯","✅","🚀","👀","🤝",
  "😴","🤯","😇","🥳","😢","😬","💪","🙌","☕","🍕",
];

export default function MessageInput({ room, typingUsers, onSend, onTyping, onStopTyping }) {
  const [text,    setText]    = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const typingTimeout = useRef(null); // holds the setTimeout ID
  const textareaRef   = useRef(null);

  // Insert an emoji at the end of the current text and refocus
  const insertEmoji = (emoji) => {
    setText((t) => t + emoji);
    setShowEmoji(false);
    textareaRef.current?.focus();
  };

  // Called on every keystroke
  const handleChange = (e) => {
    setText(e.target.value);

    // Tell server "user is typing"
    onTyping(room);

    // Clear existing timeout — restart the 1.5s countdown
    clearTimeout(typingTimeout.current);

    // After 1.5s of no typing → tell server "user stopped typing"
    typingTimeout.current = setTimeout(() => {
      onStopTyping(room);
    }, 1500);
  };

  // Send message on Enter key (without Shift)
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return; // don't send empty messages

    onSend(trimmed, room); // emit to server via App.jsx → useSocket
    setText("");            // clear input

    // Stop typing indicator immediately
    clearTimeout(typingTimeout.current);
    onStopTyping(room);
  };

  // Build typing indicator text
  // e.g. "Riya is typing..." or "Riya and Amit are typing..."
  const typingText = () => {
    if (typingUsers.length === 0) return "";
    if (typingUsers.length === 1) return `${typingUsers[0]} is typing...`;
    if (typingUsers.length === 2) return `${typingUsers[0]} and ${typingUsers[1]} are typing...`;
    return "Several people are typing...";
  };

  return (
    <div style={styles.wrapper}>
      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div style={styles.typing}>
          <span style={styles.dotsWrap}>
            <span style={{ ...styles.dot, animationDelay: "0ms" }} />
            <span style={{ ...styles.dot, animationDelay: "150ms" }} />
            <span style={{ ...styles.dot, animationDelay: "300ms" }} />
          </span>
          {typingText()}
        </div>
      )}

      {/* Emoji picker panel */}
      {showEmoji && (
        <div className="emoji-panel" style={styles.emojiPanel}>
          {EMOJIS.map((emoji) => (
            <span
              key={emoji}
              className="emoji-cell"
              style={styles.emojiCell}
              onClick={() => insertEmoji(emoji)}
            >
              {emoji}
            </span>
          ))}
        </div>
      )}

      {/* Input area */}
      <div style={styles.inputRow}>
        <button
          type="button"
          onClick={() => setShowEmoji((v) => !v)}
          style={{ ...styles.emojiBtn, color: showEmoji ? "var(--accent-2)" : "var(--text-dim)" }}
          title="Emoji"
        >
          😊
        </button>
        <textarea
          ref={textareaRef}
          style={styles.textarea}
          placeholder="Type a message... (Enter to send)"
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          rows={1}
          maxLength={500}
        />
        <button
          style={{
            ...styles.sendBtn,
            opacity:  text.trim() ? 1 : 0.5,
            cursor:   text.trim() ? "pointer" : "default",
          }}
          onClick={handleSend}
          disabled={!text.trim()}
        >
          ➤
        </button>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    position: "relative",
    borderTop: "1px solid var(--border)",
    padding: "14px 18px",
    background: "var(--surface)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
  },
  emojiPanel: {
    position: "absolute",
    bottom: "100%",
    left: 16,
    marginBottom: 8,
    width: 280,
    display: "flex",
    flexWrap: "wrap",
    gap: 2,
    padding: 10,
    background: "var(--surface-strong)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid var(--border-strong)",
    borderRadius: 16,
    boxShadow: "0 12px 30px rgba(0,0,0,0.45)",
    zIndex: 20,
  },
  emojiCell: {
    fontSize: 20,
    width: 34,
    height: 34,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  emojiBtn: {
    width: 40,
    height: 44,
    background: "transparent",
    border: "none",
    fontSize: 22,
    cursor: "pointer",
    flexShrink: 0,
    lineHeight: 1,
  },
  typing: {
    fontSize: 12,
    color: "var(--text-dim)",
    marginBottom: 8,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  dotsWrap: { display: "inline-flex", alignItems: "flex-end", gap: 3 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "var(--accent-2)",
    display: "inline-block",
    animation: "typingBounce 1.2s infinite ease-in-out",
  },
  inputRow: {
    display: "flex",
    gap: 10,
    alignItems: "flex-end",
  },
  textarea: {
    flex: 1,
    padding: "12px 16px",
    borderRadius: 22,
    border: "1px solid var(--border-strong)",
    background: "var(--surface-strong)",
    color: "var(--text)",
    fontSize: 14,
    resize: "none",
    outline: "none",
    fontFamily: "inherit",
    lineHeight: 1.5,
    maxHeight: 100,
    overflowY: "auto",
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: "50%",
    background: "var(--accent-grad)",
    color: "#fff",
    border: "none",
    fontSize: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    boxShadow: "0 6px 16px rgba(99,102,241,0.4)",
    transition: "opacity 0.2s, transform 0.15s",
  },
};
