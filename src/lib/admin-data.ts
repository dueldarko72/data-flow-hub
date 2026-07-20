import { BUNDLES, type Bundle, loadOrders, saveOrders, type Order, type OrderStatus, pushNotification } from "./mock-data";

const BUNDLES_KEY = "datahub-bundles";
const USERS_KEY = "datahub-admin-users";
const SETTINGS_KEY = "datahub-admin-settings";

export function loadBundles(): Bundle[] {
  try {
    const raw = localStorage.getItem(BUNDLES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  saveBundles(BUNDLES);
  return BUNDLES;
}

export function saveBundles(b: Bundle[]) {
  try {
    localStorage.setItem(BUNDLES_KEY, JSON.stringify(b));
  } catch {}
}

export function upsertBundle(b: Bundle) {
  const all = loadBundles();
  const i = all.findIndex((x) => x.id === b.id);
  if (i >= 0) all[i] = b;
  else all.unshift(b);
  saveBundles(all);
}

export function deleteBundle(id: string) {
  saveBundles(loadBundles().filter((b) => b.id !== id));
}

export function updateOrderStatus(id: string, status: OrderStatus) {
  const orders = loadOrders();
  const i = orders.findIndex((o) => o.id === id);
  if (i < 0) return;
  orders[i] = { ...orders[i], status };
  saveOrders(orders);
  pushNotification({
    id: crypto.randomUUID(),
    title: `Order ${orders[i].reference} ${status}`,
    message: `${orders[i].bundleName} → ${orders[i].recipient} marked ${status}.`,
    createdAt: new Date().toISOString(),
    read: false,
    type: "order",
  });
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
  status: "active" | "suspended";
  spent: number;
  orders: number;
}

export function loadUsers(): AdminUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const seed: AdminUser[] = [
    { id: crypto.randomUUID(), name: "Ama Boateng", email: "ama@example.com", phone: "0244000111", createdAt: new Date(Date.now() - 86400000 * 12).toISOString(), status: "active", spent: 320, orders: 7 },
    { id: crypto.randomUUID(), name: "Kwame Mensah", email: "kwame@example.com", phone: "0209988776", createdAt: new Date(Date.now() - 86400000 * 40).toISOString(), status: "active", spent: 890, orders: 22 },
    { id: crypto.randomUUID(), name: "Akosua Owusu", email: "akosua@example.com", phone: "0277112233", createdAt: new Date(Date.now() - 86400000 * 3).toISOString(), status: "active", spent: 45, orders: 2 },
    { id: crypto.randomUUID(), name: "Yaw Asante", email: "yaw@example.com", phone: "0501122334", createdAt: new Date(Date.now() - 86400000 * 80).toISOString(), status: "suspended", spent: 1250, orders: 34 },
    { id: crypto.randomUUID(), name: "Efua Sarpong", email: "efua@example.com", phone: "0244778899", createdAt: new Date(Date.now() - 86400000 * 1).toISOString(), status: "active", spent: 0, orders: 0 },
  ];
  saveUsers(seed);
  return seed;
}

export function saveUsers(u: AdminUser[]) {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(u));
  } catch {}
}

export function toggleUserStatus(id: string) {
  const u = loadUsers();
  const i = u.findIndex((x) => x.id === id);
  if (i < 0) return;
  u[i] = { ...u[i], status: u[i].status === "active" ? "suspended" : "active" };
  saveUsers(u);
}

export interface AdminSettings {
  storeName: string;
  supportEmail: string;
  supportPhone: string;
  momoNumber: string;
  autoApprove: boolean;
  maintenance: boolean;
}

const DEFAULT_SETTINGS: AdminSettings = {
  storeName: "DataHub",
  supportEmail: "support@datahub.gh",
  supportPhone: "+233 24 000 0000",
  momoNumber: "0244000000",
  autoApprove: false,
  maintenance: false,
};

export function loadSettings(): AdminSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_SETTINGS;
}

export function saveSettings(s: AdminSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {}
}

export function isAdminEmail(email?: string | null) {
  if (!email) return false;
  return email.toLowerCase().includes("admin");
}

export function broadcast(title: string, message: string) {
  pushNotification({
    id: crypto.randomUUID(),
    title,
    message,
    createdAt: new Date().toISOString(),
    read: false,
    type: "announcement",
  });
}

export function computeAnalytics(orders: Order[]) {
  const completed = orders.filter((o) => o.status === "completed");
  const revenue = completed.reduce((s, o) => s + o.amount, 0);
  const gbSold = completed.reduce((s, o) => s + o.gb, 0);
  // Last 7 days revenue series
  const days: { date: string; revenue: number; orders: number }[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    const dayOrders = orders.filter((o) => {
      const t = new Date(o.createdAt).getTime();
      return t >= d.getTime() && t < next.getTime();
    });
    days.push({
      date: d.toLocaleDateString("en", { weekday: "short" }),
      revenue: dayOrders.filter((o) => o.status === "completed").reduce((s, o) => s + o.amount, 0),
      orders: dayOrders.length,
    });
  }
  // Bundle breakdown
  const bundleMap = new Map<string, { name: string; count: number; revenue: number }>();
  for (const o of completed) {
    const cur = bundleMap.get(o.bundleName) ?? { name: o.bundleName, count: 0, revenue: 0 };
    cur.count += 1;
    cur.revenue += o.amount;
    bundleMap.set(o.bundleName, cur);
  }
  const topBundles = [...bundleMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  return { revenue, gbSold, completed: completed.length, days, topBundles };
}
