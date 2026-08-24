import type { Order, OrderStatus, BundleGroup } from "./mock-data";

export interface DeliveryStep {
  key: string;
  label: string;
  description: string;
  /** ISO timestamp once the step has happened. */
  at?: string;
  state: "done" | "active" | "pending" | "failed";
}

/** Expected end-to-end delivery window for a bundle group, in minutes. */
export const deliveryWindowMinutes = (group?: BundleGroup) =>
  group === "slow" ? { min: 60, max: 120 } : { min: 1, max: 5 };

const addMinutes = (iso: string, mins: number) => new Date(new Date(iso).getTime() + mins * 60000);

/** Estimated delivery time range for an order. */
export function estimatedDelivery(order: Order) {
  const w = deliveryWindowMinutes(order.group);
  return { from: addMinutes(order.createdAt, w.min), to: addMinutes(order.createdAt, w.max) };
}

export function formatCountdown(target: Date, now: Date = new Date()) {
  const ms = target.getTime() - now.getTime();
  if (ms <= 0) return "any moment now";
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    return `in ${h}h ${mins % 60}m`;
  }
  if (mins > 0) return `in ${mins}m ${String(secs).padStart(2, "0")}s`;
  return `in ${secs}s`;
}

const ORDER_OF: Record<OrderStatus, number> = {
  pending: 1,
  processing: 2,
  completed: 3,
  failed: 2,
  cancelled: 2,
  refunded: 3,
};

/** Timeline of delivery events derived from the order's current status. */
export function deliveryTimeline(order: Order): DeliveryStep[] {
  const rank = ORDER_OF[order.status] ?? 1;
  const terminalBad = order.status === "failed" || order.status === "cancelled";
  const w = deliveryWindowMinutes(order.group);
  const est = estimatedDelivery(order);

  const step = (
    key: string,
    label: string,
    description: string,
    at: string | undefined,
    myRank: number,
  ): DeliveryStep => ({
    key,
    label,
    description,
    at,
    state:
      terminalBad && myRank >= rank
        ? myRank === rank
          ? "failed"
          : "pending"
        : rank > myRank
          ? "done"
          : rank === myRank
            ? order.status === "completed" || order.status === "refunded"
              ? "done"
              : "active"
            : "pending",
  });

  return [
    step("placed", "Order placed", `${order.bundleName} • ${order.reference}`, order.createdAt, 1),
    step(
      "processing",
      terminalBad
        ? order.status === "failed"
          ? "Delivery failed"
          : "Order cancelled"
        : "Sending to network",
      terminalBad
        ? "Payment or delivery could not be completed. You can retry from the buy page."
        : `${order.network} is provisioning ${order.gb}GB to ${order.recipient}.`,
      rank >= 2 ? addMinutes(order.createdAt, 1).toISOString() : undefined,
      2,
    ),
    step(
      "delivered",
      order.status === "refunded" ? "Refunded" : "Data delivered",
      order.status === "completed"
        ? `Delivered to ${order.recipient}.`
        : `Estimated ${w.min}–${w.max} min • ${est.from.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – ${est.to.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
      rank >= 3 ? est.to.toISOString() : undefined,
      3,
    ),
  ];
}
