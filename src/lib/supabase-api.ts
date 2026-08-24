import { supabase } from "./supabase";
import type { Bundle, Order, AppNotification } from "./mock-data";

export interface SupabaseProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  balance: number;
  role: "customer" | "admin" | "suspended";
  created_at: string;
  updated_at?: string;
}

// ----------------------------------------------------
// BUNDLES (Catalog)
// ----------------------------------------------------

export async function fetchSupabaseBundles(): Promise<Bundle[]> {
  const { data, error } = await supabase
    .from("bundles")
    .select("*")
    .order("gb", { ascending: true });

  if (error) {
    console.error("Error fetching bundles from Supabase:", error);
    return [];
  }

  return (data || []).map((b) => ({
    id: b.id,
    network: b.network,
    name: b.name,
    gb: Number(b.gb),
    price: Number(b.price),
    validity: b.validity,
    popular: Boolean(b.popular),
    description: b.description || undefined,
    group: b.group_type as "fast" | "slow",
  }));
}

export async function upsertSupabaseBundle(bundle: Bundle): Promise<void> {
  const { error } = await supabase.from("bundles").upsert({
    id: bundle.id,
    network: bundle.network,
    name: bundle.name,
    gb: bundle.gb,
    price: bundle.price,
    validity: bundle.validity,
    popular: bundle.popular || false,
    description: bundle.description || null,
    group_type: bundle.group || "fast",
  });

  if (error) {
    console.error("Error saving bundle in Supabase:", error);
    throw error;
  }
}

export async function deleteSupabaseBundle(id: string): Promise<void> {
  const { error } = await supabase.from("bundles").delete().eq("id", id);
  if (error) {
    console.error("Error deleting bundle in Supabase:", error);
    throw error;
  }
}

// ----------------------------------------------------
// USER BUNDLES (Per-Customer Catalog)
// ----------------------------------------------------

export async function fetchSupabaseUserBundles(userId: string): Promise<Bundle[]> {
  // 1. Fetch latest global slow (1hr - 2hr delivery) bundles from Supabase
  const globalBundles = await fetchSupabaseBundles();
  const globalSlowBundles = globalBundles.filter((b) => b.group === "slow");
  const globalFastBundles = globalBundles.filter((b) => b.group !== "slow");

  if (!userId || userId === "guest") {
    return globalBundles;
  }

  try {
    // 2. Fetch custom user bundles for this specific user from user_bundles table
    const { data, error } = await supabase
      .from("user_bundles")
      .select("*")
      .eq("user_id", userId)
      .order("gb", { ascending: true });

    if (!error && data && data.length > 0) {
      const userFastBundles: Bundle[] = data.map((b) => ({
        id: b.id,
        network: b.network,
        name: b.name,
        gb: Number(b.gb),
        price: Number(b.price),
        validity: b.validity,
        popular: Boolean(b.popular),
        description: b.description || undefined,
        group: (b.group_type || "fast") as "fast" | "slow",
      }));

      // Merge: User custom fast bundles + Global 1hr-2hr delivery bundles (which auto-reflect admin changes!)
      return [...userFastBundles, ...globalSlowBundles];
    }
  } catch (e) {
    console.error("Error querying user_bundles table:", e);
  }

  // 3. Fallback to localStorage per-user catalog if present
  try {
    const raw = localStorage.getItem(`datahub-user-bundles-${userId}`);
    if (raw) {
      const parsed: Bundle[] = JSON.parse(raw);
      const userFast = parsed.filter((b) => b.group !== "slow");
      if (userFast.length > 0) {
        return [...userFast, ...globalSlowBundles];
      }
    }
  } catch {}

  // 4. Default: all global bundles
  return [...globalFastBundles, ...globalSlowBundles];
}

export async function upsertSupabaseUserBundle(userId: string, bundle: Bundle): Promise<void> {
  try {
    await supabase.from("user_bundles").upsert({
      id: bundle.id,
      user_id: userId,
      network: bundle.network,
      name: bundle.name,
      gb: bundle.gb,
      price: bundle.price,
      validity: bundle.validity,
      popular: bundle.popular || false,
      description: bundle.description || null,
      group_type: bundle.group || "fast",
    });
  } catch (e) {
    console.error("Failed to upsert to user_bundles table:", e);
  }

  try {
    const raw = localStorage.getItem(`datahub-user-bundles-${userId}`);
    const existing: Bundle[] = raw ? JSON.parse(raw) : [];
    const idx = existing.findIndex((b) => b.id === bundle.id);
    if (idx >= 0) existing[idx] = bundle;
    else existing.push(bundle);
    localStorage.setItem(`datahub-user-bundles-${userId}`, JSON.stringify(existing));
    window.dispatchEvent(new CustomEvent("dataflex:catalog-changed"));
  } catch {}
}

export async function deleteSupabaseUserBundle(userId: string, bundleId: string): Promise<void> {
  try {
    await supabase.from("user_bundles").delete().eq("user_id", userId).eq("id", bundleId);
  } catch (e) {
    console.error("Failed to delete from user_bundles table:", e);
  }

  try {
    const raw = localStorage.getItem(`datahub-user-bundles-${userId}`);
    if (raw) {
      const existing: Bundle[] = JSON.parse(raw);
      const filtered = existing.filter((b) => b.id !== bundleId);
      localStorage.setItem(`datahub-user-bundles-${userId}`, JSON.stringify(filtered));
      window.dispatchEvent(new CustomEvent("dataflex:catalog-changed"));
    }
  } catch {}
}

export async function resetSupabaseUserBundles(userId: string): Promise<void> {
  try {
    await supabase.from("user_bundles").delete().eq("user_id", userId);
  } catch (e) {
    console.error("Failed to reset user_bundles table:", e);
  }

  try {
    localStorage.removeItem(`datahub-user-bundles-${userId}`);
    window.dispatchEvent(new CustomEvent("dataflex:catalog-changed"));
  } catch {}
}

// ----------------------------------------------------
// ORDERS
// ----------------------------------------------------

export async function fetchSupabaseOrders(userId?: string): Promise<Order[]> {
  let query = supabase.from("orders").select("*").order("created_at", { ascending: false });

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching orders from Supabase:", error);
    return [];
  }

  return (data || []).map((o) => ({
    id: o.id,
    reference: o.reference,
    bundleId: o.bundle_id || "",
    bundleName: o.bundle_name,
    network: o.network,
    gb: Number(o.gb),
    amount: Number(o.amount),
    recipient: o.recipient,
    status: o.status,
    createdAt: o.created_at,
    paymentMethod: o.payment_method || "MTN MoMo",
    group: o.group_type as "fast" | "slow",
  }));
}

export async function createSupabaseOrder(order: Order, userId: string): Promise<Order> {
  const { data, error } = await supabase
    .from("orders")
    .insert({
      user_id: userId,
      reference: order.reference,
      bundle_id: order.bundleId,
      bundle_name: order.bundleName,
      network: order.network,
      gb: order.gb,
      amount: order.amount,
      recipient: order.recipient,
      status: order.status,
      payment_method: order.paymentMethod,
      group_type: order.group || "fast",
      created_at: order.createdAt || new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating order in Supabase:", error);
    throw error;
  }

  return {
    id: data.id,
    reference: data.reference,
    bundleId: data.bundle_id || "",
    bundleName: data.bundle_name,
    network: data.network,
    gb: Number(data.gb),
    amount: Number(data.amount),
    recipient: data.recipient,
    status: data.status,
    createdAt: data.created_at,
    paymentMethod: data.payment_method,
    group: data.group_type as "fast" | "slow",
  };
}

export async function updateSupabaseOrderStatus(
  orderId: string,
  status: Order["status"],
): Promise<void> {
  const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);

  if (error) {
    console.error("Error updating order status in Supabase:", error);
    throw error;
  }
}

export async function bulkUpdateSupabaseOrderStatus(
  orderIds: string[],
  status: Order["status"],
): Promise<void> {
  if (orderIds.length === 0) return;
  const { error } = await supabase.from("orders").update({ status }).in("id", orderIds);

  if (error) {
    console.error("Error bulk updating orders in Supabase:", error);
    throw error;
  }
}

// ----------------------------------------------------
// TRANSACTIONS & WALLET
// ----------------------------------------------------

export async function createSupabaseTransaction(params: {
  userId: string;
  type: "credit" | "debit";
  title: string;
  amount: number;
  balanceAfter?: number;
  reference: string;
}): Promise<void> {
  const { error } = await supabase.from("transactions").insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    amount: params.amount,
    balance_after: params.balanceAfter,
    reference: params.reference,
    status: "success",
  });

  if (error) {
    console.error("Error creating transaction in Supabase:", error);
  }
}

export async function updateSupabaseUserBalance(userId: string, newBalance: number): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) {
    console.error("Error updating user balance in Supabase:", error);
    throw error;
  }
}

// ----------------------------------------------------
// NOTIFICATIONS
// ----------------------------------------------------

export async function fetchSupabaseNotifications(userId?: string): Promise<AppNotification[]> {
  let query = supabase.from("notifications").select("*").order("created_at", { ascending: false });

  if (userId) {
    query = query.or(`user_id.eq.${userId},audience.eq.all,audience.eq.customer`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching notifications from Supabase:", error);
    return [];
  }

  return (data || []).map((n) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    createdAt: n.created_at,
    read: n.read,
    type: n.type,
    audience: n.audience,
  }));
}

export async function createSupabaseNotification(
  n: Omit<AppNotification, "id"> & { userId?: string },
): Promise<void> {
  const { error } = await supabase.from("notifications").insert({
    user_id: n.userId || null,
    title: n.title,
    message: n.message,
    type: n.type,
    audience: n.audience || "customer",
    read: n.read || false,
    created_at: n.createdAt || new Date().toISOString(),
  });

  if (error) {
    console.error("Error creating notification in Supabase:", error);
  }
}

export async function markSupabaseNotificationRead(id: string): Promise<void> {
  const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);

  if (error) {
    console.error("Error marking notification read in Supabase:", error);
  }
}

export async function deleteSupabaseNotification(id: string): Promise<void> {
  const { error } = await supabase.from("notifications").delete().eq("id", id);

  if (error) {
    console.error("Error deleting notification in Supabase:", error);
  }
}

export async function clearSupabaseReadNotifications(): Promise<void> {
  const { error } = await supabase.from("notifications").delete().eq("read", true);

  if (error) {
    console.error("Error clearing read notifications in Supabase:", error);
  }
}

export interface SupabaseTransaction {
  id: string;
  user_id: string;
  type: "credit" | "debit";
  title: string;
  amount: number;
  balance_after?: number;
  reference: string;
  status: string;
  created_at: string;
}

export async function fetchSupabaseTransactions(userId?: string): Promise<SupabaseTransaction[]> {
  let query = supabase.from("transactions").select("*").order("created_at", { ascending: false });
  if (userId) {
    query = query.eq("user_id", userId);
  }
  const { data, error } = await query;
  if (error) {
    console.error("Error fetching transactions:", error);
    return [];
  }
  return data || [];
}

// ----------------------------------------------------
// PROFILES / USER MANAGEMENT
// ----------------------------------------------------

export async function fetchSupabaseProfiles(): Promise<SupabaseProfile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching profiles from Supabase:", error);
    return [];
  }

  return (data || []).map((p) => ({
    id: p.id,
    name: p.name,
    email: p.email,
    phone: p.phone || undefined,
    avatar_url: p.avatar_url || undefined,
    balance: Number(p.balance ?? 0),
    role: p.role || "customer",
    created_at: p.created_at,
    updated_at: p.updated_at,
  }));
}

// ----------------------------------------------------
// WITHDRAWALS
// ----------------------------------------------------

export interface SupabaseWithdrawal {
  id: string;
  amount: number;
  account: string;
  destination?: string;
  network: string;
  status: "pending" | "completed" | "rejected";
  createdAt: string;
}

export async function fetchSupabaseWithdrawals(): Promise<SupabaseWithdrawal[]> {
  const { data, error } = await supabase
    .from("withdrawals")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching withdrawals from Supabase:", error);
    return [];
  }

  return (data || []).map((w) => ({
    id: w.id,
    amount: Number(w.amount),
    account: w.account,
    destination: w.destination || w.account,
    network: w.network || "MTN",
    status: w.status as "pending" | "completed" | "rejected",
    createdAt: w.created_at,
  }));
}

export async function createSupabaseWithdrawal(params: {
  amount: number;
  account: string;
  destination?: string;
  network: string;
  adminId?: string;
}): Promise<SupabaseWithdrawal> {
  const { data, error } = await supabase
    .from("withdrawals")
    .insert({
      amount: params.amount,
      account: params.account,
      destination: params.destination || params.account,
      network: params.network,
      status: "pending",
      admin_id: params.adminId || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating withdrawal in Supabase:", error);
    throw error;
  }

  return {
    id: data.id,
    amount: Number(data.amount),
    account: data.account,
    destination: data.destination || data.account,
    network: data.network,
    status: data.status,
    createdAt: data.created_at,
  };
}

// Compute available balance = sum of completed order amounts - sum of withdrawals
export async function fetchSupabaseAvailableBalance(): Promise<number> {
  const [ordersResult, withdrawalsResult] = await Promise.all([
    supabase.from("orders").select("amount").eq("status", "completed"),
    supabase.from("withdrawals").select("amount").eq("status", "completed"),
  ]);

  const totalRevenue = (ordersResult.data || []).reduce((sum, o) => sum + Number(o.amount), 0);
  const totalWithdrawn = (withdrawalsResult.data || []).reduce(
    (sum, w) => sum + Number(w.amount),
    0,
  );

  return Math.max(0, totalRevenue - totalWithdrawn);
}

// ----------------------------------------------------
// SETTINGS
// ----------------------------------------------------

export interface SupabaseSettings {
  storeName: string;
  supportEmail: string;
  supportPhone: string;
  momoNumber: string;
  autoApprove: boolean;
  maintenance: boolean;
  maintenanceMode: boolean;
  minWithdrawal: number;
}

const DEFAULT_SETTINGS: SupabaseSettings = {
  storeName: "DataFlex",
  supportEmail: "support@dataflex.gh",
  supportPhone: "0244000111",
  momoNumber: "0244000111",
  autoApprove: true,
  maintenance: false,
  maintenanceMode: false,
  minWithdrawal: 10,
};

export async function fetchSupabaseSettings(): Promise<SupabaseSettings> {
  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .eq("id", "global")
    .maybeSingle();

  if (error || !data) {
    console.error("Error fetching settings from Supabase:", error);
    return DEFAULT_SETTINGS;
  }

  return {
    storeName: data.store_name || DEFAULT_SETTINGS.storeName,
    supportEmail: data.support_email || DEFAULT_SETTINGS.supportEmail,
    supportPhone: data.support_phone || DEFAULT_SETTINGS.supportPhone,
    momoNumber: data.momo_number || DEFAULT_SETTINGS.momoNumber,
    autoApprove: Boolean(data.auto_approve ?? true),
    maintenance: Boolean(data.maintenance ?? false),
    maintenanceMode: Boolean(data.maintenance ?? false),
    minWithdrawal: Number(data.min_withdrawal ?? 10),
  };
}

export async function updateSupabaseSettings(
  s: Partial<SupabaseSettings>,
): Promise<SupabaseSettings> {
  const { data, error } = await supabase
    .from("settings")
    .upsert({
      id: "global",
      store_name: s.storeName,
      support_email: s.supportEmail,
      support_phone: s.supportPhone,
      momo_number: s.momoNumber,
      auto_approve: s.autoApprove,
      maintenance: s.maintenance ?? s.maintenanceMode,
      min_withdrawal: s.minWithdrawal,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error || !data) {
    console.error("Error updating settings in Supabase:", error);
    return DEFAULT_SETTINGS;
  }

  return {
    storeName: data.store_name,
    supportEmail: data.support_email,
    supportPhone: data.support_phone,
    momoNumber: data.momo_number,
    autoApprove: Boolean(data.auto_approve),
    maintenance: Boolean(data.maintenance),
    maintenanceMode: Boolean(data.maintenance),
    minWithdrawal: Number(data.min_withdrawal),
  };
}

// ----------------------------------------------------
// ANALYTICS (computed from real Supabase data)
// ----------------------------------------------------

export interface DayStats {
  date: string;
  revenue: number;
  orders: number;
}

export interface BundleStats {
  name: string;
  count: number;
  revenue: number;
}

export async function fetchSupabaseAnalytics(): Promise<{
  days: DayStats[];
  topBundles: BundleStats[];
}> {
  // Fetch last 7 days of completed orders
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const { data: recentOrders, error } = await supabase
    .from("orders")
    .select("amount, bundle_name, created_at, status, gb")
    .gte("created_at", sevenDaysAgo.toISOString())
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching analytics from Supabase:", error);
    return { days: [], topBundles: [] };
  }

  const orders = recentOrders || [];

  // Build last-7-days array
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const daysMap: Record<string, DayStats> = {};

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = dayLabels[d.getDay()];
    daysMap[key] = { date: label, revenue: 0, orders: 0 };
  }

  for (const o of orders) {
    if (o.status !== "completed") continue;
    const key = new Date(o.created_at).toISOString().slice(0, 10);
    if (daysMap[key]) {
      daysMap[key].revenue += Number(o.amount);
      daysMap[key].orders += 1;
    }
  }

  const days = Object.values(daysMap);

  // Top bundles by revenue
  const bundleMap: Record<string, BundleStats> = {};
  for (const o of orders) {
    if (o.status !== "completed") continue;
    if (!bundleMap[o.bundle_name]) {
      bundleMap[o.bundle_name] = { name: o.bundle_name, count: 0, revenue: 0 };
    }
    bundleMap[o.bundle_name].count += 1;
    bundleMap[o.bundle_name].revenue += Number(o.amount);
  }

  const topBundles = Object.values(bundleMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return { days, topBundles };
}
