"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { FaUserCircle } from "react-icons/fa";

export default function Navbar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [admin, setAdmin] = useState(null);

  // Lấy thông tin admin từ API
  useEffect(() => {
    const fetchAdmin = async () => {
      try {
        const res = await fetch("/api/admin/me", {
          method: "GET",
          cache: "no-store",
        });

        if (!res.ok) {
          // Chưa đăng nhập hoặc token sai → có thể redirect về login nếu muốn
          // router.replace("/admin/login");
          return;
        }

        const data = await res.json();
        setAdmin(data.admin);
      } catch (err) {
        console.error("Lỗi lấy admin info:", err);
      }
    };

    fetchAdmin();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
      });

      setAdmin(null);                // ✅ reset state
      router.replace("/admin/login");
    } catch (err) {
      console.log("Lỗi đăng xuất:", err);
    }
  };

  return (
    <header
      className="navbar"
      style={{
        background: "rgba(10,10,10,0.95)",
        borderBottom: "1px solid #2b2b2b",
        padding: "10px 18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 1000,
      }}
    >
      {/* Bên trái: tiêu đề */}
      <div className="d-flex align-items-center" style={{ gap: 10 }}>
        <h2
          className="mb-0"
          style={{
            fontSize: 20,
            fontWeight: 600,
            color: "#f5f5f5",
          }}
        >
          Bảng điều khiển
        </h2>
        <span
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: 1,
            padding: "2px 8px",
            borderRadius: 999,
            border: "1px solid #444",
            color: "#bbb",
            background: "#181818",
          }}
        >
          Admin
        </span>
      </div>

      {/* Bên phải: chào + avatar */}
      <div
        className="d-flex align-items-center me-2"
        style={{ gap: 12, position: "relative" }}
      >
        {/* Text chào */}
        <div className="d-none d-md-block" style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: 13,
              color: "#e5e5e5",
              fontWeight: 500,
            }}
          >
            Xin chào, {admin?.username || "Quản trị viên"}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "#8b8b8b",
            }}
          >
            Hệ thống quản trị CHESS
          </div>
        </div>

        {/* Avatar + dropdown */}
        <div
          className="avatar-wrapper"
          style={{ position: "relative" }}
          onClick={() => setOpen(!open)}
        >
          {admin?.avatar ? (
            <img
              src={admin.avatar}
              alt="Ảnh admin"
              className="avatar"
              style={{
                cursor: "pointer",
                borderRadius: "50%",
                width: 38,
                height: 38,
                objectFit: "cover",
                border: "1px solid #444",
              }}
            />
          ) : (
            <FaUserCircle
              size={34}
              color="#c5c5c5"
              style={{ cursor: "pointer" }}
            />
          )}

          {/* Dropdown */}
          {open && (
            <div
              style={{
                position: "absolute",
                right: 0,
                marginTop: 10,
                background: "#151515",
                border: "1px solid #333",
                borderRadius: 10,
                padding: "8px 0",
                width: 220,
                boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
                zIndex: 999,
              }}
            >
              {/* Tên người dùng */}
              <div
                style={{
                  padding: "10px 14px 6px",
                  borderBottom: "1px solid #262626",
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    color: "#f5f5f5",
                    fontWeight: 500,
                  }}
                >
                  {admin?.username || "Quản trị viên"}
                </div>
                {admin?.email && (
                  <div
                    style={{
                      fontSize: 11,
                      color: "#9a9a9a",
                      marginTop: 2,
                    }}
                  >
                    {admin.email}
                  </div>
                )}
              </div>

              {/* Nút đăng xuất */}
              <button
                onClick={handleLogout}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  textAlign: "left",
                  background: "transparent",
                  color: "#ff6b6b",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
