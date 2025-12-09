// server/index.js
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import mongoose from "mongoose";

import Room from "./models/Room.js";
import User from "./models/User.js";
import Game from "./models/Game.js";
import PlayerStats from "./models/PlayerStats.js";
import EloHistory from "./models/EloHistory.js";
import MatchHistory from "./models/MatchHistory.js";
import WinRateByColor from "./models/WinRateByColor.js";

dotenv.config(); // Render vẫn dùng biến môi trường từ dashboard, không sao

const PORT = process.env.PORT || process.env.SOCKET_PORT || 3001;
const CORS_ORIGIN = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is missing. Check Render Environment tab.");
}

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));


const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// rooms được giữ trong RAM cho socket
const rooms = new Map();

// console.log(`
// ╔════════════════════════════════════════╗
// ║    🚀 Enhanced Chess Server           ║
// ║ Port: ${PORT}                         ║
// ╚════════════════════════════════════════╝
// `);

// ============================================
// HELPER FUNCTIONS
// ============================================
function calculateEloChange(playerElo, opponentElo, result) {
  const K = 32;
  const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
  let actualScore;
  if (result === "win") actualScore = 1;
  else if (result === "draw") actualScore = 0.5;
  else actualScore = 0;
  return Math.round(K * (actualScore - expectedScore));
}

function isValidObjectId(id) {
  if (!id) return false;
  if (typeof id !== "string") return false;
  return mongoose.Types.ObjectId.isValid(id);
}

// Xoá phòng khỏi RAM + DB (dùng cho mọi case muốn HUỶ phòng)
async function deleteRoomEverywhere(code, reason = "") {
  rooms.delete(code);
  try {
    const result = await Room.deleteOne({ code });
    // console.log(
    //   `🗑 Room ${code} deleted from DB ${
    //     reason ? `(${reason})` : ""
    //   } (deletedCount=${result.deletedCount})`
    // );
  } catch (err) {
    console.error("❌ Error delete room from DB:", err);
  }
}

async function saveGameResult(
  room,
  result,
  endReason,
  pgn = "",
  finalFen = ""
) {
  try {
    const { white, black, code, startTime } = room;

    if (!white?.userId || !black?.userId) {
      console.warn("⚠️ Cannot save game: missing player userId");
      return null;
    }

    if (!isValidObjectId(white.userId) || !isValidObjectId(black.userId)) {
      console.warn("⚠️ Cannot save game: invalid userId (guest players)");
      return null;
    }

    const whiteUser = await User.findById(white.userId);
    const blackUser = await User.findById(black.userId);

    if (!whiteUser || !blackUser) {
      console.warn("⚠️ Cannot save game: user not found in database");
      return null;
    }

    const whiteEloBefore = whiteUser.elo;
    const blackEloBefore = blackUser.elo;

    let winner,
      whiteResult,
      blackResult,
      whiteEloChange,
      blackEloChange;

    if (result === "white_win") {
      winner = "white";
      whiteResult = "win";
      blackResult = "loss";
      whiteEloChange = calculateEloChange(
        whiteEloBefore,
        blackEloBefore,
        "win"
      );
      blackEloChange = calculateEloChange(
        blackEloBefore,
        whiteEloBefore,
        "loss"
      );
    } else if (result === "black_win") {
      winner = "black";
      whiteResult = "loss";
      blackResult = "win";
      whiteEloChange = calculateEloChange(
        whiteEloBefore,
        blackEloBefore,
        "loss"
      );
      blackEloChange = calculateEloChange(
        blackEloBefore,
        whiteEloBefore,
        "win"
      );
    } else if (result === "draw") {
      winner = "draw";
      whiteResult = "draw";
      blackResult = "draw";
      whiteEloChange = calculateEloChange(
        whiteEloBefore,
        blackEloBefore,
        "draw"
      );
      blackEloChange = calculateEloChange(
        blackEloBefore,
        whiteEloBefore,
        "draw"
      );
    } else if (result === "white_disconnect" || result === "white_resign") {
      winner = "black";
      whiteResult = "loss";
      blackResult = "win";
      whiteEloChange = calculateEloChange(
        whiteEloBefore,
        blackEloBefore,
        "loss"
      );
      blackEloChange = calculateEloChange(
        blackEloBefore,
        whiteEloBefore,
        "win"
      );
    } else if (result === "black_disconnect" || result === "black_resign") {
      winner = "white";
      whiteResult = "win";
      blackResult = "loss";
      whiteEloChange = calculateEloChange(
        whiteEloBefore,
        blackEloBefore,
        "win"
      );
      blackEloChange = calculateEloChange(
        blackEloBefore,
        whiteEloBefore,
        "loss"
      );
    }

    const endTime = new Date();
    const duration = Math.floor((endTime - startTime) / 1000);
    const totalMoves = pgn ? pgn.split(/\d+\./).length - 1 : 0;

    const game = await Game.create({
      roomCode: code,
      white: {
        userId: white.userId,
        username: white.username,
        eloBeforeGame: whiteEloBefore,
        eloAfterGame: whiteEloBefore + whiteEloChange,
        eloChange: whiteEloChange,
      },
      black: {
        userId: black.userId,
        username: black.username,
        eloBeforeGame: blackEloBefore,
        eloAfterGame: blackEloBefore + blackEloChange,
        eloChange: blackEloChange,
      },
      result,
      winner,
      endReason,
      pgn: pgn || "",
      finalFen,
      totalMoves,
      duration,
      startedAt: startTime,
      endedAt: endTime,
    });

    //console.log(`💾 Game saved: ${game._id}`);

    whiteUser.elo += whiteEloChange;
    blackUser.elo += blackEloChange;
    await whiteUser.save();
    await blackUser.save();

    // console.log(
    //   `📊 ELO updated: ${white.username} (${
    //     whiteEloChange > 0 ? "+" : ""
    //   }${whiteEloChange}), ${black.username} (${
    //     blackEloChange > 0 ? "+" : ""
    //   }${blackEloChange})`
    // );

    await EloHistory.create({
      userId: white.userId,
      gameId: game._id,
      eloBefore: whiteEloBefore,
      eloAfter: whiteUser.elo,
      eloChange: whiteEloChange,
      reason: getEloReason(whiteResult, endReason),
      opponentId: black.userId,
      opponentUsername: black.username,
      opponentEloBefore: blackEloBefore,
    });

    await EloHistory.create({
      userId: black.userId,
      gameId: game._id,
      eloBefore: blackEloBefore,
      eloAfter: blackUser.elo,
      eloChange: blackEloChange,
      reason: getEloReason(blackResult, endReason),
      opponentId: white.userId,
      opponentUsername: white.username,
      opponentEloBefore: whiteEloBefore,
    });

    await updatePlayerStats(
      white.userId,
      "white",
      whiteResult,
      endReason,
      totalMoves,
      duration
    );
    await updatePlayerStats(
      black.userId,
      "black",
      blackResult,
      endReason,
      totalMoves,
      duration
    );

    await MatchHistory.create({
      userId: white.userId,
      gameId: game._id,
      opponentId: black.userId,
      opponentUsername: black.username,
      opponentElo: blackEloBefore,
      myColor: "white",
      result: whiteResult,
      endReason,
      eloChange: whiteEloChange,
      eloAfter: whiteUser.elo,
      totalMoves,
      duration,
      playedAt: endTime,
      roomCode: code,
      pgn: pgn || "",
    });

    await MatchHistory.create({
      userId: black.userId,
      gameId: game._id,
      opponentId: white.userId,
      opponentUsername: white.username,
      opponentElo: whiteEloBefore,
      myColor: "black",
      result: blackResult,
      endReason,
      eloChange: blackEloChange,
      eloAfter: blackUser.elo,
      totalMoves,
      duration,
      playedAt: endTime,
      roomCode: code,
      pgn: pgn || "",
    });

    await updateWinRateByColor(
      white.userId,
      "white",
      whiteResult,
      whiteEloChange
    );
    await updateWinRateByColor(
      black.userId,
      "black",
      blackResult,
      blackEloChange
    );

    //console.log(`✅ All stats updated for game ${game._id}`);
    return game;
  } catch (error) {
    console.error("❌ Error saving game:", error);
    return null;
  }
}

function getEloReason(result, endReason) {
  if (result === "win") {
    if (endReason === "disconnect") return "opponent_disconnect";
    if (endReason === "resign") return "opponent_resign";
    return "win";
  } else if (result === "loss") {
    if (endReason === "disconnect") return "disconnect_loss";
    if (endReason === "resign") return "resign_loss";
    return "loss";
  }
  return "draw";
}

async function updatePlayerStats(
  userId,
  color,
  result,
  endReason,
  moves,
  duration
) {
  try {
    let stats = await PlayerStats.findOne({ userId });
    if (!stats) {
      stats = await PlayerStats.create({ userId });
    }
    stats.updateAfterGame({ color, result, endReason, moves, duration });
    const user = await User.findById(userId);
    if (user && user.elo > stats.highestElo) stats.highestElo = user.elo;
    if (user && user.elo < stats.lowestElo) stats.lowestElo = user.elo;
    await stats.save();
  } catch (err) {
    console.error("❌ Error updating player stats:", err);
  }
}

async function updateWinRateByColor(userId, color, result, eloChange) {
  try {
    let winRate = await WinRateByColor.findOne({ userId });
    if (!winRate) {
      winRate = await WinRateByColor.create({ userId });
    }
    const colorStats = winRate[color];
    colorStats.games += 1;
    if (result === "win") colorStats.wins += 1;
    else if (result === "loss") colorStats.losses += 1;
    else if (result === "draw") colorStats.draws += 1;
    const totalEloChange =
      colorStats.avgEloChange * (colorStats.games - 1) + eloChange;
    colorStats.avgEloChange = Math.round(totalEloChange / colorStats.games);
    winRate.recalculate();
    await winRate.save();
  } catch (err) {
    console.error("❌ Error updating win rate:", err);
  }
}

// ============================================
// SOCKET HANDLERS
// ============================================
io.on("connection", (socket) => {
  //console.log("\n🔌 CLIENT CONNECTED:", socket.id);

  // ====== TẠO PHÒNG (TRẮNG) ======
  socket.on("createGame", ({ code, username, userId, password }) => {
    // console.log(
    //   `\n📍 [createGame] Room: ${code}, White: ${username}, UserId: ${
    //     userId || "guest"
    //   }, HasPassword: ${password ? "YES" : "NO"}`
    // );

    if (rooms.has(code)) {
      const existingRoom = rooms.get(code);
      if (!existingRoom.started || existingRoom.white?.socketId === socket.id) {
        existingRoom.white = { socketId: socket.id, username, userId };
        existingRoom.password = password || null;
        socket.join(code);
        socket.roomCode = code;
        socket.playerColor = "white";
        io.to(code).emit("roomCreated", {
          code,
          white: username,
          hasPassword: !!password,
        });
        return;
      }
      socket.emit(
        "error",
        "Mã phòng này đã được người khác tạo. Hãy tạo mã mới."
      );
      return;
    }

    const newRoom = {
      code,
      white: { socketId: socket.id, username, userId },
      black: null,
      fen: "start",
      started: false,
      ended: false,
      startTime: null,
      createdAt: new Date(),
      moves: [],
      pgn: "",
      password: password || null,
    };

    rooms.set(code, newRoom);
    socket.join(code);
    socket.roomCode = code;
    socket.playerColor = "white";

    io.to(code).emit("roomCreated", {
      code,
      white: username,
      hasPassword: !!password,
    });
  });

  // ====== ĐEN JOIN PHÒNG ======
  socket.on("joinGame", ({ code, username, userId, password }) => {
    // console.log(
    //   `\n📍 [joinGame] Room: ${code}, Black: ${username}, UserId: ${
    //     userId || "guest"
    //   }, PasswordInput: ${password ? "***" : "(none)"}`
    // );

    if (!rooms.has(code)) {
      socket.emit("error", "Phòng không tồn tại hoặc đã kết thúc");
      return;
    }

    const room = rooms.get(code);

    // Phòng có mật khẩu → bắt buộc nhập đúng
    if (room.password) {
      if (!password) {
        socket.emit("error", "Phòng này có mật khẩu. Vui lòng nhập mật khẩu.");
        return;
      }
      if (password !== room.password) {
        socket.emit("error", "Mật khẩu phòng không đúng.");
        return;
      }
    }

    if (room.white?.userId && room.white.userId === userId) {
      socket.emit("error", "Bạn không thể chơi với chính mình.");
      return;
    }

    if (room.black && room.black.socketId !== socket.id) {
      socket.emit("error", "Phòng đã đủ 2 người chơi");
      return;
    }

    room.black = { socketId: socket.id, username, userId };

    socket.join(code);
    socket.roomCode = code;
    socket.playerColor = "black";

    // Thông báo đã tìm thấy đối thủ (optional)
    io.to(code).emit("matchFound", {
      white: room.white.username,
      black: username,
      message: "Đối thủ đã sẵn sàng, ván đấu sẽ bắt đầu sau 5 giây...",
    });

    // ⏱ BẮT ĐẦU GAME SAU 5 GIÂY
    setTimeout(() => {
      // Có thể trong 5s phòng đã bị xoá / ai đó quit
      if (!rooms.has(code)) return;
      const currentRoom = rooms.get(code);
      if (!currentRoom.white || !currentRoom.black) {
        // console.log(
        //   `⚠️ Room ${code} cannot start: missing player after 5s countdown`
        // );
        return;
      }
      if (currentRoom.started) return;

      currentRoom.started = true;
      currentRoom.startTime = new Date();

      io.to(code).emit("startGame", {
        white: currentRoom.white.username,
        black: currentRoom.black.username,
        message: "🎮 Trò chơi bắt đầu!",
      });

      //console.log(`✅ Game started in room ${code}`);
    }, 5000);
  });

  // ====== NƯỚC ĐI ======
  socket.on("move", (move) => {
    const code = socket.roomCode;
    if (!code || !rooms.has(code)) return;
    const room = rooms.get(code);
    if (!room.started) return;
    room.moves.push(move);
    socket.to(code).emit("newMove", move);
  });

  // ====== RỜI PHÒNG (CLICK NÚT "RỜI PHÒNG") ======
  socket.on("leaveRoom", async ({ code }) => {
    // //console.log(`🚪 [leaveRoom] ${socket.id} leaving room ${code}`);

    if (!code || !rooms.has(code)) return;

    const room = rooms.get(code);
    const isWhite = room.white?.socketId === socket.id;
    const isBlack = room.black?.socketId === socket.id;

    // ----- GAME CHƯA BẮT ĐẦU -----
    if (!room.started) {
      if (isWhite) {
        // Trắng rời → huỷ phòng hoàn toàn
        socket.to(code).emit("roomClosed", {
          reason: "Chủ phòng đã rời đi, phòng đã bị hủy.",
        });
        await deleteRoomEverywhere(code, "white leave before start");
      } else if (isBlack) {
        // Đen rời → chỉ xoá slot đen
        room.black = null;
        //console.log(`⚠️ Black left room ${code} before start (room still alive)`);
      }
      socket.leave(code);
      socket.roomCode = null;
      socket.playerColor = null;
      return;
    }

    // ----- GAME ĐANG DIỄN RA -----
    if (room.started && !room.ended) {
      room.ended = true;
      const winner = isWhite ? "black" : "white";
      const result = isWhite ? "white_disconnect" : "black_disconnect";

      socket.to(code).emit("gameOverDisconnect", {
        winner,
        reason: `${isWhite ? "Trắng" : "Đen"} đã rời phòng`,
      });

      await saveGameResult(room, result, "disconnect", room.pgn, room.fen || "");
      await deleteRoomEverywhere(code, "leaveRoom during game");
    }

    socket.leave(code);
    socket.roomCode = null;
    socket.playerColor = null;
  });

  // ====== CẬP NHẬT PGN ======
  socket.on("updatePgn", (pgn) => {
    const code = socket.roomCode;
    if (!code || !rooms.has(code)) return;
    rooms.get(code).pgn = pgn;
  });

  // ====== ĐỀ NGHỊ HÒA ======
  socket.on("offerDraw", () => {
    const code = socket.roomCode;
    if (!code) return;
    //console.log(`🤝 Draw offered in ${code} by ${socket.playerColor}`);
    socket.to(code).emit("drawOffered", { from: socket.playerColor });
  });

  socket.on("acceptDraw", async () => {
    const code = socket.roomCode;
    if (!code || !rooms.has(code)) return;
    const room = rooms.get(code);
    //console.log(`✅ Draw accepted in ${code}`);
    io.to(code).emit("drawAccepted");
    await saveGameResult(room, "draw", "draw_agreement", room.pgn, room.fen || "");
    await deleteRoomEverywhere(code, "draw accepted");
  });

  socket.on("declineDraw", () => {
    const code = socket.roomCode;
    if (!code) return;
    //console.log(`❌ Draw declined in ${code}`);
    socket.to(code).emit("drawDeclined");
  });

  // ====== XIN THUA ======
  socket.on("resign", async ({ pgn, fen } = {}) => {
    const code = socket.roomCode;
    if (!code || !rooms.has(code)) return;
    const room = rooms.get(code);
    if (pgn) room.pgn = pgn;
    if (fen) room.fen = fen;

    const winner = socket.playerColor === "white" ? "black" : "white";
    const result =
      socket.playerColor === "white" ? "white_resign" : "black_resign";

    //console.log(`🏳️ ${socket.playerColor} resigned in ${code}`);
    io.to(code).emit("gameEnded", {
      result: winner + "_win",
      winner,
      reason: `${
        socket.playerColor === "white" ? "Trắng" : "Đen"
      } đã xin thua`,
    });

    await saveGameResult(room, result, "resign", room.pgn, room.fen || "");
    await deleteRoomEverywhere(code, "resign");
  });

  // ====== CÁC CASE KẾT THÚC KHÁC ======
  socket.on("checkmate", async ({ winner, pgn, fen }) => {
    const code = socket.roomCode;
    if (!code || !rooms.has(code)) return;
    const room = rooms.get(code);
    if (pgn) room.pgn = pgn;
    if (fen) room.fen = fen;
    const result = winner === "white" ? "white_win" : "black_win";
    //console.log(`👑 Checkmate in ${code}, winner: ${winner}`);
    io.to(code).emit("gameEnded", { result, winner, reason: "Chiếu hết!" });
    await saveGameResult(room, result, "checkmate", room.pgn, room.fen || "");
    await deleteRoomEverywhere(code, "checkmate");
  });

  socket.on("stalemate", async ({ pgn, fen }) => {
    const code = socket.roomCode;
    if (!code || !rooms.has(code)) return;
    const room = rooms.get(code);
    if (pgn) room.pgn = pgn;
    if (fen) room.fen = fen;
    io.to(code).emit("gameEnded", {
      result: "draw",
      winner: "draw",
      reason: "Hòa - Bí quân",
    });
    await saveGameResult(room, "draw", "stalemate", room.pgn, room.fen || "");
    await deleteRoomEverywhere(code, "stalemate");
  });

  socket.on("drawByRepetition", async ({ pgn, fen }) => {
    const code = socket.roomCode;
    if (!code || !rooms.has(code)) return;
    const room = rooms.get(code);
    if (pgn) room.pgn = pgn;
    if (fen) room.fen = fen;
    io.to(code).emit("gameEnded", {
      result: "draw",
      winner: "draw",
      reason: "Hòa - Lặp 3 lần",
    });
    await saveGameResult(
      room,
      "draw",
      "draw_agreement",
      room.pgn,
      room.fen || ""
    );
    await deleteRoomEverywhere(code, "draw by repetition");
  });

  socket.on("drawByMaterial", async ({ pgn, fen }) => {
    const code = socket.roomCode;
    if (!code || !rooms.has(code)) return;
    const room = rooms.get(code);
    if (pgn) room.pgn = pgn;
    if (fen) room.fen = fen;
    io.to(code).emit("gameEnded", {
      result: "draw",
      winner: "draw",
      reason: "Hòa - Không đủ quân",
    });
    await saveGameResult(
      room,
      "draw",
      "insufficient_material",
      room.pgn,
      room.fen || ""
    );
    await deleteRoomEverywhere(code, "draw by material");
  });

  socket.on("drawGeneric", async ({ pgn, fen }) => {
    const code = socket.roomCode;
    if (!code || !rooms.has(code)) return;
    const room = rooms.get(code);
    if (pgn) room.pgn = pgn;
    if (fen) room.fen = fen;
    io.to(code).emit("gameEnded", {
      result: "draw",
      winner: "draw",
      reason: "Hòa",
    });
    await saveGameResult(
      room,
      "draw",
      "draw_agreement",
      room.pgn,
      room.fen || ""
    );
    await deleteRoomEverywhere(code, "generic draw");
  });

  // ====== SOCKET DISCONNECT (F5 / mất mạng) ======
  socket.on("disconnect", async () => {
    //console.log("❌ CLIENT DISCONNECTED:", socket.id);

    const code = socket.roomCode;
    if (!code || !rooms.has(code)) return;

    const room = rooms.get(code);
    const isWhite = room.white?.socketId === socket.id;
    const isBlack = room.black?.socketId === socket.id;

    // ----- GAME CHƯA BẮT ĐẦU -----
    if (!room.started) {
      if (isWhite) {
        socket.to(code).emit("roomClosed", {
          reason: "Chủ phòng đã rời đi, phòng đã bị hủy.",
        });
        await deleteRoomEverywhere(code, "white disconnected before start");
      } else if (isBlack) {
        room.black = null;
        //console.log(`⚠️ Guest disconnected before start in room ${code}`);
      }
      return;
    }

    // ----- GAME ĐANG DIỄN RA -----
    if (room.started && !room.ended) {
      room.ended = true;

      const winner = isWhite ? "black" : "white";
      const result = isWhite ? "white_disconnect" : "black_disconnect";

      socket.to(code).emit("gameOverDisconnect", {
        winner,
        reason: `${isWhite ? "Trắng" : "Đen"} đã ngắt kết nối`,
      });

      await saveGameResult(
        room,
        result,
        "disconnect",
        room.pgn,
        room.fen || ""
      );

      await deleteRoomEverywhere(code, "disconnect during game");
    }
  });
});

// Cron nhỏ dọn rác phòng quá 2 tiếng (chỉ RAM)
setInterval(() => {
  const now = new Date();
  rooms.forEach((room, code) => {
    if (now - room.createdAt > 2 * 60 * 60 * 1000) {
      rooms.delete(code);
      //console.log(`🧹 Room ${code} auto-removed from memory (timeout)`);
    }
  });
}, 60000);

// Endpoint debug
httpServer.on("request", (req, res) => {
  if (req.url === "/stats" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        totalRooms: rooms.size,
        totalConnections: io.engine.clientsCount,
        rooms: Array.from(rooms.entries()).map(([code, room]) => ({
          code,
          white: room.white?.username || "empty",
          black: room.black?.username || "empty",
          started: room.started,
        })),
      })
    );
  }
});

httpServer.listen(PORT, () => {
  //console.log(`✅ Socket.io Server Ready on port ${PORT}`);
});

process.on("SIGTERM", () => httpServer.close(() => process.exit(0)));
process.on("SIGINT", () => httpServer.close(() => process.exit(0)));
