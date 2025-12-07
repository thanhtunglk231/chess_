// context/SocketContext.jsx - FIXED VERSION v2
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(undefined);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomCode, setRoomCode] = useState(null);
  const [playerColor, setPlayerColor] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [opponent, setOpponent] = useState(null);

  const socketRef = useRef(null);

  useEffect(() => {
    if (socketRef.current) {
      console.log("⚠️ Socket already exists, reusing");
      setSocket(socketRef.current);
      return;
    }

    console.log("🔌 [SocketContext] Creating socket instance...");

    const s = io(
      process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001",
      {
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        transports: ["websocket", "polling"],
      }
    );

    socketRef.current = s;
    setSocket(s);

    s.on("connect", () => {
      console.log("✅ [SocketContext] Connected:", s.id);
      setIsConnected(true);
    });

    s.on("disconnect", () => {
      console.log("❌ [SocketContext] Disconnected");
      setIsConnected(false);
    });

    s.on("connect_error", (error) => {
      console.error("⚠️ [SocketContext] Connection error:", error);
    });

    s.on("startGame", ({ white, black }) => {
      console.log("🎮 [SocketContext] Game started!", white, "vs", black);
      setGameStarted(true);
    });

    s.on("gameOverDisconnect", ({ winner, reason }) => {
      console.log("🏆 [SocketContext] Game over:", reason);
      setGameOver(true);
    });

    s.on("gameEnded", ({ result, winner, reason }) => {
      console.log("🏁 [SocketContext] Game ended:", reason);
      setGameOver(true);
    });

    s.on("opponentJoined", ({ username }) => {
      console.log("👤 [SocketContext] Opponent joined:", username);
      setOpponent(username);
    });

    s.on("error", (msg) => {
      console.error("❌ [SocketContext] Socket error:", msg);
    });

    return () => {
      console.log("🔌 [SocketContext] Cleaning up socket");
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  const createRoom = useCallback(
    (code, username, userId) => {
      if (!socket || !isConnected) {
        console.warn("⚠️ Socket not ready for createRoom");
        return;
      }
      console.log(`📤 [SocketContext] createRoom: ${code}, ${username}`);
      socket.emit("createGame", { code, username, userId });
      setRoomCode(code);
      setPlayerColor("white");
      setGameStarted(false);
      setGameOver(false);
    },
    [socket, isConnected]
  );

  const joinRoom = useCallback(
    (code, username, userId) => {
      if (!socket || !isConnected) {
        console.warn("⚠️ Socket not ready for joinRoom");
        return;
      }
      console.log(`📤 [SocketContext] joinRoom: ${code}, ${username}`);
      socket.emit("joinGame", { code, username, userId });
      setRoomCode(code);
      setPlayerColor("black");
    },
    [socket, isConnected]
  );

  const sendMove = useCallback(
    (move) => {
      if (!socket || !isConnected) {
        console.warn("⚠️ Socket not ready for sendMove");
        return;
      }
      socket.emit("move", move);
    },
    [socket, isConnected]
  );

  // 🔴 FIX: leaveRoom phải emit event để server biết và reset state
  const leaveRoom = useCallback(() => {
    console.log("🚪 [SocketContext] Leaving room:", roomCode);

    // Emit event để server cleanup
    if (socket && roomCode) {
      socket.emit("leaveRoom", { code: roomCode });
    }

    // Reset tất cả state
    setRoomCode(null);
    setPlayerColor(null);
    setGameStarted(false);
    setGameOver(false);
    setOpponent(null);
  }, [socket, roomCode]);

  // 🔴 FIX: Thêm function reset game state (không disconnect socket)
  const resetGameState = useCallback(() => {
    console.log("🔄 [SocketContext] Resetting game state");
    setRoomCode(null);
    setPlayerColor(null);
    setGameStarted(false);
    setGameOver(false);
    setOpponent(null);
  }, []);

  const onNewMove = useCallback(
    (callback) => {
      if (!socket) {
        console.warn("⚠️ Socket not ready for onNewMove");
        return () => {};
      }
      socket.on("newMove", callback);
      return () => {
        socket.off("newMove", callback);
      };
    },
    [socket]
  );

  const offerDraw = useCallback(() => {
    if (!socket || !isConnected) return;
    console.log("🤝 [SocketContext] Offering draw");
    socket.emit("offerDraw");
  }, [socket, isConnected]);

  const acceptDraw = useCallback(() => {
    if (!socket || !isConnected) return;
    console.log("✅ [SocketContext] Accepting draw");
    socket.emit("acceptDraw");
  }, [socket, isConnected]);

  const declineDraw = useCallback(() => {
    if (!socket || !isConnected) return;
    console.log("❌ [SocketContext] Declining draw");
    socket.emit("declineDraw");
  }, [socket, isConnected]);

  const resign = useCallback(
    (pgn = "", fen = "") => {
      if (!socket || !isConnected) return;
      console.log("🏳️ [SocketContext] Resigning with PGN");
      socket.emit("resign", { pgn, fen });
    },
    [socket, isConnected]
  );

  const value = {
    socket,
    isConnected,
    roomCode,
    playerColor,
    gameStarted,
    gameOver,
    opponent,
    createRoom,
    joinRoom,
    sendMove,
    leaveRoom,
    resetGameState, // 🔴 FIX: Export new function
    onNewMove,
    offerDraw,
    acceptDraw,
    declineDraw,
    resign,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
}
