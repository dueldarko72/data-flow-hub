export type DeliveryGroup = "fast" | "slow";

export interface Bundle {
  id: string;
  network: "MTN" | "Vodafone" | "AirtelTigo";
  name: string;
  gb: number;
  price: number; // GHS
  validity: string;
  popular?: boolean;
  description?: string;
  group?: DeliveryGroup;
}

export type OrderStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled"
  | "refunded";

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
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  type: "order" | "announcement" | "system";
}

/** 4 instantly-delivered bundles */
export const FAST_BUNDLES: Bundle[] = [
  { id: "f1", network: "MTN", name: "Starter 1GB", gb: 1, price: 6, validity: "24 hours", group: "fast" },
  { id: "f2", network: "MTN", name: "Daily 2GB", gb: 2, price: 11, validity: "24 hours", group: "fast" },
  { id: "f3", network: "MTN", name: "Flash 3GB", gb: 3, price: 15, validity: "24 hours", group: "fast", popular: true },
  { id: "f4", network: "MTN", name: "Weekly 5GB", gb: 5, price: 25, validity: "7 days", group: "fast" },
];

/** 9 bundles delivered within 1hr – 2hr */
export const SLOW_BUNDLES: Bundle[] = [
  { id: "s1", network: "MTN", name: "Value 6GB", gb: 6, price: 28, validity: "7 days", group: "slow" },
  { id: "s2", network: "MTN", name: "Value 8GB", gb: 8, price: 36, validity: "7 days", group: "slow" },
  { id: "s3", network: "MTN", name: "Weekly 10GB", gb: 10, price: 45, validity: "7 days", group: "slow" },
  { id: "s4", network: "MTN", name: "Boost 15GB", gb: 15, price: 65, validity: "30 days", group: "slow" },
  { id: "s5", network: "MTN", name: "Monthly 20GB", gb: 20, price: 85, validity: "30 days", group: "slow", popular: true },
  { id: "s6", network: "MTN", name: "Monthly 25GB", gb: 25, price: 100, validity: "30 days", group: "slow" },
  { id: "s7", network: "MTN", name: "Monthly 30GB", gb: 30, price: 120, validity: "30 days", group: "slow" },
  { id: "s8", network: "MTN", name: "Monthly 50GB", gb: 50, price: 190, validity: "30 days", group: "slow" },
  { id: "s9", network: "MTN", name: "Mega 100GB", gb: 100, price: 340, validity: "30 days", group: "slow" },
];

export const BUNDLES: Bundle[] = [...FAST_BUNDLES, ...SLOW_BUNDLES];


const ORDERS_KEY = "datahub-orders";
const NOTIF_KEY = "datahub-notifications";

export function loadOrders(): Order[] {
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return seedOrders();
}

function seedOrders(): Order[] {
  const now = Date.now();
  const seed: Order[] = [
    {
      id: crypto.randomUUID(),
      reference: "DH-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
      bundleId: "b3",
      bundleName: "Weekly 5GB",
      network: "MTN",
      gb: 5,
      amount: 25,
      recipient: "0244123456",
      status: "completed",
      createdAt: new Date(now - 86400000 * 2).toISOString(),
      paymentMethod: "MTN MoMo",
    },
    {
      id: crypto.randomUUID(),
      reference: "DH-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
      bundleId: "b5",
      bundleName: "Monthly 20GB",
      network: "MTN",
      gb: 20,
      amount: 85,
      recipient: "0209988776",
      status: "processing",
      createdAt: new Date(now - 3600000).toISOString(),
      paymentMethod: "MTN MoMo",
    },
  ];
  try {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(seed));
  } catch {}
  return seed;
}

export function saveOrders(orders: Order[]) {
  try {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  } catch {}
}

export function addOrder(order: Order) {
  const orders = loadOrders();
  orders.unshift(order);
  saveOrders(orders);
}

export function loadNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(NOTIF_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const seed: AppNotification[] = [
    {
      id: crypto.randomUUID(),
      title: "Welcome to DataHub 🎉",
      message: "Buy MTN data bundles instantly. Enjoy unbeatable prices.",
      createdAt: new Date().toISOString(),
      read: false,
      type: "announcement",
    },
    {
      id: crypto.randomUUID(),
      title: "Order Completed",
      message: "Your 5GB bundle to 0244123456 was delivered successfully.",
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      read: false,
      type: "order",
    },
  ];
  try {
    localStorage.setItem(NOTIF_KEY, JSON.stringify(seed));
  } catch {}
  return seed;
}

export function saveNotifications(n: AppNotification[]) {
  try {
    localStorage.setItem(NOTIF_KEY, JSON.stringify(n));
  } catch {}
}

export function pushNotification(n: AppNotification) {
  const all = loadNotifications();
  all.unshift(n);
  saveNotifications(all);
}

export const formatGHS = (n: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(n);
