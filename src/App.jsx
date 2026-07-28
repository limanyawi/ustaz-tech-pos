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
      
      <div className="text-xl font-bold" style={{ color: t.fg, fontFamily: "'Space Grotesk', sans-serif" }}>{value}</div>
    </div>
  );
}
/* ---------------------------------------------------------
   SALES / POS
--------------------------------------------------------- */
function SalesPOS({ profile, refresh, refreshKey }) {
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [payment, setPayment] = useState("Cash");
  const [customer, setCustomer] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const [p, s] = await Promise.all([
      supabase.from("products_view").select("*"),
      supabase.from("sales_view").select("*").order("date", { ascending: false }).limit(8),
    ]);
    setProducts(p.data || []);
    setSales(s.data || []);
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const results = query ? products.filter((p) => {
    const q = query.toLowerCase();
    return (p.brand || "").toLowerCase().includes(q) || (p.model || "").toLowerCase().includes(q) || (p.manufacturer || "").toLowerCase().includes(q);
  }).slice(0, 6) : [];

  const addToCart = (p) => {
    setCart((c) => {
      const existing = c.find((i) => i.productId === p.id);
      if (existing) return c.map((i) => (i.productId === p.id ? { ...i, qty: i.qty + 1 } : i));
      return [...c, { productId: p.id, qty: 1, discount: 0 }];
    });
    setQuery("");
  };
  const updateCartItem = (pid, field, val) => setCart((c) => c.map((i) => (i.productId === pid ? { ...i, [field]: Number(val) || 0 } : i)));
  const removeFromCart = (pid) => setCart((c) => c.filter((i) => i.productId !== pid));

  const cartLines = cart.map((i) => {
    const p = products.find((pp) => pp.id === i.productId);
    const sellPrice = p ? Number(p.sell_price) : 0;
    const buyPrice = p ? Number(p.buy_price) || 0 : 0;
    const lineTotal = sellPrice * i.qty - i.discount;
    const lineProfit = (sellPrice - buyPrice) * i.qty - i.discount;
    return { ...i, product: p, lineTotal, lineProfit };
  });
  const cartTotal = cartLines.reduce((a, l) => a + l.lineTotal, 0);
  const cartProfit = cartLines.reduce((a, l) => a + l.lineProfit, 0);

  const completeSale = async () => {
    setError("");
    if (cart.length === 0) { setError("Add at least one item to the cart."); return; }
    for (const line of cartLines) {
      if (!line.product || line.qty > line.product.stock) {
        setError(`Not enough stock for ${line.product ? line.product.brand + " " + line.product.model : line.productId}.`);
        return;
      }
    }
    setSubmitting(true);
    const items = cart.map((i) => {
      const p = products.find((pp) => pp.id === i.productId);
      return { productId: i.productId, qty: i.qty, discount: i.discount, unitPrice: p ? p.sell_price : 0, buyPrice: p ? p.buy_price || 0 : 0 };
    });
    const { error } = await supabase.rpc("complete_sale", {
      p_id: uid("S"), p_date: todayISO(), p_payment: payment, p_customer: customer,
      p_staff_name: profile.full_name, p_total: cartTotal, p_profit: cartProfit, p_items: items,
    });
    setSubmitting(false);
    if (error) { setError(error.message); return; }
    setCart([]); setCustomer(""); setPayment("Cash");
    load(); refresh();
  };

  return (
    <div>
      <Header title="Sales / Point of Sale" subtitle="Search a product, add to cart, and complete the sale — stock updates instantly for everyone." />
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <div className="relative mb-3">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" color={C.gray} />
              <input className={inputCls} style={{ ...inputStyle, paddingLeft: 32 }} placeholder="Search product by model, brand, or manufacturer…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            {results.length > 0 && (
              <div className="space-y-1 mb-2">
                {results.map((p) => (
                  <button key={p.id} onClick={() => addToCart(p)} className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left hover:bg-gray-50" style={{ border: `1px solid ${C.line}` }}>
                    <span><span className="font-medium">{p.brand} {p.model}</span><span style={{ color: C.gray }} className="ml-2 text-xs">{p.quality} · {p.manufacturer} · {p.stock} in stock</span></span>
                    <span className="font-semibold">{naira(p.sell_price)}</span>
                  </button>
                ))}
              </div>
            )}
            {query && results.length === 0 && <EmptyNote text="No matching product." />}
          </Card>
          <Card style={{ padding: 0 }}>
            <div className="px-5 py-3 font-semibold text-sm" style={{ borderBottom: `1px solid ${C.line}` }}>Cart</div>
            {cartLines.length === 0 ? <EmptyNote text="Cart is empty — search above to add items." /> : (
              <table className="w-full text-sm">
                <tbody>
                  {cartLines.map((l) => (
                    <tr key={l.productId} style={{ borderTop: `1px solid ${C.line}` }}>
                      <td className="px-4 py-2.5">
                        <div className="font-medium">{l.product ? `${l.product.brand} ${l.product.model}` : l.productId}</div>
                        <div className="text-xs" style={{ color: C.gray }}>{l.product ? `${l.product.quality} · ${l.product.manufacturer}` : ""}</div>
                      </td>
                      <td className="px-2 py-2.5 w-20"><input type="number" min="1" value={l.qty} onChange={(e) => updateCartItem(l.productId, "qty", e.target.value)} className={inputCls} style={inputStyle} /></td>
                      <td className="px-2 py-2.5 w-28"><input type="number" min="0" value={l.discount} onChange={(e) => updateCartItem(l.productId, "discount", e.target.value)} className={inputCls} style={inputStyle} placeholder="Discount" /></td>
                      <td className="px-4 py-2.5 text-right font-semibold w-28">{naira(l.lineTotal)}</td>
                      <td className="px-2 py-2.5 w-8"><button onClick={() => removeFromCart(l.productId)}><Trash2 size={14} color={C.red} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
        <Card>
          <h3 className="font-semibold text-sm mb-4">Checkout</h3>
          <Field label="Payment Method">
            <select className={inputCls} style={inputStyle} value={payment} onChange={(e) => setPayment(e.target.value)}><option>Cash</option><option>Transfer</option></select>
          </Field>
          <Field label="Customer Name (optional)"><input className={inputCls} style={inputStyle} value={customer} onChange={(e) => setCustomer(e.target.value)} /></Field>
          <div className="flex justify-between text-sm py-2" style={{ borderTop: `1px solid ${C.line}` }}><span style={{ color: C.gray }}>Total</span><span className="font-bold text-base">{naira(cartTotal)}</span></div>
          {error && <p className="text-xs mb-2" style={{ color: C.red }}>{error}</p>}
          <Btn onClick={completeSale} disabled={cart.length === 0 || submitting}><Check size={16} /> {submitting ? "Saving…" : "Complete Sale"}</Btn>
        </Card>
      </div>
      <div className="mt-6">
        <h3 className="font-semibold text-sm mb-3">Recent Sales</h3>
        <Card style={{ padding: 0 }}>
          <table className="w-full text-sm">
            <thead><tr style={{ backgroundColor: C.navySoft }}>{["Date", "Customer", "Staff", "Payment", "Total"].map((h) => <th key={h} className="text-left px-4 py-2.5 font-semibold text-xs" style={{ color: C.navy }}>{h}</th>)}</tr></thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id} style={{ borderTop: `1px solid ${C.line}` }}>
                  <td className="px-4 py-2.5">{s.date}</td>
                  <td className="px-4 py-2.5">{s.customer || "—"}</td>
                  <td className="px-4 py-2.5">{s.staff_name || "—"}</td>
                  <td className="px-4 py-2.5"><Badge tone={s.payment === "Cash" ? "green" : "gray"}>{s.payment}</Badge></td>
                  <td className="px-4 py-2.5 font-semibold">{naira(s.total)}</td>
                </tr>
              ))}
              {sales.length === 0 && <tr><td colSpan={5}><EmptyNote text="No sales recorded yet." /></td></tr>}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   PURCHASES  (Owner/Manager only)
--------------------------------------------------------- */
function Purchases({ refresh, refreshKey }) {
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const empty = { date: todayISO(), supplier: "", productId: "", invoice: "", buyPrice: "", qty: "" };
  const [form, setForm] = useState(empty);

  const load = useCallback(async () => {
    const [pu, pr] = await Promise.all([
      supabase.from("purchases").select("*").order("date", { ascending: false }),
      supabase.from("products_view").select("*"),
    ]);
    setPurchases(pu.data || []);
    setProducts(pr.data || []);
  }, []);
  useEffect(() => { load(); }, [load, refreshKey]);

  const submit = async () => {
    setError("");
    if (!form.productId || !form.qty) return;
    const { error } = await supabase.rpc("log_purchase", {
      p_id: uid("PU"), p_date: form.date, p_supplier: form.supplier, p_product_id: form.productId,
      p_invoice: form.invoice, p_buy_price: Number(form.buyPrice) || 0, p_qty: Number(form.qty) || 0,
    });
    if (error) { setError(error.message); return; }
    setForm(empty); setShowForm(false);
    load(); refresh();
  };

  return (
    <div>
      <Header title="Purchases (Restock)" subtitle="Every purchase here increases stock automatically." action={<Btn onClick={() => setShowForm(true)}><Plus size={16} /> Log Purchase</Btn>} />
      <Card style={{ padding: 0 }}>
        <table className="w-full text-sm">
          <thead><tr style={{ backgroundColor: C.navySoft }}>{["Date", "Supplier", "Product", "Invoice #", "Buy Price", "Qty", "Total Cost"].map((h) => <th key={h} className="text-left px-4 py-2.5 font-semibold text-xs" style={{ color: C.navy }}>{h}</th>)}</tr></thead>
          <tbody>
            {purchases.map((p) => {
              const prod = products.find((pp) => pp.id === p.product_id);
              return (
                <tr key={p.id} style={{ borderTop: `1px solid ${C.line}` }}>
                  <td className="px-4 py-2.5">{p.date}</td>
                  <td className="px-4 py-2.5">{p.supplier}</td>
                  <td className="px-4 py-2.5">{prod ? `${prod.brand} ${prod.model} (${prod.manufacturer})` : p.product_id}</td>
                  <td className="px-4 py-2.5">{p.invoice}</td>
                  <td className="px-4 py-2.5">{naira(p.buy_price)}</td>
                  <td className="px-4 py-2.5">{p.qty}</td>
                  <td className="px-4 py-2.5 font-semibold">{naira(p.total_cost)}</td>
                </tr>
              );
            })}
            {purchases.length === 0 && <tr><td colSpan={7}><EmptyNote text="No purchases logged yet." /></td></tr>}
          </tbody>
        </table>
      </Card>
      {showForm && (
        <Modal title="Log Purchase" onClose={() => setShowForm(false)}>
          <Field label="Date"><input type="date" className={inputCls} style={inputStyle} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="Product">
            <select className={inputCls} style={inputStyle} value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
              <option value="">Select product…</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.brand} {p.model} — {p.quality} · {p.manufacturer}</option>)}
            </select>
          </Field>
          <Field label="Supplier"><input className={inputCls} style={inputStyle} value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} /></Field>
          <Field label="Invoice Number"><input className={inputCls} style={inputStyle} value={form.invoice} onChange={(e) => setForm({ ...form, invoice: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-x-4">
            <Field label="Buy Price (₦)"><input type="number" className={inputCls} style={inputStyle} value={form.buyPrice} onChange={(e) => setForm({ ...form, buyPrice: e.target.value })} /></Field>
            <Field label="Quantity"><input type="number" className={inputCls} style={inputStyle} value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} /></Field>
          </div>
          {error && <p className="text-xs mb-2" style={{ color: C.red }}>{error}</p>}
          <div className="flex justify-end gap-2 mt-2"><Btn variant="ghost" onClick={() => setShowForm(false)}>Cancel</Btn><Btn onClick={submit}><Check size={16} /> Save Purchase</Btn></div>
        </Modal>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   EXPENSES  (Owner/Manager only)
--------------------------------------------------------- */
const EXPENSE_CATEGORIES = ["Transport", "Salary", "Electricity", "Rent", "Internet", "Shop Maintenance", "Other"];

function Expenses({ refresh, refreshKey }) {
  const [expenses, setExpenses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const empty = { date: todayISO(), category: "Transport", description: "", amount: "", paidBy: "" };
  const [form, setForm] = useState(empty);

  const load = useCallback(async () => {
    const { data } = await supabase.from("expenses").select("*").order("date", { ascending: false });
    setExpenses(data || []);
  }, []);
  useEffect(() => { load(); }, [load, refreshKey]);

  const submit = async () => {
    if (!form.amount) return;
    await supabase.from("expenses").insert([{ id: uid("E"), date: form.date, category: form.category, description: form.description, amount: Number(form.amount) || 0, paid_by: form.paidBy }]);
    setForm(empty); setShowForm(false);
    load(); refresh();
  };

  const total = expenses.reduce((a, e) => a + Number(e.amount), 0);

  return (
    <div>
      <Header title="Expenses" subtitle="Log every running cost — feeds the Dashboard and Profit & Loss report." action={<Btn onClick={() => setShowForm(true)}><Plus size={16} /> Add Expense</Btn>} />
      <Card style={{ padding: 0 }}>
        <table className="w-full text-sm">
          <thead><tr style={{ backgroundColor: C.navySoft }}>{["Date", "Category", "Description", "Amount", "Paid By"].map((h) => <th key={h} className="text-left px-4 py-2.5 font-semibold text-xs" style={{ color: C.navy }}>{h}</th>)}</tr></thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id} style={{ borderTop: `1px solid ${C.line}` }}>
                <td className="px-4 py-2.5">{e.date}</td>
                <td className="px-4 py-2.5"><Badge tone="amber">{e.category}</Badge></td>
                <td className="px-4 py-2.5">{e.description}</td>
                <td className="px-4 py-2.5 font-semibold">{naira(e.amount)}</td>
                <td className="px-4 py-2.5">{e.paid_by}</td>
              </tr>
            ))}
            {expenses.length === 0 && <tr><td colSpan={5}><EmptyNote text="No expenses logged yet." /></td></tr>}
          </tbody>
          <tfoot><tr style={{ borderTop: `2px solid ${C.line}` }}><td className="px-4 py-2.5 font-semibold" colSpan={3}>Total</td><td className="px-4 py-2.5 font-bold">{naira(total)}</td><td></td></tr></tfoot>
        </table>
      </Card>
      {showForm && (
        <Modal title="Add Expense" onClose={() => setShowForm(false)}>
          <Field label="Date"><input type="date" className={inputCls} style={inputStyle} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="Category"><select className={inputCls} style={inputStyle} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Description"><input className={inputCls} style={inputStyle} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label="Amount (₦)"><input type="number" className={inputCls} style={inputStyle} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
          <Field label="Paid By"><input className={inputCls} style={inputStyle} value={form.paidBy} onChange={(e) => setForm({ ...form, paidBy: e.target.value })} /></Field>
          <div className="flex justify-end gap-2 mt-2"><Btn variant="ghost" onClick={() => setShowForm(false)}>Cancel</Btn><Btn onClick={submit}><Check size={16} /> Save Expense</Btn></div>
        </Modal>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   REPAIRS  (job cards — all roles can view/create/update)
--------------------------------------------------------- */
const REPAIR_STATUSES = ["Pending", "In Progress", "Completed", "Delivered"];

function Repairs({ isAdmin, profile, refresh, refreshKey }) {
  const [repairs, setRepairs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const empty = { date: todayISO(), customer: "", phone: "", phoneModel: "", fault: "", partsUsed: "", partsCost: "", technician: profile.role === "technician" ? profile.full_name : "", status: "Pending", amountCharged: "", amountPaid: "" };
  const [form, setForm] = useState(empty);

  const load = useCallback(async () => {
    const { data } = await supabase.from("repairs").select("*").order("date", { ascending: false });
    setRepairs(data || []);
  }, []);
  useEffect(() => { load(); }, [load, refreshKey]);

  const submit = async () => {
    if (!form.customer || !form.phoneModel) return;
    await supabase.from("repairs").insert([{
      id: uid("J"), date: form.date, customer: form.customer, phone: form.phone, phone_model: form.phoneModel,
      fault: form.fault, parts_used: form.partsUsed, parts_cost: Number(form.partsCost) || 0,
      technician: form.technician, status: form.status,
      amount_charged: Number(form.amountCharged) || 0, amount_paid: Number(form.amountPaid) || 0,
    }]);
    setForm(empty); setShowForm(false);
    load(); refresh();
  };

  const setStatus = async (id, status) => { await supabase.from("repairs").update({ status }).eq("id", id); load(); refresh(); };
  const deleteJob = async (id) => { await supabase.from("repairs").delete().eq("id", id); load(); refresh(); };

  const statusTone = { Pending: "amber", "In Progress": "gray", Completed: "green", Delivered: "green" };

  return (
    <div>
      <Header title="Repair Jobs" subtitle="Track every repair job card from intake to delivery." action={<Btn onClick={() => setShowForm(true)}><Plus size={16} /> New Job</Btn>} />
      <Card style={{ padding: 0 }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr style={{ backgroundColor: C.navySoft }}>{["Job #", "Date", "Customer", "Phone Model", "Fault", "Technician", "Status", "Charged", "Paid", "Balance", ""].map((h) => <th key={h} className="text-left px-4 py-2.5 font-semibold text-xs" style={{ color: C.navy }}>{h}</th>)}</tr></thead>
            <tbody>
              {repairs.map((r) => {
                const balance = r.amount_charged - r.amount_paid;
                return (
                  <tr key={r.id} style={{ borderTop: `1px solid ${C.line}` }}>
                    <td className="px-4 py-2.5 text-xs" style={{ color: C.gray }}>{r.id}</td>
                    <td className="px-4 py-2.5">{r.date}</td>
                    <td className="px-4 py-2.5">{r.customer}</td>
                    <td className="px-4 py-2.5">{r.phone_model}</td>
                    <td className="px-4 py-2.5">{r.fault}</td>
                    <td className="px-4 py-2.5">{r.technician}</td>
                    <td className="px-4 py-2.5">
                      <select value={r.status} onChange={(e) => setStatus(r.id, e.target.value)} className="text-xs font-semibold rounded-full px-2 py-1 border-none outline-none"
                        style={{ backgroundColor: statusTone[r.status] === "green" ? C.greenSoft : statusTone[r.status] === "amber" ? C.amberSoft : "#EEF0F4", color: statusTone[r.status] === "green" ? C.green : statusTone[r.status] === "amber" ? C.amber : C.gray }}>
                        {REPAIR_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-2.5">{naira(r.amount_charged)}</td>
                    <td className="px-4 py-2.5">{naira(r.amount_paid)}</td>
                    <td className="px-4 py-2.5 font-semibold">{balance > 0 ? <Badge tone="amber">{naira(balance)}</Badge> : <Badge tone="green">Paid</Badge>}</td>
                    <td className="px-4 py-2.5">{isAdmin && <button onClick={() => deleteJob(r.id)}><Trash2 size={14} color={C.red} /></button>}</td>
                  </tr>
                );
              })}
              {repairs.length === 0 && <tr><td colSpan={11}><EmptyNote text="No repair jobs logged yet." /></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
      {showForm && (
        <Modal title="New Repair Job" onClose={() => setShowForm(false)}>
          <div className="grid grid-cols-2 gap-x-4">
            <Field label="Date"><input type="date" className={inputCls} style={inputStyle} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
            <Field label="Technician"><input className={inputCls} style={inputStyle} value={form.technician} onChange={(e) => setForm({ ...form, technician: e.target.value })} /></Field>
            <Field label="Customer Name"><input className={inputCls} style={inputStyle} value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} /></Field>
            <Field label="Customer Phone"><input className={inputCls} style={inputStyle} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          </div>
          <Field label="Phone Model"><input className={inputCls} style={inputStyle} value={form.phoneModel} onChange={(e) => setForm({ ...form, phoneModel: e.target.value })} /></Field>
          <Field label="Fault"><input className={inputCls} style={inputStyle} value={form.fault} onChange={(e) => setForm({ ...form, fault: e.target.value })} /></Field>
          <Field label="Parts Used"><input className={inputCls} style={inputStyle} value={form.partsUsed} onChange={(e) => setForm({ ...form, partsUsed: e.target.value })} placeholder="e.g. Screen (FLYEAH)" /></Field>
          <div className="grid grid-cols-3 gap-x-3">
            <Field label="Parts Cost (₦)"><input type="number" className={inputCls} style={inputStyle} value={form.partsCost} onChange={(e) => setForm({ ...form, partsCost: e.target.value })} /></Field>
            <Field label="Amount Charged (₦)"><input type="number" className={inputCls} style={inputStyle} value={form.amountCharged} onChange={(e) => setForm({ ...form, amountCharged: e.target.value })} /></Field>
            <Field label="Amount Paid (₦)"><input type="number" className={inputCls} style={inputStyle} value={form.amountPaid} onChange={(e) => setForm({ ...form, amountPaid: e.target.value })} /></Field>
          </div>
          <div className="flex justify-end gap-2 mt-2"><Btn variant="ghost" onClick={() => setShowForm(false)}>Cancel</Btn><Btn onClick={submit}><Check size={16} /> Save Job</Btn></div>
        </Modal>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   DAILY STAFF SALES REPORT  (Owner/Manager only)
--------------------------------------------------------- */
function DailyStaffReport({ refreshKey }) {
  const [date, setDate] = useState(todayISO());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [profilesRes, salesRes, repairsRes] = await Promise.all([
        supabase.from("profiles").select("full_name, role").in("role", ["staff", "manager", "owner", "technician"]),
        supabase.from("sales_view").select("staff_name, total, profit").eq("date", date),
        supabase.from("repairs").select("technician, status").eq("date", date),
      ]);
      const staffList = (profilesRes.data || []);
      const sales = salesRes.data || [];
      const repairs = repairsRes.data || [];
      const result = staffList.map((s) => {
        const staffSales = sales.filter((x) => x.staff_name === s.full_name);
        const completedRepairs = repairs.filter((r) => r.technician === s.full_name && (r.status === "Completed" || r.status === "Delivered"));
        return {
          name: s.full_name,
          salesCount: staffSales.length,
          totalSales: staffSales.reduce((a, x) => a + Number(x.total), 0),
          profit: staffSales.reduce((a, x) => a + (Number(x.profit) || 0), 0),
          repairsCompleted: completedRepairs.length,
        };
      });
      setRows(result);
      setLoading(false);
    })();
  }, [date, refreshKey]);

  return (
    <div>
      <Header title="Daily Staff Sales Report" subtitle="Pick a date to see each staff member's performance that day." />
      <Card className="mb-5">
        <Field label="Report Date"><input type="date" className={inputCls} style={{ ...inputStyle, maxWidth: 220 }} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      </Card>
      <Card style={{ padding: 0 }}>
        <table className="w-full text-sm">
          <thead><tr style={{ backgroundColor: C.navySoft }}>{["Staff Name", "Sales Count", "Total Sales", "Profit Generated", "Repairs Completed"].map((h) => <th key={h} className="text-left px-4 py-2.5 font-semibold text-xs" style={{ color: C.navy }}>{h}</th>)}</tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={5}><EmptyNote text="Loading…" /></td></tr> : rows.map((r) => (
              <tr key={r.name} style={{ borderTop: `1px solid ${C.line}` }}>
                <td className="px-4 py-2.5 font-medium">{r.name}</td>
                <td className="px-4 py-2.5">{r.salesCount}</td>
                <td className="px-4 py-2.5 font-semibold">{naira(r.totalSales)}</td>
                <td className="px-4 py-2.5" style={{ color: C.green }}>{naira(r.profit)}</td>
                <td className="px-4 py-2.5">{r.repairsCompleted}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && <tr><td colSpan={5}><EmptyNote text="No staff profiles found yet." /></td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------
   REPORTS  (Owner/Manager only)
--------------------------------------------------------- */
function Reports({ refreshKey }) {
  const [from, setFrom] = useState(todayISO().slice(0, 8) + "01");
  const [to, setTo] = useState(todayISO());
  const [sales, setSales] = useState([]);
  const [repairs, setRepairs] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [s, r, e] = await Promise.all([
        supabase.from("sales_view").select("*"),
        supabase.from("repairs").select("*"),
        supabase.from("expenses").select("*"),
      ]);
      setSales(s.data || []); setRepairs(r.data || []); setExpenses(e.data || []);
      setLoading(false);
    })();
  }, [refreshKey]);

  const stats = useMemo(() => {
    const sum = (arr, f) => arr.reduce((a, x) => a + f(x), 0);
    const salesInRange = sales.filter((s) => withinRange(s.date, from, to));
    const repairsInRange = repairs.filter((r) => withinRange(r.date, from, to));
    const expensesInRange = expenses.filter((e) => withinRange(e.date, from, to));
    const revenue = sum(salesInRange, (s) => s.total);
    const grossProfit = sum(salesInRange, (s) => Number(s.profit) || 0);
    const repairIncome = sum(repairsInRange, (r) => Number(r.amount_charged));
    const repairCost = sum(repairsInRange, (r) => Number(r.parts_cost));
    const totalExpenses = sum(expensesInRange, (e) => Number(e.amount));
    const netProfit = grossProfit + repairIncome - repairCost - totalExpenses;

    const today = todayISO();
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + (weekStart.getDay() === 0 ? -6 : 1));
    const weekStartStr = weekStart.toISOString().slice(0, 10);
    const monthStart = today.slice(0, 7) + "-01";
    const yearStart = today.slice(0, 4) + "-01-01";
    const periodStat = (start, end) => {
      const s = sales.filter((x) => withinRange(x.date, start, end));
      return { sales: sum(s, (x) => x.total), profit: sum(s, (x) => Number(x.profit) || 0) };
    };
    return { revenue, grossProfit, repairIncome, repairCost, totalExpenses, netProfit,
      today: periodStat(today, today), week: periodStat(weekStartStr, today), month: periodStat(monthStart, today), year: periodStat(yearStart, today) };
  }, [sales, repairs, expenses, from, to]);

  if (loading) return <CenteredMessage text="Loading reports…" />;

  return (
    <div>
      <Header title="Reports & Profit / Loss" subtitle="Pick a date range for a full P&L, or scan the quick period summary below." />
      <Card className="mb-5">
        <div className="flex flex-wrap items-end gap-4">
          <Field label="From"><input type="date" className={inputCls} style={inputStyle} value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="To"><input type="date" className={inputCls} style={inputStyle} value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        </div>
      </Card>
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        {[["Today", stats.today], ["This Week", stats.week], ["This Month", stats.month], ["This Year", stats.year]].map(([label, s]) => (
          <Card key={label}>
            <div className="text-xs font-semibold mb-2" style={{ color: C.gray }}>{label}</div>
            <div className="text-lg font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{naira(s.sales)}</div>
            <div className="text-xs" style={{ color: C.green }}>{naira(s.profit)} profit</div>
          </Card>
        ))}
      </div>
      <Card>
        <h3 className="font-semibold text-sm mb-4">Profit &amp; Loss Statement (selected period)</h3>
        <div className="space-y-2 text-sm">
          <Row label="Sales Revenue" value={stats.revenue} />
          <Row label="Gross Profit from Sales" value={stats.grossProfit} />
          <Row label="Repair Income" value={stats.repairIncome} />
          <Row label="Repair Parts Cost" value={-stats.repairCost} negative />
          <Row label="Total Expenses" value={-stats.totalExpenses} negative />
          <div className="flex justify-between items-center pt-3 mt-2" style={{ borderTop: `2px solid ${C.line}` }}>
            <span className="font-bold">NET PROFIT</span>
            <span className="font-bold text-lg" style={{ color: stats.netProfit >= 0 ? C.green : C.red }}>{naira(stats.netProfit)}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Row({ label, value, negative }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span style={{ color: C.gray }}>{label}</span>
      <span className="font-semibold" style={{ color: negative ? C.red : C.ink }}>{negative ? "-" : ""}{naira(Math.abs(value))}</span>
    </div>
  );
            }
