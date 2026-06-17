// ============================================================
// ChatRoom.jsx — Main Chat Screen
// ============================================================
//
// This is the layout component — it combines:
//   ┌─────────────────────────────┬──────────────┐
//   │ Header (room / DM name)     │              │
//   ├─────────────────────────────│  UserList    │
//   │ MessageList (scrollable)    │  (sidebar)   │
//   ├─────────────────────────────│              │
//   │ MessageInput                │              │
//   └─────────────────────────────┴──────────────┘
// ============================================================

import MessageList  from "./MessageList";
import MessageInput from "./MessageInput";
import UserList     from "./UserList";
import { avatarGradient } from "../utils/avatarColor";

export default function ChatRoom({ user, rooms, active, socketUtils, onRoomChange, onOpenDm }) {
  const {
    messages,
    onlineUsers,
    typingUsers,
    reactions,
    seenAt,
    unread,
    dmPartners,
    sendMessage,
    sendDm,
    startTyping,
    stopTyping,
    addReaction,
    markSeen,
    isConnected,
  } = socketUtils;

  const isDm = active?.type === "dm";
  const activeId = isDm ? active.conversationId : active.room;

  // Route a send to the right place depending on the active conversation
  const handleSend = (message) => {
    if (isDm) sendDm(active.withUser, message);
    else sendMessage(message, active.room);
  };

  return (
    <div style={styles.page}>
      {/* ── Main chat area ── */}
      <div style={styles.chatArea}>

        {/* Header */}
        <div style={styles.header}>
          <div style={styles.roomBlock}>
            {isDm ? (
              <>
                <div style={{ ...styles.headAvatar, background: avatarGradient(active.withUser) }}>
                  {active.withUser[0].toUpperCase()}
                </div>
                <span style={styles.roomName}>{active.withUser}</span>
                <span style={styles.dmTag}>🔒 private</span>
              </>
            ) : (
              <span style={styles.roomName}># {active.room}</span>
            )}
            <span style={styles.connectionBadge}>
              <span
                className={isConnected ? "live-dot" : ""}
                style={{
                  ...styles.statusDot,
                  background: isConnected ? "var(--online)" : "var(--offline)",
                }}
              />
              {isConnected ? "Live" : "Reconnecting…"}
            </span>
          </div>
          <div style={styles.userInfo}>
            <div style={{ ...styles.avatar, background: avatarGradient(user.username) }}>
              {user.username[0].toUpperCase()}
            </div>
            <span style={styles.username}>{user.username}</span>
          </div>
        </div>

        {/* Messages — grows to fill space */}
        <MessageList
          messages={messages}
          currentUsername={user.username}
          room={activeId}
          reactions={reactions}
          seenAt={seenAt}
          onReact={addReaction}
          onSeen={markSeen}
        />

        {/* Input at the bottom */}
        <MessageInput
          room={activeId}
          typingUsers={typingUsers}
          onSend={handleSend}
          onTyping={startTyping}
          onStopTyping={stopTyping}
        />
      </div>

      {/* ── Sidebar ── */}
      <UserList
        users={onlineUsers}
        currentUsername={user.username}
        rooms={rooms}
        active={active}
        unread={unread}
        dmPartners={dmPartners}
        onRoomChange={onRoomChange}
        onOpenDm={onOpenDm}
      />
    </div>
  );
}

const styles = {
  page: {
    display: "flex",
    height: "100vh",
    background: "linear-gradient(135deg, var(--bg-1), var(--bg-2))",
  },
  chatArea: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 22px",
    borderBottom: "1px solid var(--border)",
    background: "var(--surface)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
  },
  roomBlock: { display: "flex", alignItems: "center", gap: 10 },
  roomName: {
    fontSize: 19,
    fontWeight: 700,
    color: "var(--text)",
  },
  headAvatar: {
    width: 30,
    height: 30,
    borderRadius: "50%",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 700,
  },
  dmTag: {
    fontSize: 11,
    fontWeight: 600,
    color: "var(--text-dim)",
    background: "var(--surface-strong)",
    border: "1px solid var(--border)",
    padding: "3px 8px",
    borderRadius: 20,
  },
  connectionBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-dim)",
    background: "var(--surface-strong)",
    border: "1px solid var(--border)",
    padding: "4px 10px",
    borderRadius: 20,
  },
  statusDot: { width: 8, height: 8, borderRadius: "50%", display: "inline-block" },
  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: "50%",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    fontWeight: 700,
  },
  username: { fontSize: 14, fontWeight: 600, color: "var(--text)" },
};
