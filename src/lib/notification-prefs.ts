/** Per-customer notification preference controls (in-app, email, SMS). */

export type NotificationChannel = "inApp" | "email" | "sms";
export type NotificationTopic = "deliveryUpdates" | "paymentFailures" | "promotions";

export type NotificationPrefs = Record<NotificationTopic, Record<NotificationChannel, boolean>>;

export const TOPICS: { key: NotificationTopic; label: string; description: string }[] = [
  {
    key: "deliveryUpdates",
    label: "Delivery updates",
    description: "Order accepted, sending to network, and data delivered.",
  },
  {
    key: "paymentFailures",
    label: "Payment failure alerts",
    description: "When a payment is declined or a delivery fails.",
  },
  {
    key: "promotions",
    label: "Offers & announcements",
    description: "New bundles, price drops and service notices.",
  },
];

export const CHANNELS: { key: NotificationChannel; label: string }[] = [
  { key: "inApp", label: "In-app" },
  { key: "email", label: "Email" },
  { key: "sms", label: "SMS" },
];

export const DEFAULT_PREFS: NotificationPrefs = {
  deliveryUpdates: { inApp: true, email: true, sms: false },
  paymentFailures: { inApp: true, email: true, sms: true },
  promotions: { inApp: true, email: false, sms: false },
};

const KEY = "dataflex-notification-prefs";

export function loadNotificationPrefs(userId: string): NotificationPrefs {
  try {
    const map = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, NotificationPrefs>;
    const saved = map[userId];
    if (saved) {
      return {
        deliveryUpdates: { ...DEFAULT_PREFS.deliveryUpdates, ...saved.deliveryUpdates },
        paymentFailures: { ...DEFAULT_PREFS.paymentFailures, ...saved.paymentFailures },
        promotions: { ...DEFAULT_PREFS.promotions, ...saved.promotions },
      };
    }
  } catch {}
  return DEFAULT_PREFS;
}

export function saveNotificationPrefs(userId: string, prefs: NotificationPrefs) {
  try {
    const map = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, NotificationPrefs>;
    map[userId] = prefs;
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {}
}

/** Channels currently enabled for a topic — used when dispatching a notice. */
export function enabledChannels(userId: string, topic: NotificationTopic): NotificationChannel[] {
  const p = loadNotificationPrefs(userId)[topic];
  return (Object.keys(p) as NotificationChannel[]).filter((c) => p[c]);
}
