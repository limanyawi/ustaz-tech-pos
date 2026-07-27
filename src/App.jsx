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
