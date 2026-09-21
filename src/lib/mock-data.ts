import {
  fetchSupabaseOrders,
  createSupabaseOrder,
  fetchSupabaseNotifications,
  createSupabaseNotification,
} from "./supabase-api";

export type BundleGroup = "fast" | "slow";

export interface Bundle {
  id: string;
  network: "MTN" | "Vodafone" | "AirtelTigo";
  name: string;
  gb: number;
  price: number; // GHS
  validity: string;
  popular?: boolean;
  description?: string;
  group?: BundleGroup;
}

export type OrderStatus =
  "pending" | "processing" | "completed" | "failed" | "cancelled" | "refunded";

export interface Order {
  id: string;
  reference: string;
  bundleId: string;
  bundleName: string;
  network: string;
  gb: number;
  amount: number;
  recipient: string;
  status: OrderStatus;
  createdAt: string;
  paymentMethod: string;
  /** Delivery group: "fast" = Fast delivery, "slow" = 1hr - 2hr delivery */
  group?: BundleGroup;
}

export const deliveryLabel = (group?: BundleGroup) =>
  group === "slow" ? "1hr – 2hr delivery" : "Fast delivery";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  type: "order" | "announcement" | "system" | "payment";
  /** Who should see this notification. Defaults to "customer". */
  audience?: "customer" | "admin" | "all";
}

export const DEFAULT_BUNDLES: Bundle[] = [
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

export const BUNDLES: Bundle[] = [
  { id: "b1", network: "MTN", name: "Starter 1GB", gb: 1, price: 6, validity: "24 hours" },
  { id: "b2", network: "MTN", name: "Daily 2GB", gb: 2, price: 11, validity: "24 hours" },
  {
    id: "b3",
    network: "MTN",
    name: "Weekly 5GB",
    gb: 5,
    price: 25,
    validity: "7 days",
    popular: true,
  },
  { id: "b9", network: "MTN", name: "Flash 3GB", gb: 3, price: 15, validity: "24 hours" },
  { id: "b4", network: "MTN", name: "Weekly 10GB", gb: 10, price: 45, validity: "7 days" },
  {
    id: "b5",
    network: "MTN",
    name: "Monthly 20GB",
    gb: 20,
    price: 85,
    validity: "30 days",
    popular: true,
  },
  { id: "b6", network: "MTN", name: "Monthly 50GB", gb: 50, price: 190, validity: "30 days" },
  { id: "b7", network: "MTN", name: "Mega 100GB", gb: 100, price: 340, validity: "30 days" },
  { id: "b8", network: "MTN", name: "Pro 200GB", gb: 200, price: 620, validity: "60 days" },
  { id: "b10", network: "MTN", name: "Ultra 300GB", gb: 300, price: 880, validity: "90 days" },
];

/** Fetch orders directly from Supabase DB */
export async function loadOrders(userId?: string): Promise<Order[]> {
  return await fetchSupabaseOrders(userId);
}

/** Create order in Supabase DB */
export async function addOrder(order: Order, userId?: string) {
  if (userId) {
    await createSupabaseOrder(order, userId);
  }
}

/** Fetch notifications directly from Supabase DB */
export async function loadNotifications(userId?: string): Promise<AppNotification[]> {
  return await fetchSupabaseNotifications(userId);
}

export async function loadNotificationsFor(audience: "customer" | "admin", userId?: string) {
  const notifs = await fetchSupabaseNotifications(userId);
  return notifs.filter((n) => {
    const a = n.audience ?? "customer";
    return a === "all" || a === audience;
  });
}

/** Push notification to Supabase DB */
export async function pushNotification(
  n: Omit<AppNotification, "id"> & { id?: string; userId?: string },
) {
  await createSupabaseNotification(n);
}

export function saveNotifications(_notifications: AppNotification[]) {
  // No-op for Supabase compatibility
}

export const formatGHS = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(n);
