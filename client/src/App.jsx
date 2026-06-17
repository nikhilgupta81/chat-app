// ============================================================
// App.jsx — Root Component
// ============================================================
//
// Manages which SCREEN to show and which CONVERSATION is active.
// A conversation is either:
//   - a group room   ({ type: "room", room })
//   - a direct chat  ({ type: "dm", withUser, conversationId })
//
// The socket hook is created at the top level so every child
// shares the same connection.
// ============================================================

import { useState } from "react";
import { useSocket } from "./hooks/useSocket";
import { dmId } from "./utils/conversation";
import Login from "./pages/Login";
import ChatRoom from "./components/ChatRoom";

const ROOMS = ["General", "Tech Talk", "Random"]; // Available group rooms

export default function App() {
  const [user, setUser] = useState(null);     // { username, room }
  const [active, setActive] = useState(null);  // active conversation

  const socketUtils = useSocket();

  // Login → join the first room
  const handleJoin = (username, room) => {
    socketUtils.joinRoom(username, room);
    setUser({ username, room });
    setActive({ type: "room", room });
  };

  // Switch to a group room
  const handleRoomChange = (room) => {
    socketUtils.joinRoom(user.username, room);
    setUser({ ...user, room });
    setActive({ type: "room", room });
  };

  // Open a 1-on-1 direct conversation
  const handleOpenDm = (withUser) => {
    if (withUser === user.username) return;
    socketUtils.openDm(withUser);
    setActive({ type: "dm", withUser, conversationId: dmId(user.username, withUser) });
  };

  if (!user) {
    return (
      <Login
        rooms={ROOMS}
        isConnected={socketUtils.isConnected}
        onJoin={handleJoin}
      />
    );
  }

  return (
    <ChatRoom
      user={user}
      rooms={ROOMS}
      active={active}
      socketUtils={socketUtils}
      onRoomChange={handleRoomChange}
      onOpenDm={handleOpenDm}
    />
  );
}
