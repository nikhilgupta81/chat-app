// ============================================================
// UserList.jsx — Rooms + Online Users + Direct Messages sidebar
// ============================================================
//
// Click a room to join the group chat, or click a person to open
// a private 1-on-1 conversation. Unread badges show where new
// messages are waiting.
// ============================================================

import { avatarGradient } from "../utils/avatarColor";
import { dmId } from "../utils/conversation";

function Badge({ count }) {
  if (!count) return null;
  return <span style={styles.badge}>{count > 9 ? "9+" : count}</span>;
}

export default function UserList({
  users,
  currentUsername,
  rooms,
  active,
  unread = {},
  dmPartners = [],
  onRoomChange,
  onOpenDm,
}) {
  const isActiveRoom = (room) => active?.type === "room" && active.room === room;
  const isActiveDm = (name) => active?.type === "dm" && active.withUser === name;
  const dmUnread = (name) => unread[dmId(currentUsername, name)] || 0;

  // People to show under "Direct Messages": everyone you've chatted with,
  // plus anyone online (minus yourself), de-duplicated.
  const dmPeople = [...new Set([...dmPartners, ...users.filter((u) => u !== currentUsername)])];

  const personRow = (name) => (
    <div
      key={name}
      onClick={() => onOpenDm?.(name)}
      style={{
        ...styles.userItem,
        background: isActiveDm(name) ? "var(--accent-soft)" : "transparent",
      }}
    >
      <div style={styles.avatarWrap}>
        <div style={{ ...styles.avatar, background: avatarGradient(name) }}>
          {name[0].toUpperCase()}
        </div>
        {users.includes(name) && <span style={styles.presenceDot} />}
      </div>
      <span style={styles.username}>{name}</span>
      <Badge count={dmUnread(name)} />
    </div>
  );

  return (
    <div style={styles.sidebar}>
      {/* Rooms */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>📁 Rooms</h3>
        {rooms.map((room) => (
          <div
            key={room}
            style={{
              ...styles.roomItem,
              background: isActiveRoom(room) ? "var(--accent-soft)" : "transparent",
              color: isActiveRoom(room) ? "#c7d2fe" : "var(--text-dim)",
              fontWeight: isActiveRoom(room) ? 700 : 500,
              borderLeft: isActiveRoom(room) ? "3px solid var(--accent-2)" : "3px solid transparent",
            }}
            onClick={() => onRoomChange(room)}
          >
            <span># {room}</span>
            <Badge count={unread[room] || 0} />
          </div>
        ))}
      </div>

      {/* Online count */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>🟢 Online — {users.length}</h3>
        {users.length === 0 ? (
          <p style={styles.empty}>No one here yet</p>
        ) : (
          users.map((username) => (
            <div key={username} style={styles.userItem}>
              <div style={styles.avatarWrap}>
                <div style={{ ...styles.avatar, background: avatarGradient(username) }}>
                  {username[0].toUpperCase()}
                </div>
                <span style={styles.presenceDot} />
              </div>
              <span style={styles.username}>
                {username}
                {username === currentUsername && <span style={styles.you}> (you)</span>}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Direct Messages — click anyone to chat privately */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>💬 Direct Messages</h3>
        {dmPeople.length === 0 ? (
          <p style={styles.empty}>Click a person to start a private chat</p>
        ) : (
          dmPeople.map(personRow)
        )}
      </div>
    </div>
  );
}

const styles = {
  sidebar: {
    width: 240,
    borderLeft: "1px solid var(--border)",
    background: "var(--surface)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
    flexShrink: 0,
  },
  section: {
    padding: "18px 16px",
    borderBottom: "1px solid var(--border)",
  },
  sectionTitle: {
    margin: "0 0 12px",
    fontSize: 11,
    fontWeight: 700,
    color: "var(--text-faint)",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  roomItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 13,
    marginBottom: 4,
    transition: "background 0.15s",
  },
  userItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "6px 8px",
    borderRadius: 8,
    cursor: "pointer",
    transition: "background 0.15s",
  },
  avatarWrap: { position: "relative", flexShrink: 0 },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: "50%",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 700,
  },
  presenceDot: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "var(--online)",
    border: "2px solid var(--bg-1)",
  },
  username: { fontSize: 13, color: "var(--text)", fontWeight: 500, flex: 1 },
  you: { fontSize: 11, color: "var(--text-faint)", fontWeight: 400 },
  empty: { fontSize: 12, color: "var(--text-faint)", margin: 0, lineHeight: 1.5 },
  badge: {
    minWidth: 18,
    height: 18,
    padding: "0 5px",
    borderRadius: 9,
    background: "var(--accent-grad)",
    color: "#fff",
    fontSize: 11,
    fontWeight: 700,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
};
