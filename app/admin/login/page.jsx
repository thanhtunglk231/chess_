"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";

export default function AdminLoginPage() {
  const router = useRouter();

  // TAB: "password" | "email"
  const [activeTab, setActiveTab] = useState("password");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  // Email login
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  // =========================
  // ĐĂNG NHẬP = MẬT KHẨU
  // =========================
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          rememberMe,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Đăng nhập thất bại");
        return;
      }

      toast.success("Đăng nhập admin thành công!");
      router.replace("/admin");

      setTimeout(() => {
        if (window.location.pathname !== "/admin") {
          window.location.href = "/admin";
        }
      }, 150);
    } catch (err) {
      console.error("ADMIN LOGIN ERROR:", err);
      setError("Có lỗi xảy ra, vui lòng thử lại");
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // ĐĂNG NHẬP = EMAIL: GỬI OTP
  // =========================
  const handleSendOtp = async () => {
    setError("");
    setInfo("");

    if (!email) {
      setError("Vui lòng nhập email admin.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/admin/email/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Không gửi được mã đăng nhập.");
      } else {
        setOtp("");
        setOtpSent(true);
        setInfo(
          "Mã đăng nhập đã được gửi tới email admin của bạn. Vui lòng kiểm tra hộp thư (và cả spam)."
        );
      }
    } catch (err) {
      console.error("ADMIN SEND OTP ERROR:", err);
      setError("Có lỗi xảy ra khi gửi mã. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // ĐĂNG NHẬP = EMAIL: XÁC THỰC OTP
  // =========================
  const handleVerifyOtp = async () => {
    setError("");
    setInfo("");

    if (!email || !otp) {
      setError("Vui lòng nhập đầy đủ email và mã OTP.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/admin/email/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Mã OTP không hợp lệ.");
      } else {
        toast.success("Đăng nhập admin bằng email thành công!");
        router.replace("/admin");

        setTimeout(() => {
          if (window.location.pathname !== "/admin") {
            window.location.href = "/admin";
          }
        }, 150);
      }
    } catch (err) {
      console.error("ADMIN VERIFY OTP ERROR:", err);
      setError("Có lỗi xảy ra khi xác thực mã. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#04081C",
        padding: 24,
      }}
    >
      {/* Card login */}
      <div
        style={{
          width: "100%",
          maxWidth: 960,
          background: "#272b44",
          borderRadius: 24,
          boxShadow: "0 28px 80px rgba(0,0,0,0.55)",
          display: "flex",
          overflow: "hidden",
        }}
      >
        {/* Bên trái: logo + quân cờ lớn */}
        <div
          style={{
            width: 320,
            padding: 32,
            color: "#fff",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Logo + chữ */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 24,
            }}
          >
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: 12,
                background:
                  "radial-gradient(circle at 30% 20%, #38bdf8, #1d4ed8)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 18,
              }}
            >
              ♚
            </span>
            <span style={{ fontSize: 20, fontWeight: 700 }}>Chess Admin</span>
          </div>

          {/* Quân cờ */}
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 8,
            }}
          >
            <div
              style={{
                width: 380,
                height: 380,
                position: "relative",
              }}
            >
              <Image
                src="/img/QUAN_CO.png"
                alt="Chess King"
                fill
                style={{
                  objectFit: "contain",
                }}
                priority
              />
            </div>
          </div>
        </div>

        {/* Bên phải: form login + tabs */}
        <div
          style={{
            flex: 1,
            padding: "48px 64px",
            color: "#e5e7eb",
          }}
        >
          {/* Badge Admin Panel */}
          <div
            style={{
              padding: "6px 16px",
              display: "inline-block",
              background: "rgba(59,130,246,0.2)",
              borderRadius: 999,
              fontSize: 12,
              marginBottom: 12,
            }}
          >
            Admin Panel
          </div>

          <h1
            style={{
              color: "#FFF",
              fontSize: 26,
              fontWeight: 700,
              marginBottom: 4,
            }}
          >
            Welcome back!
          </h1>

          <p style={{ fontSize: 14, color: "#9ca3af", marginBottom: 20 }}>
            Chọn phương thức đăng nhập cho khu vực quản trị.
          </p>

          {/* Tabs */}
          <div
            style={{
              display: "flex",
              background: "rgba(15,23,42,0.7)",
              borderRadius: 999,
              padding: 4,
              marginBottom: 16,
            }}
          >
            <button
              type="button"
              onClick={() => {
                setActiveTab("password");
                setError("");
                setInfo("");
              }}
              style={{
                flex: 1,
                border: "none",
                borderRadius: 999,
                padding: "8px 12px",
                fontSize: 13,
                cursor: "pointer",
                background:
                  activeTab === "password"
                    ? "#20d1ff"
                    : "transparent",
                color: activeTab === "password" ? "#0f172a" : "#9ca3af",
                fontWeight: activeTab === "password" ? 600 : 500,
                transition: "all 0.2s ease",
              }}
            >
              Đăng nhập bằng mật khẩu
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("email");
                setError("");
                setInfo("");
              }}
              style={{
                flex: 1,
                border: "none",
                borderRadius: 999,
                padding: "8px 12px",
                fontSize: 13,
                cursor: "pointer",
                background:
                  activeTab === "email"
                    ? "#20d1ff"
                    : "transparent",
                color: activeTab === "email" ? "#0f172a" : "#9ca3af",
                fontWeight: activeTab === "email" ? 600 : 500,
                transition: "all 0.2s ease",
              }}
            >
              Đăng nhập bằng email
            </button>
          </div>

          {/* Error / Info */}
          {error && (
            <div
              style={{
                background: "rgba(248,113,113,0.15)",
                padding: "8px 12px",
                color: "#fecaca",
                borderRadius: 8,
                marginBottom: 12,
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          {info && (
            <div
              style={{
                background: "rgba(16,185,129,0.16)",
                padding: "8px 12px",
                color: "#a7f3d0",
                borderRadius: 8,
                marginBottom: 12,
                fontSize: 13,
              }}
            >
              {info}
            </div>
          )}

          {loading && (
            <div
              style={{
                background: "rgba(59,130,246,0.18)",
                padding: "8px 12px",
                color: "#bfdbfe",
                borderRadius: 8,
                marginBottom: 12,
                fontSize: 13,
              }}
            >
              Đang xử lý...
            </div>
          )}

          {/* TAB 1: PASSWORD */}
          {activeTab === "password" && (
            <form
              onSubmit={handlePasswordLogin}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              {/* Username / Email */}
              <div
                style={{ display: "flex", flexDirection: "column", gap: 6 }}
              >
                <label style={{ fontSize: 13 }}>Email / Username</label>
                <input
                  type="text"
                  placeholder="admin@example.com"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{
                    height: 42,
                    padding: "0 16px",
                    borderRadius: 999,
                    border: "1px solid #4b5563",
                    background: "#f9fafb",
                    color: "#111827",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </div>

              {/* Password */}
              <div
                style={{ display: "flex", flexDirection: "column", gap: 6 }}
              >
                <label style={{ fontSize: 13 }}>Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    height: 42,
                    padding: "0 16px",
                    borderRadius: 999,
                    border: "1px solid #4b5563",
                    background: "#f9fafb",
                    color: "#111827",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </div>

              {/* Ghi nhớ + Quên mật khẩu */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 4,
                  marginBottom: 6,
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 13,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{ accentColor: "#22d3ee" }}
                  />
                  Ghi nhớ đăng nhập
                </label>

                <a
                  href="/admin/forgot-password"
                  style={{
                    fontSize: 13,
                    color: "#38bdf8",
                    textDecoration: "none",
                  }}
                >
                  Quên mật khẩu?
                </a>
              </div>

              {/* Nút login */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  height: 42,
                  marginTop: 4,
                  borderRadius: 999,
                  border: "none",
                  background: "#20d1ff",
                  color: "#0f172a",
                  fontWeight: 600,
                  fontSize: 15,
                  cursor: "pointer",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                Sign in
              </button>
            </form>
          )}

          {/* TAB 2: EMAIL + OTP */}
          {activeTab === "email" && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <div
                style={{ display: "flex", flexDirection: "column", gap: 6 }}
              >
                <label style={{ fontSize: 13 }}>Email admin</label>
                <input
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  style={{
                    height: 42,
                    padding: "0 16px",
                    borderRadius: 999,
                    border: "1px solid #4b5563",
                    background: "#f9fafb",
                    color: "#111827",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </div>

              {otpSent && (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  <label style={{ fontSize: 13 }}>Mã đăng nhập (OTP)</label>
                  <input
                    type="text"
                    placeholder="••••••"
                    value={otp}
                    onChange={(e) => {
                      setOtp(e.target.value);
                      setError("");
                    }}
                    style={{
                      height: 42,
                      padding: "0 16px",
                      borderRadius: 999,
                      border: "1px solid #4b5563",
                      background: "#f9fafb",
                      color: "#111827",
                      fontSize: 18,
                      letterSpacing: "0.3em",
                      textAlign: "center",
                      outline: "none",
                    }}
                  />
                </div>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading || !email}
                  style={{
                    flex: 1,
                    height: 42,
                    borderRadius: 999,
                    border: "1px solid #0ea5e9",
                    background: "transparent",
                    color: "#7dd3fc",
                    fontWeight: 500,
                    fontSize: 14,
                    cursor: loading || !email ? "not-allowed" : "pointer",
                    opacity: loading || !email ? 0.6 : 1,
                  }}
                >
                  {otpSent ? "Gửi lại mã" : "📧 Gửi mã đăng nhập"}
                </button>

                {otpSent && (
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={loading || !otp}
                    style={{
                      flex: 1,
                      height: 42,
                      borderRadius: 999,
                      border: "none",
                      background: "#22c55e",
                      color: "#022c22",
                      fontWeight: 600,
                      fontSize: 14,
                      cursor: loading || !otp ? "not-allowed" : "pointer",
                      opacity: loading || !otp ? 0.7 : 1,
                    }}
                  >
                    ✅ Xác nhận
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Text dưới cùng */}
          <div
            style={{
              marginTop: 24,
              fontSize: 12,
              color: "#6b7280",
            }}
          >
            <div style={{ marginBottom: 8 }}>
              Không phải admin?{" "}
              <a
                href="/login"
                style={{ color: "#38bdf8", textDecoration: "none" }}
              >
                Về trang đăng nhập người dùng
              </a>
            </div>

            <div>
              <a
                href="#"
                style={{
                  color: "#6b7280",
                  textDecoration: "none",
                  marginRight: 16,
                }}
              >
                Terms of use
              </a>
              <a href="#" style={{ color: "#6b7280", textDecoration: "none" }}>
                Privacy policy
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
