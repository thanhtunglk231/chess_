"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  ArrowLeft,
  Users,
  Clock,
  Target,
  PlusCircle,
  Lock,
  LockOpen,
  X,
  Loader2,
} from "lucide-react";

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

  // Modal tạo phòng
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createIsPrivate, setCreateIsPrivate] = useState(false);
  const [createPassword, setCreatePassword] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  // Modal join phòng private
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinRoomCode, setJoinRoomCode] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState("");

  const fetchRooms = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/rooms");
      if (!res.ok) {
        throw new Error("Không thể tải danh sách phòng");
      }

      const data = await res.json();
      console.log("Danh sách phòng:", data);

      // Lọc những phòng còn người chơi (phòng rác đã clear)
      const filtered = data.filter((room) => room.players?.length > 0);
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

  // ======================================================
  // JOIN ROOM (PUBLIC / PRIVATE)
  // ======================================================
  const callJoinRoomAPI = async ({ code, password }) => {
    try {
      setJoinLoading(true);
      setJoinError("");

      const res = await fetch("/api/rooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          password ? { code, password } : { code } // chỉ gửi password nếu có
        ),
      });

      const data = await res.json();

      if (!res.ok) {
        setJoinError(data.message || "Không thể vào phòng");
        return false;
      }

      // Join thành công → chuyển sang game với quân đen
      router.push(`/game/black?code=${code}`);
      return true;
    } catch (err) {
      console.error("Lỗi join room:", err);
      setJoinError("Đã có lỗi xảy ra khi vào phòng");
      return false;
    } finally {
      setJoinLoading(false);
    }
  };

  const handleJoinRoom = async (room) => {
    const code = room.code;

    if (room.isPrivate) {
      // 🟡 Phòng có mật khẩu → mở modal yêu cầu nhập mật khẩu
      setJoinRoomCode(code);
      setJoinPassword("");
      setJoinError("");
      setShowJoinModal(true);
      return;
    }

    // 🟢 Phòng public → join thẳng
    setJoinRoomCode(code);
    setJoinPassword("");
    setJoinError("");
    await callJoinRoomAPI({ code });
  };

  const handleSubmitJoinPrivate = async (e) => {
    e.preventDefault();
    if (!joinRoomCode) return;

    if (!joinPassword.trim()) {
      setJoinError("Vui lòng nhập mật khẩu phòng");
      return;
    }

    const ok = await callJoinRoomAPI({
      code: joinRoomCode,
      password: joinPassword.trim(),
    });

    if (ok) {
      // nếu join thành công thì modal sẽ tự đóng do router.push
      setShowJoinModal(false);
    }
  };

  // ======================================================
  // TẠO PHÒNG (PUBLIC / PRIVATE)
  // ======================================================
  const handleOpenCreateModal = () => {
    setShowCreateModal(true);
    setCreateIsPrivate(false);
    setCreatePassword("");
    setCreateError("");
  };

  const handleCloseCreateModal = () => {
    if (createLoading) return;
    setShowCreateModal(false);
    setCreatePassword("");
    setCreateError("");
  };

  const handleCreateRoomSubmit = async (e) => {
    e.preventDefault();
    setCreateError("");

    const code = generateRoomCode();
    const creatorId = user?._id || user?.id || user?.userId || null;

    if (createIsPrivate && !createPassword.trim()) {
      setCreateError("Vui lòng nhập mật khẩu cho phòng private");
      return;
    }

    try {
      setCreateLoading(true);

      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          creator: creatorId,
          isPrivate: createIsPrivate,
          password: createIsPrivate ? createPassword.trim() : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("Lỗi tạo phòng:", data);
        setCreateError(data.message || "Không thể tạo phòng");
        return;
      }

      // Tạo phòng thành công → đóng modal & chuyển sang game trắng
      setShowCreateModal(false);
      router.push(`/game/white?code=${code}`);
    } catch (err) {
      console.error("Lỗi tạo phòng:", err);
      setCreateError("Đã có lỗi xảy ra khi tạo phòng");
    } finally {
      setCreateLoading(false);
    }
  };

  // ======================================================
  // JSX
  // ======================================================
  return (
    <>
      {/* Modal JOIN PRIVATE ROOM */}
      {showJoinModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-slate-100">
                  Nhập mật khẩu phòng
                </h3>
              </div>
              <button
                onClick={() => !joinLoading && setShowJoinModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitJoinPrivate} className="p-4 space-y-3">
              <div className="text-xs text-slate-400 mb-1">
                Bạn đang cố tham gia phòng:
              </div>
              <div className="font-mono text-sm text-amber-300 tracking-[0.25em] mb-2">
                {joinRoomCode}
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-300">
                  Mật khẩu phòng <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  value={joinPassword}
                  onChange={(e) => {
                    setJoinPassword(e.target.value);
                    setJoinError("");
                  }}
                  placeholder="Nhập mật khẩu để vào phòng"
                />
              </div>

              {joinError && (
                <div className="text-xs text-red-400 bg-red-900/30 border border-red-700 px-3 py-2 rounded-lg">
                  {joinError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => !joinLoading && setShowJoinModal(false)}
                  className="px-3 py-2 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700"
                  disabled={joinLoading}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={joinLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-black bg-amber-400 hover:bg-amber-500 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {joinLoading && (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  )}
                  <span>Vào phòng</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal CREATE ROOM */}
      {showCreateModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-slate-100">
                  Tạo phòng mới
                </h3>
              </div>
              <button
                onClick={handleCloseCreateModal}
                className="text-slate-400 hover:text-slate-200"
                disabled={createLoading}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRoomSubmit} className="p-4 space-y-4">
              <div className="text-xs text-slate-400">
                Chọn loại phòng bạn muốn tạo. Bạn có thể bảo vệ phòng bằng mật
                khẩu để tránh người lạ vào ngẫu nhiên.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setCreateIsPrivate(false)}
                  className={`flex flex-col items-start gap-1 px-3 py-2 rounded-lg border text-left text-xs ${
                    !createIsPrivate
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-200"
                      : "border-slate-700 bg-slate-800 text-slate-200"
                  }`}
                  disabled={createLoading}
                >
                  <LockOpen className="w-4 h-4 mb-1" />
                  <span className="font-semibold">Phòng công khai</span>
                  <span className="text-[11px] text-slate-400">
                    Ai cũng có thể vào nếu biết mã phòng.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setCreateIsPrivate(true)}
                  className={`flex flex-col items-start gap-1 px-3 py-2 rounded-lg border text-left text-xs ${
                    createIsPrivate
                      ? "border-amber-500 bg-amber-500/10 text-amber-200"
                      : "border-slate-700 bg-slate-800 text-slate-200"
                  }`}
                  disabled={createLoading}
                >
                  <Lock className="w-4 h-4 mb-1" />
                  <span className="font-semibold">Phòng mật khẩu</span>
                  <span className="text-[11px] text-slate-400">
                    Chỉ ai có mật khẩu mới vào được.
                  </span>
                </button>
              </div>

              {createIsPrivate && (
                <div className="space-y-1">
                  <label className="text-xs text-slate-300">
                    Mật khẩu phòng <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="password"
                    className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    value={createPassword}
                    onChange={(e) => {
                      setCreatePassword(e.target.value);
                      setCreateError("");
                    }}
                    placeholder="Nhập mật khẩu (VD: 1234, abc123...)"
                  />
                  <p className="text-[11px] text-slate-500">
                    Gợi ý: dùng mật khẩu đủ dễ nhớ cho bạn nhưng khó đoán với
                    người lạ.
                  </p>
                </div>
              )}

              {createError && (
                <div className="text-xs text-red-400 bg-red-900/30 border border-red-700 px-3 py-2 rounded-lg">
                  {createError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCloseCreateModal}
                  className="px-3 py-2 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700"
                  disabled={createLoading}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {createLoading && (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  )}
                  <span>Tạo phòng</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MAIN PAGE */}
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
              Chọn một phòng bên dưới để tham gia. Chỉ hiển thị những phòng
              đang ở trạng thái{" "}
              <span className="text-emerald-400">available / in-progress</span>.
              Phòng có biểu tượng{" "}
              <Lock className="inline w-3 h-3 text-amber-400" /> là phòng có
              mật khẩu.
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

              <button
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-sm text-white"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Tạo phòng mới</span>
              </button>
            </div>

            <Link
              href="/room"
              className="text-xs text-sky-400 hover:underline"
            >
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
                    className="flex items-center justify-between gap-4 border border-slate-800 rounded-lg px-4 py-3 hover:border-sky-600/60 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs uppercase text-slate-500">
                          MÃ PHÒNG
                        </span>
                        <span className="font-mono text-sm tracking-[0.25em]">
                          {room.code}
                        </span>
                        {room.isPrivate && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/50 px-2 py-0.5 rounded-full">
                            <Lock className="w-3 h-3" />
                            <span>Private</span>
                          </span>
                        )}
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
                          <span
                            className={
                              room.status === "in-progress"
                                ? "text-sky-400"
                                : "text-emerald-400"
                            }
                          >
                            {room.status}
                          </span>
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleJoinRoom(room)}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium whitespace-nowrap"
                    >
                      {room.isPrivate && (
                        <Lock className="w-3 h-3 text-amber-200" />
                      )}
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
    </>
  );
}
