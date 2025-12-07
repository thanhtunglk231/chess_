// context/AuthContext.jsx
"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Lấy user info khi mount
  useEffect(() => {
    const refreshUser = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          console.log("✅ User loaded:", data.username);
          setUser(data);
        } else {
          console.log("❌ No user session");
          setUser(null);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    refreshUser();
  }, []);

  const login = async (username, password) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        console.log("✅ Login success:", data.user.username);
        setUser(data.user);
        return { success: true, message: data.message };
      }
      return { success: false, message: data.message };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, message: "Lỗi kết nối server" };
    }
  };

  const register = async (formData) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        console.log("✅ Register success:", data.user.username);
        setUser(data.user);
        return { success: true, message: data.message };
      }
      return { success: false, message: data.message };
    } catch (error) {
      console.error("Register error:", error);
      return { success: false, message: "Lỗi kết nối server" };
    }
  };

  // 🔴 FIX: Logout phải clear state VÀ redirect
  const logout = async () => {
    try {
      console.log("🚪 Logging out...");

      // Call logout API
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      console.log("✅ Logout API success");
    } catch (error) {
      console.error("Logout API error:", error);
    } finally {
      // 🔴 QUAN TRỌNG: Clear state NGAY dù có lỗi hay không
      console.log("🧹 Clearing user state...");
      setUser(null);

      // Clear cookie client-side (backup)
      document.cookie = "token=; Max-Age=0; path=/; SameSite=Lax";

      // Redirect về login
      console.log("↩️ Redirecting to login...");
      router.push("/login");

      // Force refresh để clear cache
      setTimeout(() => {
        router.refresh();
      }, 100);
    }
  };

  // Helper để check auth manually (dùng khi cần)
  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        return true;
      } else {
        setUser(null);
        return false;
      }
    } catch {
      setUser(null);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
