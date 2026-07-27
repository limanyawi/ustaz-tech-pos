import React, { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "./supabaseClient";
import {
  LayoutDashboard, Package, ShoppingCart, Truck, Receipt, Wrench,
  BarChart3, AlertTriangle, Plus, Search, Trash2, X, TrendingUp,
  TrendingDown, Wallet, Landmark, CircleDollarSign, Edit2, Check, LogOut, Users
} from "lucide-react";

const C = {
  navy: "#12213F", navyLight: "#1D3766", navySoft: "#EBF0FA",
  gold: "#C9A227", ink: "#1A1F2B", paper: "#F6F7FA", card: "#FFFFFF",
  line: "#E4E7EE", green: "#1E7A46", greenSoft: "#E5F4EC",
  red: "#B23A32", redSoft: "#FBEAE8", amber: "#B9791E", amberSoft: "#FBF0DD", gray: "#6B7280",
};

const NAV = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["owner", "manager", "staff"] },
  { key: "sales", label: "Sales / POS", icon: ShoppingCart, roles: ["owner", "manager", "staff"] },
  { key: "products", label: "Products", icon: Package, roles: ["owner", "manager", "staff"] },
  { key: "purchases", label: "Purchases", icon: Truck, roles: ["owner", "manager"] },
  { key: "expenses", label: "Expenses", icon: Receipt, roles: ["owner", "manager"] },
  { key: "repairs", label: "Repairs", icon: Wrench, roles: ["owner", "manager", "staff", "technician"] },
  { key: "dailyReport", label: "Daily Staff Report", icon: Users, roles: ["owner", "manager"] },
  { key: "reports", label: "Reports", icon: BarChart3, roles: ["owner", "manager"] },
];
const naira = (n) => "\u20A6" + Math.round(Number(n) || 0).toLocaleString("en-NG");
const todayISO = () => new Date().toISOString().slice(0, 10);
const uid = (prefix) => prefix + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
function withinRange(dateStr, from, to) { return dateStr && dateStr >= from && dateStr <= to; }

function useFonts() {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);
}

function Badge({ children, tone = "gray" }) {
  const tones = {
    green: { bg: C.greenSoft, fg: C.green }, red: { bg: C.redSoft, fg: C.red },
    amber: { bg: C.amberSoft, fg: C.amber }, gray: { bg: "#EEF0F4", fg: C.gray },
  };
  const t = tones[tone];
  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold inline-block" style={{ backgroundColor: t.bg, color: t.fg }}>{children}</span>;
}
function Card({ children, style, className = "" }) {
  return <div className={"rounded-xl p-5 " + className} style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, ...style }}>{children}</div>;
}
function Btn({ children, onClick, variant = "primary", type = "button", small, disabled }) {
  const base = "rounded-lg font-semibold transition-all inline-flex items-center gap-1.5 justify-center";
  const size = small ? "px-3 py-1.5 text-sm" : "px-4 py-2.5 text-sm";
  const styles = {
    primary: { backgroundColor: C.navy, color: "#fff" },
    gold: { backgroundColor: C.gold, color: C.navy },
    ghost: { backgroundColor: "transparent", color: C.navy, border: `1px solid ${C.line}` },
    danger: { backgroundColor: C.redSoft, color: C.red },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={base + " " + size + (disabled ? " opacity-50 cursor-not-allowed" : " hover:opacity-90")}
      style={styles[variant]}>
      {children}
    </button>
  );
}
function Field({ label, children }) {
  return <label className="block mb-3"><span className="block text-xs font-semibold mb-1" style={{ color: C.gray }}>{label}</span>{children}</label>;
}
const inputCls = "w-full rounded-lg px-3 py-2 text-sm outline-none";
const inputStyle = { border: `1px solid ${C.line}`, backgroundColor: "#fff" };
function EmptyNote({ text }) { return <p className="text-sm py-6 text-center" style={{ color: C.gray }}>{text}</p>; }
function Header({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: C.ink, fontFamily: "'Space Grotesk', sans-serif" }}>{title}</h1>
        {subtitle && <p className="text-sm mt-0.5" style={{ color: C.gray }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ backgroundColor: "rgba(18,33,63,0.45)" }}>
      <div className="rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" style={{ backgroundColor: "#fff" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{title}</h3>
          <button onClick={onClose}><X size={18} color={C.gray} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
