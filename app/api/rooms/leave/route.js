import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Room from "@/models/Room";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

export async function POST(request) {
  try {
    // Lấy token user
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    const userId = decoded.id;

    // Lấy code từ FE gửi lên
    const { code } = await request.json();
    if (!code) {
      return NextResponse.json(
        { message: "Room code is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const room = await Room.findOne({ code: code.toUpperCase() });
    if (!room) {
      return NextResponse.json({ message: "Room not found" }, { status: 404 });
    }

    // 🔥 Trừ người rời khỏi phòng
    room.players = room.players.filter(
      (p) => p.toString() !== userId.toString()
    );

    // 🔄 Cập nhật trạng thái phòng sau khi trừ người
    if (room.players.length === 0) {
      room.status = "available"; // Hoặc deleteOne()
    } else if (room.players.length === 1) {
      room.status = "available"; // Một người → vẫn là available (phòng chờ)
    } else if (room.players.length >= 2) {
      room.status = "in-progress";
    }

    await room.save();

    return NextResponse.json({ room }, { status: 200 });
  } catch (error) {
    console.error("❌ Error leaving room:", error);
    return NextResponse.json(
      { message: "Error leaving room", error: error.message },
      { status: 500 }
    );
  }
}
