"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";

export default function AdminAccountPage() {
  const [currentAdmin, setCurrentAdmin] = useState(null); // admin đang login
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [form, setForm] = useState({
    username: "",
    email: "",
    role: "player", // ✅ default là player
    password: "",
  });

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Tìm kiếm
  const [searchTerm, setSearchTerm] = useState("");

  // ==========================
  // Lấy thông tin admin hiện tại
  // ==========================
  const loadCurrentAdmin = async () => {
    try {
      const res = await fetch("/api/admin/me", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        console.log("Lỗi load admin:", data.message);
        return;
      }

      setCurrentAdmin(data.admin);
      console.log("Current admin:", data.admin);
    } catch (err) {
      console.error("Lỗi fetch /api/admin/me:", err);
    }
  };

  // ==========================
  // Load danh sách tài khoản
  // ==========================
  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/users");
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Không tải được danh sách tài khoản");
        toast.error(data.message || "Không tải được danh sách tài khoản");
        return;
      }

      setUsers(data.users || []);
      setError("");

      const totalPages = Math.max(
        1,
        Math.ceil((data.users || []).length / pageSize)
      );
      if (currentPage > totalPages) {
        setCurrentPage(totalPages);
      }
    } catch (err) {
      console.error(err);
      setError("Lỗi khi tải danh sách tài khoản");
      toast.error("Lỗi khi tải danh sách tài khoản");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCurrentAdmin();
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==========================
  // Lọc theo search (username)
  // ==========================
  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;

    const keyword = searchTerm.toLowerCase();
    return users.filter((u) =>
      (u.username || "").toLowerCase().includes(keyword)
    );
  }, [users, searchTerm]);

  // Gợi ý username (dropdown nhỏ)
  const usernameSuggestions = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return [];

    return users
      .filter((u) => (u.username || "").toLowerCase().includes(keyword))
      .slice(0, 5);
  }, [users, searchTerm]);

  // Phân trang dựa trên danh sách đã lọc
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedUsers = filteredUsers.slice(
    startIndex,
    startIndex + pageSize
  );

  // Khi search term thay đổi, luôn đưa về trang 1
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const isAdmin = currentAdmin?.role === "admin";

  // ==========================
  // Mở form tạo mới
  // ==========================
  const handleOpenCreate = () => {
    if (!isAdmin) {
      toast.error("Chỉ admin mới được tạo tài khoản.");
      return;
    }

    setEditingUser(null);
    setForm({
      username: "",
      email: "",
      role: "player", // ✅ tạo mới mặc định là player
      password: "",
    });
    setIsModalOpen(true);
  };

  // ==========================
  // Mở form sửa
  // ==========================
  const handleOpenEdit = (user) => {
    if (!isAdmin) {
      toast.error("Chỉ admin mới được sửa tài khoản.");
      return;
    }

    setEditingUser(user);
    setForm({
      username: user.username || "",
      email: user.email || "",
      role: user.role || "player",
      password: "",
    });
    setIsModalOpen(true);
  };

  // ==========================
  // Submit form thêm / sửa
  // ==========================
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isAdmin) {
      toast.error("Bạn không có quyền lưu thay đổi tài khoản.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      let url = "/api/admin/users";
      let method = "POST";

      if (editingUser) {
        url = `/api/admin/users/${editingUser._id}`;
        method = "PUT";
      }

      const payload = {
        username: form.username,
        email: form.email,
        role: form.role,
      };

      if (!editingUser || form.password.trim()) {
        payload.password = form.password;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data.message || "Lưu tài khoản thất bại";
        setError(msg);
        toast.error(msg);
        return;
      }

      if (editingUser) {
        toast.success(`Cập nhật tài khoản ${form.username} thành công`);
      } else {
        toast.success(`Tạo tài khoản ${form.username} thành công`);
      }

      await loadUsers();
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      setError("Có lỗi xảy ra khi lưu tài khoản");
      toast.error("Có lỗi xảy ra khi lưu tài khoản");
    } finally {
      setSaving(false);
    }
  };

  // ==========================
  // Xóa tài khoản
  // ==========================
    // ==========================
  // Xóa tài khoản
  // ==========================
  const handleDelete = async (user) => {
    if (!isAdmin) {
      toast.error("Chỉ admin mới được xóa tài khoản.");
      return;
    }

    // Chỉ gọi window.confirm ở client
    if (typeof window !== "undefined") {
      const confirmDelete = window.confirm(
        `Bạn chắc chắn muốn xóa tài khoản "${user.username}"?`
      );
      if (!confirmDelete) return;
    } else {
      // Nếu (vì lý do gì đó) chạy trên server thì không xóa
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${user._id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Xóa tài khoản thất bại");
        return;
      }

      toast.success(`Đã xóa tài khoản ${user.username}`);
      setUsers((prev) => prev.filter((u) => u._id !== user._id));
    } catch (err) {
      console.error(err);
      toast.error("Có lỗi xảy ra khi xóa tài khoản");
    }
  };


  // Khi click 1 suggestion
  const handlePickSuggestion = (username) => {
    setSearchTerm(username);
  };

  // ==========================
  // Render
  // ==========================
  return (
    <div
      style={{
         marginTop: "2%", 
        padding: 24,
        color: "#E5E7EB",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 4 }}>Quản lý tài khoản</h1>
          <p style={{ fontSize: 13, color: "#9CA3AF" }}>
            Xem danh sách tài khoản. Chỉ admin mới được thêm, sửa, xóa và phân
            quyền (admin / user / player).
          </p>
          {currentAdmin && (
            <p style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>
              Bạn đang đăng nhập với tài khoản:{" "}
              <strong>{currentAdmin.username}</strong> (
              <span style={{ textTransform: "capitalize" }}>
                {currentAdmin.role}
              </span>
              )
            </p>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 8,
          }}
        >
          {/* Ô search */}
          <div style={{ position: "relative", minWidth: 260 }}>
            <input
              type="text"
              placeholder="Tìm theo username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                height: 38,
                padding: "0 12px 0 32px",
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.5)",
                background: "#020617",
                color: "#E5E7EB",
                fontSize: 13,
                outline: "none",
              }}
            />
            {/* icon search đơn giản */}
            <span
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 13,
                color: "#6B7280",
              }}
            >
              🔍
            </span>

            {/* Gợi ý username */}
            {usernameSuggestions.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: 42,
                  right: 0,
                  left: 0,
                  background: "#020617",
                  borderRadius: 14,
                  border: "1px solid rgba(55,65,81,0.9)",
                  boxShadow: "0 18px 40px rgba(0,0,0,0.9)",
                  zIndex: 20,
                  overflow: "hidden",
                }}
              >
                {usernameSuggestions.map((u) => (
                  <button
                    key={u._id}
                    type="button"
                    onClick={() => handlePickSuggestion(u.username)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 12px",
                      border: "none",
                      background: "transparent",
                      color: "#E5E7EB",
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    {u.username}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Button thêm tài khoản – chỉ admin thấy */}
          {isAdmin && (
            <button
              onClick={handleOpenCreate}
              style={{
                padding: "8px 16px",
                borderRadius: 999,
                border: "none",
                background:
                  "linear-gradient(135deg, #22C55E 0%, #4ADE80 40%, #BBF7D0 100%)",
                color: "#052E16",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
                boxShadow: "0 10px 30px rgba(34,197,94,0.35)",
              }}
            >
              + Thêm tài khoản
            </button>
          )}
        </div>
      </div>

      {/* Khung danh sách */}
      <div
        style={{
          background:
            "radial-gradient(circle at top left, #1F2937 0%, #020617 65%)",
          borderRadius: 16,
          padding: 16,
          boxShadow: "0 18px 50px rgba(0,0,0,0.65)",
          border: "1px solid rgba(148,163,184,0.1)",
        }}
      >
        {loading ? (
          <div style={{ padding: 16, fontSize: 14 }}>Đang tải...</div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ padding: 16, fontSize: 14 }}>
            Không tìm thấy tài khoản nào.
          </div>
        ) : (
          <>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead>
                <tr style={{ textAlign: "left", color: "#9CA3AF" }}>
                  <th style={{ padding: "10px 8px" }}>#</th>
                  <th style={{ padding: "10px 8px" }}>Username</th>
                  <th style={{ padding: "10px 8px" }}>Email</th>
                  <th style={{ padding: "10px 8px" }}>Role</th>
                  <th style={{ padding: "10px 8px" }}>Ngày tạo</th>
                  <th style={{ padding: "10px 8px", textAlign: "right" }}>
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((u, idx) => (
                  <tr
                    key={u._id}
                    style={{
                      borderTop: "1px solid rgba(55,65,81,0.7)",
                    }}
                  >
                    <td style={{ padding: "10px 8px", color: "#6B7280" }}>
                      {startIndex + idx + 1}
                    </td>
                    <td style={{ padding: "10px 8px" }}>{u.username}</td>
                    <td style={{ padding: "10px 8px" }}>{u.email}</td>
                    <td style={{ padding: "10px 8px" }}>
                      {(() => {
                        const role = u.role || "player";

                        let bg = "rgba(59,130,246,0.12)";
                        let color = "#60A5FA";
                        let border = "1px solid rgba(59,130,246,0.5)";

                        if (role === "admin") {
                          bg = "rgba(251,191,36,0.15)";
                          color = "#FBBF24";
                          border = "1px solid rgba(251,191,36,0.45)";
                        } else if (role === "player") {
                          bg = "rgba(148,163,184,0.18)";
                          color = "#E5E7EB";
                          border = "1px solid rgba(148,163,184,0.6)";
                        }

                        return (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "2px 10px",
                              borderRadius: 999,
                              fontSize: 11,
                              textTransform: "capitalize",
                              backgroundColor: bg,
                              color,
                              border,
                            }}
                          >
                            {role}
                          </span>
                        );
                      })()}
                    </td>
                    <td style={{ padding: "10px 8px", fontSize: 12 }}>
                      {u.createdAt
                        ? new Date(u.createdAt).toLocaleDateString("vi-VN")
                        : "-"}
                    </td>
                    <td
                      style={{
                        padding: "10px 8px",
                        textAlign: "right",
                      }}
                    >
                      {isAdmin ? (
                        <>
                          <button
                            onClick={() => handleOpenEdit(u)}
                            style={{
                              padding: "6px 10px",
                              borderRadius: 999,
                              border: "none",
                              background:
                                "linear-gradient(135deg,#3B82F6,#60A5FA)",
                              color: "white",
                              fontSize: 12,
                              marginRight: 8,
                              cursor: "pointer",
                            }}
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => handleDelete(u)}
                            style={{
                              padding: "6px 10px",
                              borderRadius: 999,
                              border: "none",
                              background:
                                "linear-gradient(135deg,#EF4444,#F97373)",
                              color: "white",
                              fontSize: 12,
                              cursor: "pointer",
                            }}
                          >
                            Xóa
                          </button>
                        </>
                      ) : (
                        <span
                          style={{
                            fontSize: 11,
                            color: "#6B7280",
                            fontStyle: "italic",
                          }}
                        >
                          Chỉ admin mới chỉnh sửa
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Phân trang */}
            <div
              style={{
                marginTop: 16,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 12,
                color: "#9CA3AF",
              }}
            >
              <span>
                Hiển thị{" "}
                <strong>
                  {filteredUsers.length === 0 ? 0 : startIndex + 1}-
                  {Math.min(startIndex + pageSize, filteredUsers.length)}
                </strong>{" "}
                trong tổng số{" "}
                <strong>{filteredUsers.length}</strong> tài khoản
              </span>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "1px solid rgba(148,163,184,0.4)",
                    background: "transparent",
                    color: safePage === 1 ? "#4B5563" : "#E5E7EB",
                    fontSize: 12,
                    cursor: safePage === 1 ? "not-allowed" : "pointer",
                  }}
                >
                  « Trước
                </button>
                <span>
                  Trang{" "}
                  <strong>
                    {safePage}/{totalPages}
                  </strong>
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={safePage === totalPages}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "1px solid rgba(148,163,184,0.4)",
                    background: "transparent",
                    color:
                      safePage === totalPages ? "#4B5563" : "#E5E7EB",
                    fontSize: 12,
                    cursor:
                      safePage === totalPages ? "not-allowed" : "pointer",
                  }}
                >
                  Sau »
                </button>
              </div>
            </div>
          </>
        )}

        {error && (
          <div
            style={{
              marginTop: 12,
              padding: "8px 10px",
              borderRadius: 8,
              background: "rgba(248,113,113,0.15)",
              color: "#FCA5A5",
              fontSize: 12,
            }}
          >
            {error}
          </div>
        )}
      </div>

      {/* Modal thêm / sửa tài khoản */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 480,
              background:
                "radial-gradient(circle at top, #020617 0%, #111827 50%)",
              borderRadius: 20,
              padding: 20,
              boxShadow: "0 24px 60px rgba(0,0,0,0.8)",
              border: "1px solid rgba(148,163,184,0.3)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <h2 style={{ fontSize: 18 }}>
                {editingUser ? "Sửa tài khoản" : "Thêm tài khoản mới"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#9CA3AF",
                  fontSize: 20,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 13 }}>Username</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, username: e.target.value }))
                  }
                  required
                  style={{
                    height: 38,
                    padding: "0 12px",
                    borderRadius: 10,
                    border: "1px solid #4B5563",
                    background: "#020617",
                    color: "#E5E7EB",
                    fontSize: 13,
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 13 }}>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  style={{
                    height: 38,
                    padding: "0 12px",
                    borderRadius: 10,
                    border: "1px solid #4B5563",
                    background: "#020617",
                    color: "#E5E7EB",
                    fontSize: 13,
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 13 }}>Role</label>
                <select
                  value={form.role}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, role: e.target.value }))
                  }
                  style={{
                    height: 38,
                    padding: "0 12px",
                    borderRadius: 10,
                    border: "1px solid #4B5563",
                    background: "#020617",
                    color: "#E5E7EB",
                    fontSize: 13,
                    outline: "none",
                  }}
                >
                  <option value="player">Player</option>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 13 }}>
                  Password{" "}
                  <span style={{ color: "#6B7280", fontSize: 11 }}>
                    {editingUser
                      ? "(bỏ trống nếu không đổi)"
                      : "(bắt buộc khi tạo mới)"}
                  </span>
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, password: e.target.value }))
                  }
                  required={!editingUser}
                  style={{
                    height: 38,
                    padding: "0 12px",
                    borderRadius: 10,
                    border: "1px solid #4B5563",
                    background: "#020617",
                    color: "#E5E7EB",
                    fontSize: 13,
                    outline: "none",
                  }}
                />
              </div>

              {error && (
                <div
                  style={{
                    marginTop: 4,
                    padding: "6px 10px",
                    borderRadius: 8,
                    background: "rgba(248,113,113,0.15)",
                    color: "#FCA5A5",
                    fontSize: 12,
                  }}
                >
                  {error}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                  marginTop: 10,
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 999,
                    border: "none",
                    background: "#4B5563",
                    color: "#E5E7EB",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 999,
                    border: "none",
                    background:
                      "linear-gradient(135deg,#3B82F6,#60A5FA)",
                    color: "#F9FAFB",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: saving ? "not-allowed" : "pointer",
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving
                    ? "Đang lưu..."
                    : editingUser
                    ? "Lưu thay đổi"
                    : "Tạo tài khoản"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
