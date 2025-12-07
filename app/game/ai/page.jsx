// app/game/ai/page.jsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Script from "next/script";

export default function GameAIPage() {
  const [status, setStatus] = useState("Trắng đi trước");
  const [history, setHistory] = useState([]);
  const [difficulty, setDifficulty] = useState(5);
  const [aiThinking, setAiThinking] = useState(false);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);

  const stockfishRef = useRef(null);
  const gameRef = useRef(null);
  const boardRef = useRef(null);

  // =====================
  // Cập nhật trạng thái
  // =====================
  const updateStatus = useCallback(() => {
    const currentGame = gameRef.current;
    if (!currentGame) return;

    const turn = currentGame.turn() === "b" ? "Đen" : "Trắng";

    if (currentGame.in_checkmate()) {
      setStatus(`🎉 Chiếu hết! ${turn} thua!`);
    } else if (currentGame.in_draw()) {
      setStatus("½–½ Hòa!");
    } else {
      let s = `${turn} đến lượt`;
      if (currentGame.in_check()) s += " - Chiếu tướng!";
      setStatus(s);
    }
  }, []);

  // =====================
  // Cập nhật lịch sử
  // =====================
  const updateHistory = useCallback(() => {
    const currentGame = gameRef.current;
    if (!currentGame) return;
    const h = currentGame.history({ verbose: true });
    setHistory(h);
  }, []);

  // =====================
  // Thực hiện nước đi AI
  // =====================
  const makeAIMove = useCallback(
    (moveString) => {
      const currentGame = gameRef.current;
      const currentBoard = boardRef.current;
      if (!currentGame || !currentBoard) return;

      const from = moveString.substring(0, 2);
      const to = moveString.substring(2, 4);
      const promotion =
        moveString.length > 4 ? moveString.substring(4, 5) : undefined;

      try {
        const move = currentGame.move({ from, to, promotion });
        if (move) {
          currentBoard.position(currentGame.fen());
          updateStatus();
          updateHistory();
          setAiThinking(false);
        }
      } catch (error) {
        console.error("AI move error:", error);
        setAiThinking(false);
      }
    },
    [updateStatus, updateHistory]
  );

  // =====================
  // Fallback AI random
  // =====================
  const useRandomAI = useCallback(() => {
    stockfishRef.current = {
      postMessage: () => {
        setTimeout(() => {
          const currentGame = gameRef.current;
          if (!currentGame) return;
          const moves = currentGame.moves({ verbose: true });
          if (moves.length > 0) {
            const randomMove =
              moves[Math.floor(Math.random() * moves.length)];
            makeAIMove(randomMove.from + randomMove.to);
          }
        }, 500);
      },
      terminate: () => {},
    };
  }, [makeAIMove]);

  // =====================
  // Khởi tạo Stockfish
  // =====================
  const initStockfish = useCallback(() => {
    if (typeof window === "undefined") {
      useRandomAI();
      return;
    }

    try {
      if (typeof Worker === "undefined") {
        console.warn("Worker không hỗ trợ, dùng random AI");
        useRandomAI();
        return;
      }

      const workerCode = `
        importScripts('https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js');
      `;
      const blob = new Blob([workerCode], { type: "application/javascript" });
      const workerUrl = URL.createObjectURL(blob);
      const sf = new Worker(workerUrl);

      sf.onmessage = (event) => {
        const msg = event.data;
        if (typeof msg === "string" && msg.startsWith("bestmove")) {
          const move = msg.split(" ")[1];
          makeAIMove(move);
        }
      };

      sf.onerror = (err) => {
        console.warn("Stockfish failed, using random AI", err);
        try {
          sf.terminate();
        } catch {}
        useRandomAI();
      };

      sf.postMessage("uci");
      sf.postMessage("isready");
      stockfishRef.current = sf;
    } catch (error) {
      console.warn("Stockfish init failed, using random AI", error);
      useRandomAI();
    }
  }, [makeAIMove, useRandomAI]);

  // =====================
  // Gọi AI suy nghĩ
  // =====================
  const getAIMove = useCallback(() => {
    const currentGame = gameRef.current;
    if (!currentGame || currentGame.game_over() || !stockfishRef.current) return;

    setAiThinking(true);
    stockfishRef.current.postMessage("position fen " + currentGame.fen());
    stockfishRef.current.postMessage("go depth " + difficulty);
  }, [difficulty]);

  // =====================
  // Khởi tạo game sau khi script load
  // =====================
  useEffect(() => {
    if (!scriptsLoaded) return;
    if (typeof window === "undefined") return;
    if (!window.Chess || !window.Chessboard) return;

    const newGame = new window.Chess();
    gameRef.current = newGame;

    const config = {
      draggable: true,
      position: "start",
      onDragStart: (source, piece) => {
        if (newGame.game_over()) return false;
        if (piece.search(/^b/) !== -1) return false;
        if (newGame.turn() !== "w") return false;
        return true;
      },
      onDrop: (source, target) => {
        const move = newGame.move({
          from: source,
          to: target,
          promotion: "q",
        });
        if (!move) return "snapback";

        gameRef.current = newGame;
        updateStatus();
        updateHistory();
        setTimeout(() => getAIMove(), 250);
      },
      pieceTheme: "/img/chesspieces/wikipedia/{piece}.png",
    };

    const newBoard = window.Chessboard("myBoard", config);
    boardRef.current = newBoard;

    initStockfish();

    return () => {
      if (stockfishRef.current?.terminate) {
        stockfishRef.current.terminate();
      }
      stockfishRef.current = null;

      if (boardRef.current && typeof boardRef.current.destroy === "function") {
        try {
          boardRef.current.destroy();
        } catch (e) {
          console.warn("Destroy board error:", e);
        }
      }
      boardRef.current = null;
      gameRef.current = null;
    };
  }, [scriptsLoaded, initStockfish, getAIMove, updateStatus, updateHistory]);

  // =====================
  // CHẶN SCROLL KHI KÉO QUÂN TRÊN MOBILE
  // =====================
  useEffect(() => {
    if (!scriptsLoaded) return;
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
  }, [scriptsLoaded]);

  // =====================
  // Ván mới
  // =====================
  const handleNewGame = () => {
    const currentGame = gameRef.current;
    const currentBoard = boardRef.current;
    if (!currentGame || !currentBoard) return;

    currentGame.reset();
    currentBoard.start();
    setStatus("Trắng đi trước");
    setHistory([]);
    setAiThinking(false);
  };

  // =====================
  // Hoàn tác 2 nước
  // =====================
  const handleUndoMove = () => {
    const currentGame = gameRef.current;
    const currentBoard = boardRef.current;
    if (!currentGame || !currentBoard) return;

    currentGame.undo();
    currentGame.undo();
    currentBoard.position(currentGame.fen());
    updateStatus();
    updateHistory();
    setAiThinking(false);
  };

  return (
    <>
      {/* CSS chessboard */}
      <link rel="stylesheet" href="/lib/chessboard-1.0.0.min.css" />

      {/* jQuery & chess.js phải load TRƯỚC */}
      <Script src="/lib/jquery-3.7.0.min.js" strategy="beforeInteractive" />
      <Script
        src="/lib/chess-0.10.3.min.js"
        strategy="beforeInteractive"
        onLoad={() => console.log("✅ chess.js loaded")}
      />

      {/* chessboard.js load SAU, khi load xong thì bật scriptsLoaded */}
      <Script
        src="/lib/chessboard-1.0.0.min.js"
        strategy="afterInteractive"
        onLoad={() => {
          console.log("✅ chessboard.js loaded");
          setScriptsLoaded(true);
        }}
        onError={(e) => {
          console.error("❌ Failed to load chessboard.js", e);
        }}
      />

      <div className="min-h-screen p-4 bg-slate-950 text-slate-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold mb-1">♟ Chess vs AI</h1>
            <p className="text-gray-400">
              Chơi cờ vua với Stockfish (hoặc AI ngẫu nhiên nếu lỗi)
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-gray-900 rounded-lg p-6 shadow-xl">
                <div
                  id="myBoard"
                  className="touch-none select-none"
                  style={{
                    width: "100%",
                    maxWidth: "600px",
                    margin: "0 auto",
                    aspectRatio: "1",
                  }}
                >
                  {!scriptsLoaded && (
                    <div className="flex items-center justify-center h-full text-yellow-400">
                      ⏳ Đang tải bàn cờ...
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-6 space-y-4 shadow-xl">
              <div className="text-xl font-semibold text-blue-400">
                {status}
              </div>

              <div>
                <label className="block text-gray-400 mb-1 text-sm">
                  Độ khó:
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(Number(e.target.value))}
                  className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
                >
                  <option value={1}>Dễ (Depth 1)</option>
                  <option value={3}>Trung bình (Depth 3)</option>
                  <option value={5}>Khó (Depth 5)</option>
                  <option value={8}>Rất khó (Depth 8)</option>
                  <option value={10}>Chuyên nghiệp (Depth 10)</option>
                </select>
              </div>

              {aiThinking && (
                <div className="text-green-400 italic">
                  🤖 AI đang suy nghĩ...
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleNewGame}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors"
                >
                  🔄 Ván mới
                </button>
                <button
                  onClick={handleUndoMove}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors"
                >
                  ↶ Hoàn tác
                </button>
              </div>

              <Link
                href="/"
                className="block text-center bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition-colors"
              >
                🏠 Về trang chủ
              </Link>

              <div>
                <h3 className="text-gray-400 font-medium mb-2">
                  Lịch sử nước đi:
                </h3>
                <div className="bg-gray-800 rounded-lg p-3 max-h-48 overflow-y-auto font-mono text-sm">
                  {history.length === 0 ? (
                    <span className="text-gray-500">
                      Chưa có nước đi nào
                    </span>
                  ) : (
                    history.map((move, i) => (
                      <span key={i}>
                        {i % 2 === 0 && (
                          <span className="text-gray-400">
                            {Math.floor(i / 2) + 1}.{" "}
                          </span>
                        )}
                        {move.san}{" "}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
