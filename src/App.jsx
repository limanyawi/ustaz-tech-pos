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
/* ---------------------------------------------------------
   APP SHELL — auth, session, role
--------------------------------------------------------- */
export default function App() {
  useFonts();
  const [session, setSession] = useState(undefined); // undefined = checking, null = logged out
  const [profile, setProfile] = useState(null); // {id, full_name, role}
  const [tab, setTab] = useState("dashboard");
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setProfile(null); return; }
    (async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      if (!error) setProfile(data);
    })();
  }, [session]);

  const logout = async () => { await supabase.auth.signOut(); setProfile(null); setTab("dashboard"); };

  if (session === undefined) {
    return <CenteredMessage text="Loading…" />;
  }
  if (!session) {
    return <LoginScreen />;
  }
  if (!profile) {
    return <CenteredMessage text="Setting up your account… if this doesn't finish, ask your owner to check your profile role." />;
  }

  const allowedNav = NAV.filter((n) => n.roles.includes(profile.role));
  const isAdmin = profile.role === "owner" || profile.role === "manager";

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: C.paper, fontFamily: "Inter, sans-serif" }}>
      <Sidebar tab={tab} setTab={setTab} nav={allowedNav} profile={profile} onLogout={logout} />
      <main className="flex-1 min-w-0 p-6 md:p-8">
        <div className="max-w-6xl mx-auto">
          {tab === "dashboard" && <Dashboard isAdmin={isAdmin} refreshKey={refreshKey} />}
          {tab === "sales" && <SalesPOS profile={profile} refresh={refresh} refreshKey={refreshKey} />}
          {tab === "products" && <Products isAdmin={isAdmin} refresh={refresh} refreshKey={refreshKey} />}
          {tab === "purchases" && isAdmin && <Purchases refresh={refresh} refreshKey={refreshKey} />}
          {tab === "expenses" && isAdmin && <Expenses refreshKey={refreshKey} refresh={refresh} />}
          {tab === "repairs" && <Repairs isAdmin={isAdmin} profile={profile} refresh={refresh} refreshKey={refreshKey} />}
          {tab === "dailyReport" && isAdmin && <DailyStaffReport refreshKey={refreshKey} />}
          {tab === "reports" && isAdmin && <Reports refreshKey={refreshKey} />}
        </div>
      </main>
    </div>
  );
}

function CenteredMessage({ text }) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: C.paper }}>
      <div className="text-sm" style={{ color: C.gray, fontFamily: "Inter" }}>{text}</div>
    </div>
  );
}

/* ---------------------------------------------------------
   LOGIN SCREEN — real email + password via Supabase Auth
--------------------------------------------------------- */
function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: C.navy, fontFamily: "Inter, sans-serif" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-xl font-bold" style={{ color: "#fff", fontFamily: "'Space Grotesk', sans-serif" }}>Ustaz Tech Solutions</div>
          <div className="text-xs font-medium" style={{ color: C.gold }}>Staff Sign In</div>
        </div>
        <form onSubmit={submit} className="rounded-xl p-5" style={{ backgroundColor: "#fff" }}>
          <Field label="Email">
            <input type="email" required className={inputCls} style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          </Field>
          <Field label="Password">
            <input type="password" required className={inputCls} style={inputStyle} value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {error && <p className="text-xs mb-3" style={{ color: C.red }}>{error}</p>}
          <Btn type="submit" disabled={loading}><Check size={16} /> {loading ? "Signing in…" : "Sign In"}</Btn>
        </form>
        <p className="text-center text-xs mt-4" style={{ color: "#7C88A6" }}>
          Don't have a login? Ask the owner to create your account in Supabase.
        </p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   SIDEBAR
--------------------------------------------------------- */
function Sidebar({ tab, setTab, nav, profile, onLogout }) {
  const roleLabel = { owner: "Owner", manager: "Manager", staff: "Sales Staff", technician: "Technician" }[profile.role];
  return (
    <aside className="w-60 shrink-0 hidden sm:flex flex-col justify-between p-5" style={{ backgroundColor: C.navy }}>
      <div>
        <div className="mb-8 px-1">
          <div className="text-lg font-bold tracking-tight leading-tight" style={{ color: "#fff", fontFamily: "'Space Grotesk', sans-serif" }}>Ustaz Tech</div>
          <div className="text-xs font-medium" style={{ color: C.gold }}>{profile.full_name} &middot; {roleLabel}</div>
        </div>
        <nav className="space-y-1">
          {nav.map(({ key, label, icon: Icon }) => {
            const active = tab === key;
            return (
              <button key={key} onClick={() => setTab(key)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{ backgroundColor: active ? C.navyLight : "transparent", color: active ? "#fff" : "#B9C2D6" }}>
                <Icon size={17} strokeWidth={2} />
                {label}
              </button>
            );
          })}
        </nav>
      </div>
      <button onClick={onLogout} className="flex items-center gap-2 px-2 text-xs font-medium" style={{ color: "#B9C2D6" }}>
        <LogOut size={14} /> Sign Out
      </button>
    </aside>
  );
}

/* ---------------------------------------------------------
   DASHBOARD
--------------------------------------------------------- */
function Dashboard({ isAdmin, refreshKey }) {
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [expensesMonth, setExpensesMonth] = useState(0);
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);

  const today = todayISO();
  const monthStart = today.slice(0, 7) + "-01";

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [p, s, r] = await Promise.all([
        supabase.from("products_view").select("*"),
        supabase.from("sales_view").select("*").order("date", { ascending: false }),
        supabase.from("repairs").select("*"),
      ]);
      setProducts(p.data || []);
      setSales(s.data || []);
      setRepairs(r.data || []);
      if (isAdmin) {
        const e = await supabase.from("expenses").select("amount").gte("date", monthStart);
        setExpensesMonth((e.data || []).reduce((a, x) => a + Number(x.amount), 0));
      }
      setLoading(false);
    })();
  }, [refreshKey, isAdmin]);

  const [saleItems, setSaleItems] = useState([]);
  useEffect(() => {
    if (!isAdmin) return;
    supabase.from("sale_items").select("product_id, qty").then(({ data }) => setSaleItems(data || []));
  }, [refreshKey, isAdmin]);

  const stats = useMemo(() => {
    const sum = (arr, f) => arr.reduce((a, x) => a + f(x), 0);
    const salesToday = sales.filter((s) => s.date === today);
    const salesMonth = sales.filter((s) => s.date >= monthStart);
    const todaySales = sum(salesToday, (s) => s.total);
    const todayProfit = sum(salesToday, (s) => Number(s.profit) || 0);
    const monthSales = sum(salesMonth, (s) => s.total);
    const monthProfit = sum(salesMonth, (s) => Number(s.profit) || 0);
    const cash = sum(sales.filter((s) => s.payment === "Cash"), (s) => s.total);
    const transfer = sum(sales.filter((s) => s.payment === "Transfer"), (s) => s.total);
    const lowStock = products.filter((p) => p.stock <= p.min_stock);
    const repairsOwed = sum(repairs, (r) => Number(r.amount_charged) - Number(r.amount_paid));

    const qtyByProduct = {};
    saleItems.forEach((it) => { qtyByProduct[it.product_id] = (qtyByProduct[it.product_id] || 0) + Number(it.qty); });
    const topSellers = Object.entries(qtyByProduct)
      .map(([pid, qty]) => {
        const p = products.find((pp) => pp.id === pid);
        return { pid, qty, model: p ? `${p.brand} ${p.model}` : pid, manufacturer: p ? p.manufacturer : "" };
      })
      .sort((a, b) => b.qty - a.qty).slice(0, 5);

    return { todaySales, todayProfit, monthSales, monthProfit, cash, transfer, lowStock, repairsOwed, topSellers };
  }, [products, sales, repairs, saleItems, today, monthStart]);

  if (loading) return <CenteredMessage text="Loading dashboard…" />;

  return (
    <div>
      <Header title="Dashboard" subtitle="Live snapshot of your shop, right now." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Kpi label="Today's Sales" value={naira(stats.todaySales)} icon={CircleDollarSign} tone="navy" />
        {isAdmin && <Kpi label="Today's Profit" value={naira(stats.todayProfit)} icon={TrendingUp} tone="green" />}
        <Kpi label="This Month Sales" value={naira(stats.monthSales)} icon={Wallet} tone="navy" />
        {isAdmin && <Kpi label="This Month Profit" value={naira(stats.monthProfit)} icon={TrendingUp} tone="green" />}
        <Kpi label="Cash Collected" value={naira(stats.cash)} icon={Wallet} tone="gray" />
        <Kpi label="Bank Transfers" value={naira(stats.transfer)} icon={Landmark} tone="gray" />
        {isAdmin && <Kpi label="Monthly Expenses" value={naira(expensesMonth)} icon={TrendingDown} tone="red" />}
        <Kpi label="Repairs Balance Owed" value={naira(stats.repairsOwed)} icon={Wrench} tone="amber" />
      </div>
      <div className="grid md:grid-cols-2 gap-5">
        <Card>
          <div className="flex items-center gap-2 mb-4"><TrendingUp size={16} color={C.green} /><h3 className="font-semibold text-sm">Top-Selling Products</h3></div>
          {!isAdmin ? <EmptyNote text="Visible to Owner/Manager." /> : stats.topSellers.length === 0 ? <EmptyNote text="No sales recorded yet." /> : (
            <div className="space-y-2">
              {stats.topSellers.map((s, i) => (
                <div key={s.pid} className="flex items-center justify-between text-sm py-1.5" style={{ borderBottom: i < stats.topSellers.length - 1 ? `1px solid ${C.line}` : "none" }}>
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: C.navySoft, color: C.navy }}>{i + 1}</span>
                    <span className="font-medium">{s.model}</span>
                    <span style={{ color: C.gray }} className="text-xs">{s.manufacturer}</span>
                  </div>
                  <span className="font-semibold">{s.qty} sold</span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <div className="flex items-center gap-2 mb-4"><AlertTriangle size={16} color={C.red} /><h3 className="font-semibold text-sm">Low Stock Alerts</h3></div>
          {stats.lowStock.length === 0 ? <EmptyNote text="Nothing is low on stock right now." /> : (
            <div className="space-y-2">
              {stats.lowStock.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm py-1.5" style={{ borderBottom: `1px solid ${C.line}` }}>
                  <div><span className="font-medium">{p.brand} {p.model}</span><span style={{ color: C.gray }} className="text-xs ml-1.5">{p.quality} · {p.manufacturer}</span></div>
                  <Badge tone="red">{p.stock} left (min {p.min_stock})</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Kpi({ label, value, icon: Icon, tone }) {
  const tones = {
    navy: { bg: C.navy, fg: "#fff", sub: "#B9C2D6" }, green: { bg: C.green, fg: "#fff", sub: "#CFE9DA" },
    red: { bg: C.red, fg: "#fff", sub: "#F3D3CF" }, amber: { bg: C.amber, fg: "#fff", sub: "#F1DEB6" },
    gray: { bg: "#fff", fg: C.ink, sub: C.gray },
  };
  const t = tones[tone];
  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: t.bg, border: tone === "gray" ? `1px solid ${C.line}` : "none" }}>
      <div className="flex items-center justify-between mb-2"><span className="text-xs font-semibold" style={{ color: t.sub }}>{label}</span><Icon size={15} color={t.sub} /></div>
      <
