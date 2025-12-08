"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, Users, Clock, Target, PlusCircle } from "lucide-react";

// Tạo mã phòng ngẫu nhiên
function generateRoomCode(length = 6) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function AvailableRoomsPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchRooms = async () => {
  try {
    setLoading(true);
    setError("");

    const res = await fetch("/api/rooms"); // API GET rooms status = "available"
    console.log("Response raw:", res);

    if (!res.ok) {
      throw new Error("Không thể tải danh sách phòng");
    }

    const data = await res.json();
    console.log("Dữ liệu phòng từ API:", data);

    // Tạm thời ĐỪNG filter để test xem data về đúng chưa
     const filtered = data.filter((room) => room.players?.length > 0);
     setRooms(filtered);
    setRooms(filtered);
  } catch (err) {
    console.error("Lỗi fetchRooms:", err);
    setError(err.message || "Đã có lỗi xảy ra");
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchRooms();
  }, []);

 const handleJoinRoom = async (roomCode) => {
  try {
    // gọi API để thêm user vào Room.players
    const res = await fetch("/api/rooms/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: roomCode }),
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.message || "Không thể vào phòng");
      return;
    }

    // join thành công -> vào game với quân đen
    router.push(`/game/black?code=${roomCode}`);
  } catch (err) {
    console.error("Lỗi join room:", err);
    alert("Đã có lỗi xảy ra khi vào phòng");
  }
};


  // 🆕 Tạo phòng mới từ trang danh sách phòng
  const handleCreateRoom = async () => {
  const code = generateRoomCode();

  // 👇 Lấy id từ user theo nhiều key
  const creatorId = user?._id || user?.id || user?.userId || null;

  console.log("CreatorId khi tạo phòng:", creatorId);

  try {
    await fetch("/api/rooms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code,
        creator: creatorId,
      }),
    });
  } catch (err) {
    console.error("Lỗi tạo phòng:", err);
  }

  router.push(`/game/white?code=${code}`);
};



  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Header + Back */}
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => router.push("/room")}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-slate-900 border border-slate-800 hover:bg-slate-800 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại sảnh</span>
          </button>

          <div className="text-right text-xs text-slate-400">
            <div>{user?.username}</div>
            <div>ELO: {user?.elo || 1200}</div>
          </div>
        </div>

        {/* Title */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h1 className="text-xl md:text-2xl font-semibold mb-1">
            Các phòng đang mở
          </h1>
          <p className="text-slate-400 text-sm">
            Chọn một phòng bên dưới để tham gia. Chỉ hiển thị những phòng đang ở
            trạng thái <span className="text-emerald-400">available</span>.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={fetchRooms}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-slate-900 border border-slate-800 hover:bg-slate-800 text-sm"
            >
              <Target className="w-4 h-4" />
              <span>Reload danh sách</span>
            </button>

            {/* 🆕 Nút tạo phòng mới ngay tại đây */}
            <button
              onClick={handleCreateRoom}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-sm text-white"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Tạo phòng mới</span>
            </button>
          </div>

          <Link href="/room" className="text-xs text-sky-400 hover:underline">
            Về sảnh chính
          </Link>
        </div>

        {/* Danh sách phòng */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          {loading ? (
            <p className="text-slate-400 text-sm">
              Đang tải danh sách phòng...
            </p>
          ) : error ? (
            <p className="text-red-400 text-sm">{error}</p>
          ) : rooms.length === 0 ? (
            <p className="text-slate-400 text-sm">
              Hiện chưa có phòng nào đang mở. Hãy nhấn{" "}
              <span className="text-emerald-400 font-medium">
                "Tạo phòng mới"
              </span>{" "}
              để tạo một phòng!
            </p>
          ) : (
            <ul className="space-y-3">
              {rooms.map((room) => (
                <li
                  key={room._id}
                  className="flex items-center justify-between gap-4 border border-slate-800 rounded-lg px-4 py-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase text-slate-500">
                        MÃ PHÒNG
                      </span>
                      <span className="font-mono text-sm tracking-[0.25em]">
                        {room.code}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>{room.players?.length || 0} người chơi</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          Tạo lúc{" "}
                          {new Date(room.createdAt).toLocaleTimeString(
                            "vi-VN",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        Trạng thái:
                        <span className="text-emerald-400">available</span>
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleJoinRoom(room.code)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium whitespace-nowrap"
                  >
                    <Target className="w-4 h-4" />
                    <span>Tham gia</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
