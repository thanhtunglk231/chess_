
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Crown } from "lucide-react";
import {
  FaTachometerAlt,
  FaUsers,
  FaChartBar,
  FaMusic,
  FaUserTie,
  FaDollarSign,
  FaTags,
  FaEnvelope,
} from "react-icons/fa";

export default function Sidebar() {
  const pathname = usePathname();

  const menu = [
    { label: "Tổng quan", icon: <FaTachometerAlt />, href: "/admin" },
    
    {
      label: "Quản lý tài khoản",
      icon: <FaUsers />,
      href: "/admin/account",
    }
  
    // { label: "Doanh thu", icon: <FaDollarSign />, href: "/admin/earnings" },
    // { label: "Gói giá", icon: <FaTags />, href: "/admin/pricing" },
    // { label: "Liên hệ", icon: <FaEnvelope />, href: "/admin/contact" },
  ];

  return (
    <div
      className="d-flex flex-column bg-dark text-light p-3"
      style={{ width: "260px", height: "100vh" }}
    >
      {/* Logo */}
     <Link
  href="/admin"
  className="text-center mb-4 d-block"
  style={{ cursor: "pointer" }}
>
  <Crown
    size={60}               // ⭐ chỉnh kích thước icon
    strokeWidth={1.5}       // đường nét đẹp hơn
    color="#f5c542"         // vàng kim (premium)
    style={{
      display: "block",
      margin: "0 auto",
      filter: "drop-shadow(0 0 8px rgba(255,255,200,0.35))",
    }}
  />

</Link>


      {/* Menu */}
      <ul className="nav nav-pills flex-column mb-auto">
        {menu.map((item, index) => (
          <li key={index} className="nav-item">
            <Link
              href={item.href}
              className={`nav-link d-flex align-items-center text-light ${
                pathname === item.href ? "active bg-primary" : "text-light"
              }`}
              style={{ gap: "10px", padding: "10px 15px", borderRadius: "6px" }}
            >
              {item.icon}
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
