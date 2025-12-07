// app/game/[color]/page.jsx
"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  Suspense,
} from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";

// ==========================
// Wrapper để bọc Suspense (useSearchParams)
// ==========================
export default function GameOnlinePageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-black text-yellow-400">
          Đang tải bàn cờ...
        </div>
      }
    >
      <GameOnlinePage />
    </Suspense>
  );
}

// ==========================
// Component chính
// ==========================
function GameOnlinePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const {
    socket,
    isConnected,
    createRoom,
    joinRoom,
    sendMove,
    leaveRoom,
    resetGameState,
  } = useSocket();

  const playerColor = params?.color || "white";
  const roomCode = searchParams?.get("code");

  // Game state
  const [status, setStatus] = useState("⏳ Đang kết nối...");
  const [pgn, setPgn] = useState("");
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [copied, setCopied] = useState(false);
  const [opponentName, setOpponentName] = useState("Đối thủ");
  const [showDrawOffer, setShowDrawOffer] = useState(false);
  const [drawOfferFrom, setDrawOfferFrom] = useState(null);

  // Track scripts loaded
  const [scriptsReady, setScriptsReady] = useState(false);
  const [boardReady, setBoardReady] = useState(false);

  // Refs
  const gameRef = useRef(null);
  const boardRef = useRef(null);
  const roomJoined = useRef(false);

  // ==========================
  // Kiểm tra script đã load sẵn chưa
  // ==========================
  useEffect(() => {
    const checkScripts = () => {
      if (
        typeof window !== "undefined" &&
        window.Chess &&
        window.Chessboard &&
        window.jQuery
      ) {
        console.log("✅ Scripts already loaded from cache");
        setScriptsReady(true);
        return true;
      }
      return false;
    };

    if (checkScripts()) return;

    const timer = setTimeout(checkScripts, 500);
    return () => clearTimeout(timer);
  }, []);

  // ==========================
  // Cleanup khi unmount
  // ==========================
  useEffect(() => {
    return () => {
      console.log("🧹 [GamePage] Cleanup on unmount");

      if (boardRef.current) {
        try {
          if (typeof boardRef.current.destroy === "function") {
            boardRef.current.destroy();
          }
        } catch (e) {
          console.warn("Board destroy error:", e);
        }
        boardRef.current = null;
      }
      gameRef.current = null;
      roomJoined.current = false;

      if (resetGameState) {
        resetGameState();
      }
    };
  }, [resetGameState]);

  // ==========================
  // Nếu không có room code
  // ==========================
  if (!roomCode) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card p-8 text-center">
          <h1 className="text-red-400 text-2xl mb-4">
            ❌ Lỗi: Không có mã phòng
          </h1>
          <p className="text-gray-300 mb-6">Vui lòng quay lại chọn phòng</p>
          <Link href="/room" className="btn-primary px-6 py-2 rounded-lg">
            ← Quay lại
          </Link>
        </div>
      </div>
    );
  }

  // ==========================
  // Join / create room (chỉ chạy 1 lần)
  // ==========================
  useEffect(() => {
    if (!socket || !isConnected) {
      console.log("⏳ Waiting for socket...");
      return;
    }

    if (roomJoined.current) {
      console.log("⚠️ Room already joined");
      return;
    }

    console.log(`🔌 Joining game: ${playerColor} in ${roomCode}`);
    roomJoined.current = true;

    if (playerColor === "white") {
      createRoom(roomCode, user?.username || "Guest", user?.id || null);
    } else {
      joinRoom(roomCode, user?.username || "Guest", user?.id || null);
    }
  }, [
    socket,
    isConnected,
    playerColor,
    roomCode,
    user?.username,
    user?.id,
    createRoom,
    joinRoom,
  ]);

  // ==========================
  // Update game status
  // ==========================
  const updateGameStatus = useCallback(() => {
    const g = gameRef.current;
    if (!g) return;

    const turn = g.turn() === "b" ? "Đen" : "Trắng";
    const isMyTurn =
      (g.turn() === "w" && playerColor === "white") ||
      (g.turn() === "b" && playerColor === "black");

    let s = `${isMyTurn ? "🔄" : "⏱️"} ${turn}${
      isMyTurn ? " (Bạn)" : ""
    } đến lượt`;

    if (g.in_checkmate()) {
      const winner = g.turn() === "w" ? "black" : "white";
      s = `🎉 Chiếu hết! ${g.turn() === "w" ? "Trắng" : "Đen"} thua!`;
      setGameOver(true);
      socket?.emit("checkmate", { winner, pgn: g.pgn(), fen: g.fen() });
    } else if (g.in_stalemate()) {
      s = "½-½ Hòa - Bí quân";
      setGameOver(true);
      socket?.emit("stalemate", { pgn: g.pgn(), fen: g.fen() });
    } else if (g.in_threefold_repetition()) {
      s = "½-½ Hòa - Lặp 3 lần";
      setGameOver(true);
      socket?.emit("drawByRepetition", { pgn: g.pgn(), fen: g.fen() });
    } else if (g.insufficient_material()) {
      s = "½-½ Hòa - Không đủ quân";
      setGameOver(true);
      socket?.emit("drawByMaterial", { pgn: g.pgn(), fen: g.fen() });
    } else if (g.in_draw()) {
      s = "½-½ Hòa";
      setGameOver(true);
      socket?.emit("drawGeneric", { pgn: g.pgn(), fen: g.fen() });
    } else if (g.in_check()) {
      s += " ⚠️ Chiếu!";
    }

    setStatus(s);
    setPgn(g.pgn() || "");

    if (socket && g.pgn() && !gameOver) {
      socket.emit("updatePgn", g.pgn());
    }
  }, [socket, playerColor, gameOver]);

  // ==========================
  // Socket listeners
  // ==========================
  useEffect(() => {
    if (!socket) return;

    console.log("📡 Setting up socket listeners");

    const handlers = {
      roomCreated: ({ code }) => {
        console.log("✅ Room created:", code);
        setStatus("⏳ Chờ đối thủ tham gia...");
      },

      startGame: ({ white, black }) => {
        console.log("🎮 Game started:", white, "vs", black);
        setGameStarted(true);
        setOpponentName(playerColor === "white" ? black : white);
        setStatus(
          playerColor === "white"
            ? "🔄 Trắng đến lượt (Bạn)"
            : "⏱️ Trắng đến lượt"
        );
      },

      newMove: (move) => {
        console.log("📥 Move received:", move);
        if (!gameRef.current || !boardRef.current) {
          console.warn("⚠️ Game or board not ready");
          return;
        }
        const result = gameRef.current.move(move, { sloppy: true });
        if (result) {
          boardRef.current.position(gameRef.current.fen());
          updateGameStatus();
        }
      },

      gameEnded: ({ reason }) => {
        console.log("🏆 Game ended:", reason);
        setGameOver(true);
        setStatus(`✓ ${reason}`);
      },

      gameOverDisconnect: ({ reason }) => {
        console.log("🔌 Opponent disconnected:", reason);
        setGameOver(true);
        setStatus(`✅ ${reason}`);
      },

      drawOffered: ({ from }) => {
        console.log("📨 Draw offer from:", from);
        setDrawOfferFrom(from);
        setShowDrawOffer(true);
      },

      drawAccepted: () => {
        console.log("✅ Draw accepted");
        setShowDrawOffer(false);
        setGameOver(true);
        setStatus("½-½ Hòa - Cả 2 đồng ý");
      },

      drawDeclined: () => {
        console.log("❌ Draw declined");
        setShowDrawOffer(false);
        if (typeof window !== "undefined") {
          window.alert("Đối thủ từ chối đề nghị hòa");
        }
      },

      error: (msg) => {
        console.error("❌ Socket error:", msg);
        setStatus(`❌ ${msg}`);
      },
    };

    Object.entries(handlers).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    return () => {
      console.log("🔇 Removing socket listeners");
      Object.entries(handlers).forEach(([event, handler]) => {
        socket.off(event, handler);
      });
    };
  }, [socket, playerColor, updateGameStatus]);

  // ==========================
  // Khởi tạo bàn cờ
  // ==========================
  useEffect(() => {
    if (!scriptsReady) {
      console.log("⏳ Waiting for scripts...");
      return;
    }

    if (typeof window === "undefined" || !window.Chess || !window.Chessboard) {
      console.warn("⚠️ Chess libraries not available");
      return;
    }

    const container = document.getElementById("myBoard");
    if (!container) {
      console.warn("⚠️ Board container not found, waiting...");
      const timer = setTimeout(() => setBoardReady((prev) => !prev), 100);
      return () => clearTimeout(timer);
    }

    if (boardRef.current) {
      console.log("🔄 Destroying existing board");
      try {
        boardRef.current.destroy();
      } catch {}
      boardRef.current = null;
    }

    container.innerHTML = "";

    console.log("♟️ Creating new chessboard...");

    try {
      const newGame = new window.Chess();
      gameRef.current = newGame;

      const boardConfig = {
        draggable: true,
        position: "start",
        pieceTheme: "/img/chesspieces/wikipedia/{piece}.png",
        showNotation: false,

        onDragStart: (source, piece) => {
          if (!gameStarted || gameOver || newGame.game_over()) return false;

          const myTurn =
            (newGame.turn() === "w" && playerColor === "white") ||
            (newGame.turn() === "b" && playerColor === "black");
          if (!myTurn) return false;

          const isMyPiece =
            (playerColor === "white" && piece.startsWith("w")) ||
            (playerColor === "black" && piece.startsWith("b"));
          return isMyPiece;
        },

        onDrop: (source, target) => {
          const move = newGame.move({
            from: source,
            to: target,
            promotion: "q",
          });
          if (!move) return "snapback";

          sendMove({ from: source, to: target, promotion: "q" });
          updateGameStatus();
          return undefined;
        },

        onSnapEnd: () => {
          if (boardRef.current && gameRef.current) {
            boardRef.current.position(gameRef.current.fen());
          }
        },
      };

      const newBoard = window.Chessboard("myBoard", boardConfig);
      boardRef.current = newBoard;

      if (playerColor === "black") {
        newBoard.flip();
      }

      console.log("✅ Chessboard created successfully");
    } catch (error) {
      console.error("❌ Chessboard init error:", error);
    }
  }, [
    scriptsReady,
    boardReady,
    playerColor,
    gameStarted,
    gameOver,
    sendMove,
    updateGameStatus,
  ]);

  // ==========================
  // CHẶN SCROLL KHI KÉO QUÂN TRÊN MOBILE
  // ==========================
  useEffect(() => {
    if (!scriptsReady) return;
    if (typeof window === "undefined") return;

    const el = document.getElementById("myBoard");
    if (!el) return;

    const preventScroll = (e) => {
      e.preventDefault();
    };

    el.addEventListener("touchmove", preventScroll, { passive: false });

    return () => {
      el.removeEventListener("touchmove", preventScroll);
    };
  }, [scriptsReady]);

  // ==========================
  // Script loaded callback
  // ==========================
  const handleScriptsLoaded = useCallback(() => {
    console.log("✅ All scripts loaded via Script component");
    setScriptsReady(true);
  }, []);

  // ==========================
  // Actions
  // ==========================
  const handleResign = () => {
    if (typeof window !== "undefined") {
      const ok = window.confirm("Bạn có chắc muốn xin thua?");
      if (!ok) return;
    } else {
      return;
    }

    socket?.emit("resign", {
      pgn: gameRef.current?.pgn() || "",
      fen: gameRef.current?.fen() || "",
    });
    setGameOver(true);
    setStatus("🏳️ Bạn đã xin thua");
  };

  const handleOfferDraw = () => {
    if (typeof window !== "undefined") {
      const ok = window.confirm("Bạn muốn đề nghị hòa?");
      if (!ok) return;
    } else {
      return;
    }

    socket?.emit("offerDraw");
    if (typeof window !== "undefined") {
      window.alert("Đã gửi đề nghị hòa...");
    }
  };

  const handleDrawResponse = (accept) => {
    socket?.emit(accept ? "acceptDraw" : "declineDraw");
    setShowDrawOffer(false);
  };

  const handleLeaveRoom = () => {
    if (leaveRoom) leaveRoom();
    router.push("/room");
  };

  const handleNewGame = () => {
    if (leaveRoom) leaveRoom();
    router.push("/room");
  };

  // ==========================
  // JSX
  // ==========================
  return (
    <>
      <link rel="stylesheet" href="/lib/chessboard-1.0.0.min.css" />

      {/* Load scripts lần đầu */}
      {!scriptsReady && (
        <Script
          src="/lib/jquery-3.7.0.min.js"
          strategy="afterInteractive"
          onLoad={() => {
            console.log("✅ jQuery loaded");
            const loadChess = document.createElement("script");
            loadChess.src = "/lib/chess-0.10.3.min.js";
            loadChess.onload = () => {
              console.log("✅ Chess.js loaded");
              const loadBoard = document.createElement("script");
              loadBoard.src = "/lib/chessboard-1.0.0.min.js";
              loadBoard.onload = handleScriptsLoaded;
              loadBoard.onerror = () =>
                console.error("❌ Failed to load chessboard.js");
              document.body.appendChild(loadBoard);
            };
            loadChess.onerror = () =>
              console.error("❌ Failed to load chess.js");
            document.body.appendChild(loadChess);
          }}
          onError={() => console.error("❌ Failed to load jQuery")}
        />
      )}

      {/* Draw Offer Modal */}
      {showDrawOffer && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-slate-800 p-6 rounded-xl border-2 border-yellow-500 shadow-2xl max-w-sm mx-4">
            <h3 className="text-xl font-bold text-yellow-400 mb-4 text-center">
              🤝 Đề nghị hòa
            </h3>
            <p className="text-gray-200 text-center mb-6">
              {drawOfferFrom === "white" ? "Quân Trắng" : "Quân Đen"} đề nghị
              hòa.
              <br />
              Bạn có đồng ý?
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => handleDrawResponse(true)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold"
              >
                ✅ Đồng ý
              </button>
              <button
                onClick={() => handleDrawResponse(false)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold"
              >
                ❌ Từ chối
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        className="min-h-screen p-4"
        style={{
          backgroundImage: "url(/img/chesspieces/wikipedia/back-ground.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="fixed inset-0 bg-black/55 -z-10" />

        <div className="max-w-6xl mx-auto relative z-10">
          <h1 className="chess-title text-3xl text-center mb-6">
            ⚔ Chess Battlefield ⚔
          </h1>

          {!user?.id && (
            <div className="bg-yellow-900/80 border border-yellow-500 text-yellow-200 p-3 rounded-lg mb-4 text-center">
              ⚠️ Bạn chưa đăng nhập. Kết quả sẽ không được lưu.
            </div>
          )}

          {/* Debug nhỏ */}
          <div className="text-xs text-gray-500 text-center mb-2">
            Scripts: {scriptsReady ? "✅" : "⏳"} | Socket:{" "}
            {isConnected ? "✅" : "❌"} | Room: {roomCode}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Board */}
            <div className="lg:col-span-2">
              <div className="p-5 border-[10px] border-amber-900 rounded-xl shadow-[0_0_25px_rgba(255,165,0,0.7)] bg-black/75 backdrop-blur">
                <div
                  id="myBoard"
                  className="touch-none select-none"
                  style={{
                    width: "100%",
                    maxWidth: "700px",
                    margin: "0 auto",
                    aspectRatio: "1",
                  }}
                >
                  {!scriptsReady && (
                    <div className="flex items-center justify-center h-full text-yellow-400">
                      ⏳ Đang tải bàn cờ...
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Panel */}
            <div className="card p-6 space-y-4 h-fit lg:sticky lg:top-4">
              <h2 className="font-semibold text-lg text-gray-200">
                Thông tin ván đấu
              </h2>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-yellow-400 font-semibold text-sm">
                  Mã:
                </span>
                <button
                  onClick={() => {
                    if (
                      typeof navigator !== "undefined" &&
                      navigator.clipboard
                    ) {
                      navigator.clipboard.writeText(roomCode);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }
                  }}
                  className="px-3 py-1 bg-amber-900/80 border border-yellow-500/80 rounded-full text-yellow-200 font-bold text-sm"
                >
                  {roomCode} {copied ? "✓" : ""}
                </button>
              </div>

              <div className="text-sm space-y-1 bg-slate-800/50 p-3 rounded border border-slate-700">
                <div>
                  <span className="text-gray-400">Bạn:</span>{" "}
                  <span className="text-yellow-400 font-semibold">
                    {user?.username || "Guest"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Đối thủ:</span>{" "}
                  <span className="text-yellow-400 font-semibold">
                    {opponentName}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Màu:</span>{" "}
                  <span className="text-yellow-400 font-semibold">
                    {playerColor === "white" ? "Trắng ♔" : "Đen ♚"}
                  </span>
                </div>
              </div>

              <div className="bg-blue-900/50 p-3 rounded border border-blue-700">
                <div className="text-yellow-400 font-semibold text-xs mb-1">
                  TRẠNG THÁI:
                </div>
                <div className="text-gray-100 text-lg font-bold">{status}</div>
              </div>

              <div>
                <div className="text-yellow-400 font-semibold text-xs mb-1">
                  LỊCH SỬ:
                </div>
                <div className="bg-slate-900 rounded p-2 text-sm text-gray-200 h-24 overflow-y-auto font-mono border border-gray-600">
                  {pgn || "Chưa có nước đi"}
                </div>
              </div>

              {gameStarted && !gameOver && (
                <div className="space-y-2">
                  <button
                    onClick={handleOfferDraw}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold"
                  >
                    🤝 Đề nghị hòa
                  </button>
                  <button
                    onClick={handleResign}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 rounded-lg font-semibold"
                  >
                    🏳️ Xin thua
                  </button>
                </div>
              )}

              {gameOver && (
                <button
                  onClick={handleNewGame}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-semibold"
                >
                  ✓ Ván mới
                </button>
              )}

              <button
                onClick={handleLeaveRoom}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-semibold"
              >
                🚪 Rời phòng
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
