// ============================================================
// Login.jsx — Username + Room Selection Screen
// ============================================================

import { useState } from "react";

export default function Login({ rooms, isConnected, onJoin }) {
  const [username, setUsername] = useState("");
  const [room,     setRoom]     = useState(rooms[0]); // default to first room
  const [error,    setError]    = useState("");

  const handleSubmit = (e) => {
    e.preventDefault(); // prevent page reload (default form behaviour)

    // Simple validation
    if (!username.trim()) {
      setError("Please enter a username");
      return;
    }
    if (username.trim().length < 2) {
      setError("Username must be at least 2 characters");
      return;
    }

    onJoin(username.trim(), room); // call App.jsx handler
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <span className="logo-float" style={styles.logo}>💬</span>
          <h1 style={styles.title}>Real-Time Chat</h1>
          <p style={styles.subtitle}>Connect. Talk. Collaborate.</p>
        </div>

        {/* Connection status badge */}
        <div style={{
          ...styles.badge,
          background: isConnected ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
          color:      isConnected ? "#4ade80" : "#f87171",
          border:     `1px solid ${isConnected ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
        }}>
          <span
            className={isConnected ? "live-dot" : ""}
            style={{ ...styles.statusDot, background: isConnected ? "var(--online)" : "var(--offline)" }}
          />
          {isConnected ? "Server Connected" : "Connecting to server..."}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Your Username</label>
            <input
              style={styles.input}
              type="text"
              placeholder="e.g. Nikhil"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(""); }}
              maxLength={20}
              autoFocus
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Choose Room</label>
            <select
              style={styles.input}
              value={room}
              onChange={(e) => setRoom(e.target.value)}
            >
              {rooms.map((r) => (
                <option key={r} value={r} style={{ color: "#111827" }}>{r}</option>
              ))}
            </select>
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button
            type="submit"
            style={{ ...styles.button, opacity: isConnected ? 1 : 0.6 }}
            disabled={!isConnected}
          >
            {isConnected ? "Join Chat →" : "Waiting for server..."}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Inline styles ─────────────────────────────────────────────
const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, var(--bg-1), var(--bg-2), var(--bg-3), var(--bg-2))",
    backgroundSize: "300% 300%",
    animation: "gradientShift 14s ease infinite",
    padding: 20,
  },
  card: {
    background: "var(--surface-strong)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: "1px solid var(--border-strong)",
    borderRadius: 24,
    padding: "44px 38px",
    width: "100%",
    maxWidth: 420,
    boxShadow: "0 30px 60px rgba(0,0,0,0.45)",
  },
  header: { textAlign: "center", marginBottom: 26 },
  logo:   { fontSize: 52, display: "inline-block" },
  title:  { margin: "10px 0 4px", fontSize: 28, fontWeight: 800, color: "var(--text)", letterSpacing: -0.5 },
  subtitle: { margin: 0, color: "var(--text-dim)", fontSize: 14 },
  badge: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 30,
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 26,
  },
  statusDot: { width: 8, height: 8, borderRadius: "50%", display: "inline-block" },
  form:  { display: "flex", flexDirection: "column", gap: 18 },
  field: { display: "flex", flexDirection: "column", gap: 7 },
  label: { fontSize: 13, fontWeight: 600, color: "var(--text-dim)" },
  input: {
    padding: "12px 15px",
    borderRadius: 12,
    border: "1px solid var(--border-strong)",
    background: "var(--surface)",
    color: "var(--text)",
    fontSize: 15,
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    fontFamily: "inherit",
  },
  error: { color: "#f87171", fontSize: 13, margin: 0 },
  button: {
    padding: "13px",
    background: "var(--accent-grad)",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    marginTop: 4,
    boxShadow: "0 8px 20px rgba(99,102,241,0.4)",
    transition: "transform 0.15s, opacity 0.2s",
  },
};
