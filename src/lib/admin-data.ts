import { type Bundle, type Order, type OrderStatus, pushNotification } from "./mock-data";
import { recordAudit } from "./audit";
import {
  fetchSupabaseBundles,
  upsertSupabaseBundle,
  deleteSupabaseBundle,
  updateSupabaseOrderStatus,
  fetchSupabaseProfiles,
  fetchSupabaseWithdrawals,
  createSupabaseWithdrawal,
  fetchSupabaseAvailableBalance,
  fetchSupabaseSettings,
  updateSupabaseSettings,
  fetchSupabaseAnalytics,
  fetchSupabaseOrders,
  updateSupabaseUserBalance,
  type SupabaseWithdrawal,
} from "./supabase-api";
import { supabase } from "./supabase";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
  status: "active" | "suspended";
  spent: number;
  orders: number;
  balance: number;
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return email.toLowerCase() === "admin@datahub.gghh";
}

export function ensureAdminUser(input: { name: string; email: string; phone?: string }): AdminUser {
  return {
    id: crypto.randomUUID(),
    name: input.name,
    email: input.email,
    phone: input.phone,
    createdAt: new Date().toISOString(),
    status: "active",
    spent: 0,
    orders: 0,
    balance: 5000.0,
  };
}

export const DEFAULT_USER_CATALOG: Bundle[] = [
  {
    id: "f1",
    network: "MTN",
    name: "Flash 1GB",
    gb: 1,
    price: 6,
    validity: "24 hours",
    group: "fast",
  },
  {
    id: "f2",
    network: "MTN",
    name: "Flash 2GB",
    gb: 2,
    price: 11,
    validity: "24 hours",
    group: "fast",
    popular: true,
  },
  {
    id: "f3",
    network: "MTN",
    name: "Flash 3GB",
    gb: 3,
    price: 15,
    validity: "24 hours",
    group: "fast",
  },
  {
    id: "f4",
    network: "MTN",
    name: "Flash 5GB",
    gb: 5,
    price: 25,
    validity: "7 days",
    group: "fast",
  },
  {
    id: "s1",
    network: "MTN",
    name: "Value 5GB",
    gb: 5,
    price: 22,
    validity: "7 days",
    group: "slow",
  },
  {
    id: "s2",
    network: "MTN",
    name: "Value 10GB",
    gb: 10,
    price: 42,
    validity: "7 days",
    group: "slow",
  },
  {
    id: "s3",
    network: "MTN",
    name: "Value 15GB",
    gb: 15,
    price: 62,
    validity: "30 days",
    group: "slow",
  },
  {
    id: "s4",
    network: "MTN",
    name: "Value 20GB",
    gb: 20,
    price: 80,
    validity: "30 days",
    group: "slow",
    popular: true,
  },
  {
    id: "s5",
    network: "MTN",
    name: "Value 30GB",
    gb: 30,
    price: 118,
    validity: "30 days",
    group: "slow",
  },
  {
    id: "s6",
    network: "MTN",
    name: "Value 50GB",
    gb: 50,
    price: 185,
    validity: "30 days",
    group: "slow",
  },
  {
    id: "s7",
    network: "MTN",
    name: "Value 100GB",
    gb: 100,
    price: 335,
    validity: "30 days",
    group: "slow",
  },
  {
    id: "s8",
    network: "MTN",
    name: "Value 200GB",
    gb: 200,
    price: 610,
    validity: "60 days",
    group: "slow",
  },
  {
    id: "s9",
    network: "MTN",
    name: "Value 300GB",
    gb: 300,
    price: 870,
    validity: "90 days",
    group: "slow",
  },
];

export async function loadBundles(): Promise<Bundle[]> {
  const bundles = await fetchSupabaseBundles();
  if (bundles.length === 0) {
    return DEFAULT_USER_CATALOG;
  }
  return bundles;
}

export async function upsertBundle(b: Bundle): Promise<void> {
  await upsertSupabaseBundle(b);
  recordAudit(
    "bundle",
    "Bundle upserted",
    `${b.name} • ${b.gb}GB • GHS ${b.price} • ${b.group === "slow" ? "1hr – 2hr delivery" : "Fast delivery"}`,
  );
}

export async function deleteBundle(id: string): Promise<void> {
  await deleteSupabaseBundle(id);
  recordAudit("bundle", "Bundle deleted", id);
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<void> {
  await updateSupabaseOrderStatus(id, status);
  await pushNotification({
    title: `Order Status Updated`,
    message: `Order status changed to ${status}.`,
    createdAt: new Date().toISOString(),
    read: false,
    type: "order",
    audience: "all",
  });
  recordAudit("user", `Order marked ${status}`, id);
}

export async function loadUsers(): Promise<AdminUser[]> {
  const [profiles, orders] = await Promise.all([fetchSupabaseProfiles(), fetchSupabaseOrders()]);

  return profiles.map((p) => {
    // Filter orders belonging to this user
    const userOrders = orders.filter(
      (o) => o.recipient.replace(/\s+/g, "") === (p.phone ?? "").replace(/\s+/g, ""),
    );
    const completedOrders = userOrders.filter((o) => o.status === "completed");
    const spent = completedOrders.reduce((sum, o) => sum + Number(o.amount), 0);

    return {
      id: p.id,
      name: p.name,
      email: p.email,
      phone: p.phone,
      createdAt: p.created_at,
      status: p.role === "suspended" ? "suspended" : "active",
      spent,
      orders: userOrders.length,
      balance: Number(p.balance ?? 0),
    };
  });
}

export async function toggleUserStatus(id: string): Promise<void> {
  const { data: profile, error: getError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", id)
    .single();

  if (getError) {
    console.error("Error fetching user profile to toggle status:", getError);
    throw getError;
  }

  const newRole = profile?.role === "suspended" ? "customer" : "suspended";

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ role: newRole })
    .eq("id", id);

  if (updateError) {
    console.error("Error updating user status in profiles:", updateError);
    throw updateError;
  }

  recordAudit(
    "user",
    `User status toggled to ${newRole === "suspended" ? "Suspended" : "Active"}`,
    id,
  );
}

export async function updateUserBalance(
  id: string,
  balance: number,
  reason?: string,
): Promise<void> {
  const { data: userProfile } = await supabase
    .from("profiles")
    .select("balance")
    .eq("id", id)
    .single();
  const oldBalance = Number(userProfile?.balance ?? 0);
  const diff = balance - oldBalance;

  await updateSupabaseUserBalance(id, balance);

  if (diff !== 0) {
    const { createSupabaseTransaction } = await import("./supabase-api");
    await createSupabaseTransaction({
      userId: id,
      type: diff > 0 ? "credit" : "debit",
      title: reason || (diff > 0 ? "Admin wallet top-up" : "Admin wallet deduction"),
      amount: Math.abs(diff),
      balanceAfter: balance,
      reference: `ADJ-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    });
  }

  recordAudit(
    "user",
    `Allocated wallet balance: GHS ${balance.toFixed(2)}${reason ? ` (${reason})` : ""}`,
    id,
  );
}

export async function bulkUpdateOrders(ids: string[], status: OrderStatus): Promise<void> {
  const { bulkUpdateSupabaseOrderStatus } = await import("./supabase-api");
  await bulkUpdateSupabaseOrderStatus(ids, status);
  for (const id of ids) {
    recordAudit("user", `Order ${id} bulk marked ${status}`, id);
  }
}

export async function loadUserBundles(userId: string): Promise<Bundle[]> {
  const { fetchSupabaseUserBundles } = await import("./supabase-api");
  return await fetchSupabaseUserBundles(userId);
}

export async function saveUserBundles(userId: string, bundles: Bundle[]): Promise<void> {
  const { upsertSupabaseUserBundle } = await import("./supabase-api");
  for (const b of bundles) {
    await upsertSupabaseUserBundle(userId, b);
  }
}

export async function upsertUserBundle(userId: string, b: Bundle): Promise<void> {
  const { upsertSupabaseUserBundle } = await import("./supabase-api");
  await upsertSupabaseUserBundle(userId, b);
  recordAudit("bundle", `User bundle updated: ${b.name} (${b.gb}GB for GHS ${b.price})`, userId);
}

export async function deleteUserBundle(userId: string, bundleId: string): Promise<void> {
  const { deleteSupabaseUserBundle } = await import("./supabase-api");
  await deleteSupabaseUserBundle(userId, bundleId);
  recordAudit("bundle", `User bundle deleted: ${bundleId}`, userId);
}

export async function resetUserBundles(userId: string): Promise<void> {
  const { resetSupabaseUserBundles: resetAPI } = await import("./supabase-api");
  await resetAPI(userId);
  recordAudit("bundle", `Reset user bundles to global default`, userId);
}

export function loadUserSlowEnabled(userId: string): boolean {
  try {
    const raw = localStorage.getItem(`datahub-user-slow-${userId}`);
    if (raw !== null) return raw === "true";
  } catch {}
  return true;
}

export function setUserSlowEnabled(userId: string, enabled: boolean): void {
  try {
    localStorage.setItem(`datahub-user-slow-${userId}`, String(enabled));
    window.dispatchEvent(new CustomEvent("dataflex:catalog-changed"));
  } catch {}
  recordAudit("user", `User 1-2hr delivery ${enabled ? "enabled" : "disabled"}`, userId);
}

export async function broadcast(title: string, message: string): Promise<void> {
  await pushNotification({
    title,
    message,
    createdAt: new Date().toISOString(),
    read: false,
    type: "announcement",
    audience: "all",
  });
}

export interface Analytics {
  revenue: number;
  totalRevenue: number;
  completed: number;
  completedOrders: number;
  orders: number;
  totalOrders: number;
  gbSold: number;
  activeCustomers: number;
  growth: number;
  days: { date: string; revenue: number; orders: number }[];
  topBundles: { name: string; count: number; revenue: number }[];
}

export function computeAnalytics(orders: Order[] = [], users: AdminUser[] = []): Analytics {
  const completed = orders.filter((o) => o.status === "completed");
  const revenue = completed.reduce((sum, o) => sum + o.amount, 0);
  const gbSold = completed.reduce((sum, o) => sum + (o.gb || 0), 0);

  return {
    revenue,
    totalRevenue: revenue,
    completed: completed.length,
    completedOrders: completed.length,
    orders: orders.length,
    totalOrders: orders.length,
    gbSold,
    activeCustomers: users.length,
    growth: 12.5,
    // These are placeholders; use fetchSupabaseAnalytics() for real chart data
    days: [
      { date: "Mon", revenue: 0, orders: 0 },
      { date: "Tue", revenue: 0, orders: 0 },
      { date: "Wed", revenue: 0, orders: 0 },
      { date: "Thu", revenue: 0, orders: 0 },
      { date: "Fri", revenue: 0, orders: 0 },
      { date: "Sat", revenue: 0, orders: 0 },
      { date: "Sun", revenue: 0, orders: 0 },
    ],
    topBundles: [],
  };
}

// Re-export Supabase analytics loader for admin dashboard
export { fetchSupabaseAnalytics };

// ----------------------------------------------------
// WITHDRAWALS (fully Supabase-backed)
// ----------------------------------------------------

export type Withdrawal = SupabaseWithdrawal;

export async function availableBalance(_orders?: Order[]): Promise<number> {
  return await fetchSupabaseAvailableBalance();
}

export async function loadWithdrawals(): Promise<Withdrawal[]> {
  return await fetchSupabaseWithdrawals();
}

export async function recordWithdrawal(params: {
  amount: number;
  account: string;
  destination?: string;
  network: string;
  adminId?: string;
}): Promise<Withdrawal> {
  const w = await createSupabaseWithdrawal(params);
  recordAudit("security", `Withdrawal of GHS ${params.amount} to ${params.account}`);
  return w;
}

// ----------------------------------------------------
// SETTINGS (fully Supabase-backed)
// ----------------------------------------------------

export interface SystemSettings {
  storeName: string;
  supportEmail: string;
  supportPhone: string;
  momoNumber: string;
  autoApprove: boolean;
  maintenance: boolean;
  maintenanceMode: boolean;
  minWithdrawal: number;
}

export type AdminSettings = SystemSettings;

export async function loadSettings(): Promise<SystemSettings> {
  return await fetchSupabaseSettings();
}

export async function saveSettings(s: Partial<SystemSettings>): Promise<SystemSettings> {
  return await updateSupabaseSettings(s);
}
