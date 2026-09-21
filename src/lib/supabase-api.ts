import { supabase } from "./supabase";
import { type Bundle, type Order, type AppNotification, DEFAULT_BUNDLES } from "./mock-data";

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

export async function fetchDeletedBundleIds(): Promise<string[]> {
  let cached: string[] = [];
  try {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem("datahub_deleted_bundle_ids");
      if (raw) cached = JSON.parse(raw);
    }
  } catch {}

  try {
    const { data } = await supabase
      .from("settings")
      .select("store_name")
      .eq("id", "deleted_bundles")
      .maybeSingle();

    if (data?.store_name) {
      const parsed: string[] = JSON.parse(data.store_name);
      if (Array.isArray(parsed)) {
        try {
          localStorage.setItem("datahub_deleted_bundle_ids", JSON.stringify(parsed));
        } catch {}
        return parsed;
      }
    }
  } catch {}

  return cached;
}

export async function markBundleAsDeleted(bundleId: string): Promise<void> {
  try {
    const existing = await fetchDeletedBundleIds();
    if (!existing.includes(bundleId)) {
      const updated = [...existing, bundleId];
      try {
        localStorage.setItem("datahub_deleted_bundle_ids", JSON.stringify(updated));
      } catch {}

      await supabase.from("settings").upsert({
        id: "deleted_bundles",
        store_name: JSON.stringify(updated),
        updated_at: new Date().toISOString(),
      });
    }
  } catch (e) {
    console.error("Failed to mark bundle as deleted:", e);
  }
}

export async function unmarkBundleAsDeleted(bundleId: string): Promise<void> {
  try {
    const existing = await fetchDeletedBundleIds();
    if (existing.includes(bundleId)) {
      const updated = existing.filter((id) => id !== bundleId);
      try {
        localStorage.setItem("datahub_deleted_bundle_ids", JSON.stringify(updated));
      } catch {}

      await supabase.from("settings").upsert({
        id: "deleted_bundles",
        store_name: JSON.stringify(updated),
        updated_at: new Date().toISOString(),
      });
    }
  } catch (e) {
    console.error("Failed to unmark bundle as deleted:", e);
  }
}

export async function fetchUserDeletedBundleIds(userId: string): Promise<string[]> {
  if (!userId || userId === "guest") return [];
  let cached: string[] = [];
  try {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem(`datahub_deleted_bundle_ids_${userId}`);
      if (raw) cached = JSON.parse(raw);
    }
  } catch {}

  try {
    const { data } = await supabase
      .from("settings")
      .select("store_name")
      .eq("id", `deleted_bundles_${userId}`)
      .maybeSingle();

    if (data?.store_name) {
      const parsed: string[] = JSON.parse(data.store_name);
      if (Array.isArray(parsed)) {
        try {
          localStorage.setItem(`datahub_deleted_bundle_ids_${userId}`, JSON.stringify(parsed));
        } catch {}
        return parsed;
      }
    }
  } catch {}

  return cached;
}

export async function markUserBundleAsDeleted(userId: string, bundleId: string): Promise<void> {
  if (!userId || userId === "guest") return;
  try {
    const existing = await fetchUserDeletedBundleIds(userId);
    if (!existing.includes(bundleId)) {
      const updated = [...existing, bundleId];
      try {
        localStorage.setItem(`datahub_deleted_bundle_ids_${userId}`, JSON.stringify(updated));
      } catch {}

      await supabase.from("settings").upsert({
        id: `deleted_bundles_${userId}`,
        store_name: JSON.stringify(updated),
        updated_at: new Date().toISOString(),
      });
    }
  } catch (e) {
    console.error("Failed to mark user bundle as deleted:", e);
  }
}

export async function unmarkUserBundleAsDeleted(userId: string, bundleId: string): Promise<void> {
  if (!userId || userId === "guest") return;
  try {
    const existing = await fetchUserDeletedBundleIds(userId);
    if (existing.includes(bundleId)) {
      const updated = existing.filter((id) => id !== bundleId);
      try {
        localStorage.setItem(`datahub_deleted_bundle_ids_${userId}`, JSON.stringify(updated));
      } catch {}

      await supabase.from("settings").upsert({
        id: `deleted_bundles_${userId}`,
        store_name: JSON.stringify(updated),
        updated_at: new Date().toISOString(),
      });
    }
  } catch (e) {
    console.error("Failed to unmark user bundle as deleted:", e);
  }
}

export async function fetchSupabaseBundles(): Promise<Bundle[]> {
  const [bundlesRes, deletedIds] = await Promise.all([
    supabase.from("bundles").select("*").order("gb", { ascending: true }),
    fetchDeletedBundleIds(),
  ]);

  if (bundlesRes.error) {
    console.error("Error fetching bundles from Supabase:", bundlesRes.error);
    return DEFAULT_BUNDLES.filter((b) => !deletedIds.includes(b.id));
  }

  const list: Bundle[] = (bundlesRes.data || []).map((b) => ({
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

  const source = list.length > 0 ? list : DEFAULT_BUNDLES;
  return source.filter((b) => !deletedIds.includes(b.id));
}

export async function upsertSupabaseBundle(bundle: Bundle): Promise<void> {
  // If previously deleted, unmark it
  await unmarkBundleAsDeleted(bundle.id);

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

  // Broadcast to all clients and front end in real-time
  broadcastCatalogChange({
    userId: "all",
    bundleId: bundle.id,
    action: "upsert",
    bundle,
  });
}

export async function deleteSupabaseBundle(id: string): Promise<void> {
  // 1. Mark as globally deleted
  await markBundleAsDeleted(id);

  // 2. Broadcast deletion to all clients and front end in real-time
  broadcastCatalogChange({
    userId: "all",
    bundleId: id,
    action: "delete",
  });

  // 3. Delete from bundles table
  try {
    await supabase.from("bundles").delete().eq("id", id);
  } catch (e) {
    console.error("Error deleting bundle in Supabase:", e);
  }

  // 4. Also delete from all user_bundles so it's gone for every user
  try {
    await supabase.from("user_bundles").delete().eq("id", id);
  } catch (e) {
    console.error("Error deleting from user_bundles table:", e);
  }
}

// ----------------------------------------------------
// USER BUNDLES (Per-Customer Catalog)
// ----------------------------------------------------

export async function fetchSupabaseUserBundles(userId: string): Promise<Bundle[]> {
  const [globalBundles, globalDeletedIds, userDeletedIds] = await Promise.all([
    fetchSupabaseBundles(),
    fetchDeletedBundleIds(),
    userId && userId !== "guest" ? fetchUserDeletedBundleIds(userId) : Promise.resolve([]),
  ]);

  const allDeletedIds = new Set([...globalDeletedIds, ...userDeletedIds]);

  const globalSlowBundles = globalBundles.filter(
    (b) => b.group === "slow" && !allDeletedIds.has(b.id)
  );
  const globalFastBundles = globalBundles.filter(
    (b) => b.group !== "slow" && !allDeletedIds.has(b.id)
  );

  if (!userId || userId === "guest") {
    return [...globalFastBundles, ...globalSlowBundles];
  }

  let customFastBundles: Bundle[] = [];

  try {
    // 2. Fetch custom user bundles for this specific user from user_bundles table
    const { data, error } = await supabase
      .from("user_bundles")
      .select("*")
      .eq("user_id", userId)
      .order("gb", { ascending: true });

    if (!error && data) {
      customFastBundles = data
        .map((b) => ({
          id: b.id,
          network: b.network,
          name: b.name,
          gb: Number(b.gb),
          price: Number(b.price),
          validity: b.validity,
          popular: Boolean(b.popular),
          description: b.description || undefined,
          group: (b.group_type || "fast") as "fast" | "slow",
        }))
        .filter((b) => !allDeletedIds.has(b.id));
    }
  } catch (e) {
    console.error("Error querying user_bundles table:", e);
  }

  // 3. Fallback to localStorage per-user catalog if customFastBundles is empty
  if (customFastBundles.length === 0) {
    try {
      const raw = localStorage.getItem(`datahub-user-bundles-${userId}`);
      if (raw) {
        const parsed: Bundle[] = JSON.parse(raw);
        customFastBundles = parsed.filter(
          (b) => b.group !== "slow" && !allDeletedIds.has(b.id)
        );
      }
    } catch {}
  }

  // 4. Merge custom fast bundles with default fast bundles:
  // Default bundles MUST NOT get deleted when custom bundles are added;
  // they remain unless overridden by custom bundle with same ID or explicitly deleted by admin!
  const customIds = new Set(customFastBundles.map((b) => b.id));
  const remainingDefaultFast = globalFastBundles.filter(
    (b) => !customIds.has(b.id) && !allDeletedIds.has(b.id)
  );

  const mergedFastBundles = [...customFastBundles, ...remainingDefaultFast].sort(
    (a, b) => a.gb - b.gb
  );

  // Cache into localStorage
  try {
    localStorage.setItem(
      `datahub-user-bundles-${userId}`,
      JSON.stringify(mergedFastBundles)
    );
  } catch {}

  // Merge: Combined fast bundles + Global 1hr-2hr delivery bundles
  return [...mergedFastBundles, ...globalSlowBundles];
}

export function broadcastCatalogChange(payload: {
  userId: string;
  bundleId?: string;
  action: "upsert" | "delete" | "reset";
  bundle?: Bundle;
}): void {
  // 1. Dispatch custom event in current window (immediate 0ms)
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("dataflex:catalog-changed", { detail: payload }));
    }
  } catch {}

  // 2. Broadcast across browser tabs via BroadcastChannel (instant 0ms)
  try {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      const bc = new BroadcastChannel("dataflex:catalog-sync");
      bc.postMessage(payload);
      bc.close();
    }
  } catch {}

  // 3. Broadcast across clients/devices via Supabase Realtime channel
  try {
    const channel = supabase.channel("catalog-realtime-sync");
    channel.send({
      type: "broadcast",
      event: "catalog-change",
      payload,
    });
  } catch {}
}

export function broadcastFastOnlyMode(enabled: boolean): void {
  // 1. In-window custom event (instant 0ms)
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("dataflex:fast-only-changed", { detail: { enabled } })
      );
    }
  } catch {}

  // 2. Broadcast across browser tabs via BroadcastChannel (instant 0ms)
  try {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      const bc = new BroadcastChannel("dataflex:fast-only-channel");
      bc.postMessage({ enabled });
      bc.close();
    }
  } catch {}

  // 3. Broadcast across clients/devices via Supabase Realtime channel
  try {
    const channel = supabase.channel("catalog-realtime-sync");
    channel.send({
      type: "broadcast",
      event: "fast-only-change",
      payload: { enabled },
    });
  } catch {}
}

export async function upsertSupabaseUserBundle(userId: string, bundle: Bundle): Promise<void> {
  // If previously deleted, unmark it for this user and globally
  await Promise.all([
    unmarkUserBundleAsDeleted(userId, bundle.id),
    unmarkBundleAsDeleted(bundle.id),
  ]);

  // Immediately update localStorage
  try {
    const raw = localStorage.getItem(`datahub-user-bundles-${userId}`);
    const existing: Bundle[] = raw ? JSON.parse(raw) : [];
    const idx = existing.findIndex((b) => b.id === bundle.id);
    if (idx >= 0) existing[idx] = bundle;
    else existing.push(bundle);
    existing.sort((a, b) => a.gb - b.gb);
    localStorage.setItem(`datahub-user-bundles-${userId}`, JSON.stringify(existing));
  } catch {}

  // Instantly broadcast
  broadcastCatalogChange({
    userId,
    bundleId: bundle.id,
    action: "upsert",
    bundle,
  });

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
}

export async function deleteSupabaseUserBundle(userId: string, bundleId: string): Promise<void> {
  // 1. Mark as deleted for this specific user so it never re-appears in their catalog
  await markUserBundleAsDeleted(userId, bundleId);

  // 2. Immediately update localStorage for this user
  try {
    const raw = localStorage.getItem(`datahub-user-bundles-${userId}`);
    if (raw) {
      const existing: Bundle[] = JSON.parse(raw);
      const filtered = existing.filter((b) => b.id !== bundleId);
      localStorage.setItem(`datahub-user-bundles-${userId}`, JSON.stringify(filtered));
    }
  } catch {}

  // 3. Instantly notify all channels and devices for this user
  broadcastCatalogChange({
    userId,
    bundleId,
    action: "delete",
  });

  // 4. Delete from user_bundles table for this user
  try {
    await supabase.from("user_bundles").delete().match({ id: bundleId, user_id: userId });
  } catch (e) {
    console.error("Failed to delete from user_bundles table:", e);
  }
}

export async function resetSupabaseUserBundles(userId: string): Promise<void> {
  try {
    localStorage.removeItem(`datahub-user-bundles-${userId}`);
    localStorage.removeItem(`datahub_deleted_bundle_ids_${userId}`);
  } catch {}

  // Remove user-specific deleted bundle records in settings
  try {
    await supabase.from("settings").delete().eq("id", `deleted_bundles_${userId}`);
  } catch {}

  broadcastCatalogChange({
    userId,
    action: "reset",
  });

  try {
    await supabase.from("user_bundles").delete().eq("user_id", userId);
  } catch (e) {
    console.error("Failed to reset user_bundles table:", e);
  }
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

export async function syncOrderPaymentSuccess(reference: string): Promise<Order | null> {
  try {
    const settings = await fetchSupabaseSettings();
    const nextStatus: Order["status"] = settings.autoApprove ? "processing" : "pending";

    // 1. Update order status in Supabase
    const { data: order, error } = await supabase
      .from("orders")
      .update({ status: nextStatus })
      .eq("reference", reference)
      .select()
      .maybeSingle();

    if (error || !order) {
      console.warn("Could not find order to sync status for reference:", reference);
      return null;
    }

    // 2. Insert transaction if not existing
    const { data: existingTx } = await supabase
      .from("transactions")
      .select("id")
      .eq("reference", reference)
      .maybeSingle();

    if (!existingTx && order.user_id) {
      await supabase.from("transactions").insert({
        user_id: order.user_id,
        type: "debit",
        title: `Purchase: ${order.bundle_name} (${order.gb}GB)`,
        amount: order.amount,
        reference: order.reference,
        status: "success",
      });
    }

    // 3. Broadcast notification
    await supabase.from("notifications").insert({
      user_id: order.user_id,
      title: "Payment Confirmed ✅",
      message: `${order.bundle_name} (${order.gb}GB) delivery in progress for ${order.recipient}. Ref: ${order.reference}`,
      type: "order",
      audience: "all",
      read: false,
    });

    return {
      id: order.id,
      reference: order.reference,
      bundleId: order.bundle_id || "",
      bundleName: order.bundle_name,
      network: order.network,
      gb: Number(order.gb),
      amount: Number(order.amount),
      recipient: order.recipient,
      status: order.status,
      createdAt: order.created_at,
      paymentMethod: order.payment_method,
      group: order.group_type as "fast" | "slow",
    };
  } catch (e) {
    console.error("Error in syncOrderPaymentSuccess:", e);
    return null;
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
  fastOnlyMode: boolean;
  minWithdrawal: number;
  paystackPublicKey?: string;
}

const DEFAULT_SETTINGS: SupabaseSettings = {
  storeName: "DataFlex",
  supportEmail: "support@dataflex.gh",
  supportPhone: "0244000111",
  momoNumber: "0244000111",
  autoApprove: true,
  maintenance: false,
  maintenanceMode: false,
  fastOnlyMode: false,
  minWithdrawal: 10,
  paystackPublicKey: "pk_test_89f8b1554a54065b1017190634b2755f9883993e",
};

export async function fetchFastOnlyMode(): Promise<boolean> {
  let cached = false;
  try {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem("datahub_fast_only_mode");
      if (raw !== null) cached = raw === "true";
    }
  } catch {}

  try {
    const { data, error } = await supabase
      .from("settings")
      .select("maintenance")
      .eq("id", "fast_only_mode")
      .maybeSingle();

    if (!error && data) {
      const val = Boolean(data.maintenance);
      try {
        localStorage.setItem("datahub_fast_only_mode", String(val));
      } catch {}
      return val;
    }
  } catch {}

  return cached;
}

export async function setFastOnlyMode(enabled: boolean): Promise<boolean> {
  try {
    localStorage.setItem("datahub_fast_only_mode", String(enabled));
  } catch {}

  // Immediate broadcast to all open tabs and active clients
  broadcastFastOnlyMode(enabled);

  try {
    const { error } = await supabase.from("settings").upsert({
      id: "fast_only_mode",
      maintenance: enabled,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.error("Failed to save fast_only_mode in Supabase:", error);
    }
  } catch (e) {
    console.error("Error updating fast_only_mode:", e);
  }

  return enabled;
}

export async function fetchSupabaseSettings(): Promise<SupabaseSettings> {
  const [globalRes, fastOnlyVal] = await Promise.all([
    supabase.from("settings").select("*").eq("id", "global").maybeSingle(),
    fetchFastOnlyMode(),
  ]);

  const data = globalRes.data;

  if (globalRes.error || !data) {
    console.error("Error fetching settings from Supabase:", globalRes.error);
    return { ...DEFAULT_SETTINGS, fastOnlyMode: fastOnlyVal };
  }

  return {
    storeName: data.store_name || DEFAULT_SETTINGS.storeName,
    supportEmail: data.support_email || DEFAULT_SETTINGS.supportEmail,
    supportPhone: data.support_phone || DEFAULT_SETTINGS.supportPhone,
    momoNumber: data.momo_number || DEFAULT_SETTINGS.momoNumber,
    autoApprove: Boolean(data.auto_approve ?? true),
    maintenance: Boolean(data.maintenance ?? false),
    maintenanceMode: Boolean(data.maintenance ?? false),
    fastOnlyMode: fastOnlyVal,
    minWithdrawal: Number(data.min_withdrawal ?? 10),
    paystackPublicKey: data.paystack_public_key || DEFAULT_SETTINGS.paystackPublicKey,
  };
}

export async function updateSupabaseSettings(
  s: Partial<SupabaseSettings>,
): Promise<SupabaseSettings> {
  if (s.fastOnlyMode !== undefined) {
    await setFastOnlyMode(s.fastOnlyMode);
  }

  const payload: Record<string, unknown> = {
    id: "global",
    store_name: s.storeName,
    support_email: s.supportEmail,
    support_phone: s.supportPhone,
    momo_number: s.momoNumber,
    auto_approve: s.autoApprove,
    maintenance: s.maintenance ?? s.maintenanceMode,
    min_withdrawal: s.minWithdrawal,
    updated_at: new Date().toISOString(),
  };

  if (s.paystackPublicKey !== undefined) {
    payload.paystack_public_key = s.paystackPublicKey;
  }

  const { data, error } = await supabase.from("settings").upsert(payload).select().single();

  if (error || !data) {
    console.error("Error updating settings in Supabase:", error);
    return DEFAULT_SETTINGS;
  }

  const fastOnly = s.fastOnlyMode !== undefined ? s.fastOnlyMode : await fetchFastOnlyMode();

  return {
    storeName: data.store_name,
    supportEmail: data.support_email,
    supportPhone: data.support_phone,
    momoNumber: data.momo_number,
    autoApprove: Boolean(data.auto_approve),
    maintenance: Boolean(data.maintenance),
    maintenanceMode: Boolean(data.maintenance),
    fastOnlyMode: fastOnly,
    minWithdrawal: Number(data.min_withdrawal),
    paystackPublicKey: data.paystack_public_key || DEFAULT_SETTINGS.paystackPublicKey,
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
