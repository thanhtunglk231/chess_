// app/api/rooms/join/route.js
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Room from "@/models/Room";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

export async function POST(request) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

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
      return NextResponse.json(
        { message: "Room not found" },
        { status: 404 }
      );
    }

    const userId = decoded.id;

    // Không cho user vào 2 lần
    const alreadyIn = room.players.some(
      (p) => p.toString() === userId.toString()
    );
    if (!alreadyIn) {
  room.players.push(userId);
}

// Nếu đủ 2 người thì đang chơi
if (room.players.length >= 2) {
  room.status = "in-progress";
} else if (room.players.length === 1) {
  room.status = "available";
}

await room.save();

    return NextResponse.json({ room }, { status: 200 });
  } catch (error) {
    console.error("❌ Error joining room:", error);
    return NextResponse.json(
      { message: "Error joining room", error: error.message },
      { status: 500 }
    );
  }
}
