import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Download, ShoppingBag, CheckCircle, ArrowRight, Receipt, Wifi, Phone, Calendar, Hash, CreditCard, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import {
  loadOrders,
  formatGHS,
  deliveryLabel,
  type Order,
  type OrderStatus,
} from "@/lib/mock-data";
import { deliveryTimeline, estimatedDelivery, formatCountdown } from "@/lib/delivery";
import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_app/orders")({
  component: OrdersPage,
});

function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [selected, setSelected] = useState<Order | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);

  useEffect(() => {
    // Check if returning from Paystack redirect
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref") || params.get("reference") || params.get("trxref");
      const paymentStatus = params.get("payment");
      if (ref) {
        setQ(ref);
        import("@/lib/supabase-api").then(async ({ syncOrderPaymentSuccess }) => {
          const updated = await syncOrderPaymentSuccess(ref);
          const data = await loadOrders(user?.id);
          setOrders(data);
          // Find the order to show in receipt (prefer synced, fallback to list)
          const found = updated || data.find((o) => o.reference === ref) || null;
          if (found && (paymentStatus === "success" || !paymentStatus)) {
            setReceiptOrder(found);
          }
        });

        // Clean URL params without reloading
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [user?.id]);

  useEffect(() => {
    async function fetchOrders() {
      const data = await loadOrders(user?.id);
      setOrders(data);
    }
    fetchOrders();

    const channel = supabase
      .channel(`customer-orders-realtime-${user?.id || "guest"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        fetchOrders();
      })
      .subscribe();

    const id = window.setInterval(fetchOrders, 10000);
    window.addEventListener("focus", fetchOrders);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", fetchOrders);
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matches = q
        ? o.reference.toLowerCase().includes(q.toLowerCase()) ||
          o.recipient.includes(q) ||
          o.bundleName.toLowerCase().includes(q.toLowerCase())
        : true;
      const st = status === "all" || o.status === status;
      return matches && st;
    });
  }, [orders, q, status]);

  const downloadReceipt = (o: Order) => {
    const lines = [
      "╔══════════════════════════════════════╗",
      "║         DATAFLEX PAYMENT RECEIPT       ║",
      "╚══════════════════════════════════════╝",
      "",
      `Reference : ${o.reference}`,
      `Date      : ${new Date(o.createdAt).toLocaleString()}`,
      "",
      "─── ORDER DETAILS ──────────────────────",
      `Bundle    : ${o.bundleName}`,
      `Size      : ${o.gb} GB`,
      `Network   : ${o.network}`,
      `Delivery  : ${deliveryLabel(o.group)}`,
      `Recipient : ${o.recipient}`,
      "",
      "─── PAYMENT ────────────────────────────",
      `Amount    : ${formatGHS(o.amount)}`,
      `Method    : ${o.paymentMethod}`,
      `Status    : ${o.status.toUpperCase()}`,
      "",
      "Thank you for choosing DataFlex!",
      "For support, contact us on our website.",
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `DataFlex-Receipt-${o.reference}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Receipt downloaded!");
  };

  return (
    <>
      {/* ── Full-screen Payment Receipt Overlay ── */}
      {receiptOrder && (
        <PaymentReceiptOverlay
          order={receiptOrder}
          onClose={() => setReceiptOrder(null)}
          onDownload={() => downloadReceipt(receiptOrder)}
        />
      )}

      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold">Orders</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Search, filter, and download receipts.
            </p>
          </div>
          <Button asChild className="gradient-gold text-primary-foreground">
            <Link to="/">Buy new bundle</Link>
          </Button>
        </div>

        <Card className="glass border-0 p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search reference, phone, bundle…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <Select value={status} onValueChange={(v) => setStatus(v as OrderStatus | "all")}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {["all", "pending", "processing", "completed", "failed", "cancelled", "refunded"].map(
                  (s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
        </Card>

        <Card className="glass border-0 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-16 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10">
                <ShoppingBag className="h-6 w-6 text-primary" />
              </div>
              <div className="mt-4 text-sm font-medium">No orders found</div>
              <p className="mt-1 text-xs text-muted-foreground">Try clearing your filters.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Bundle</TableHead>
                  <TableHead className="hidden sm:table-cell">Delivery</TableHead>
                  <TableHead className="hidden md:table-cell">Recipient</TableHead>
                  <TableHead className="hidden lg:table-cell">Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.reference}</TableCell>
                    <TableCell className="font-medium">
                      {o.bundleName}
                      <span className="mt-0.5 block text-[10px] text-muted-foreground sm:hidden">
                        {deliveryLabel(o.group)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge
                        variant="outline"
                        className={
                          o.group === "slow"
                            ? "whitespace-nowrap border-muted-foreground/30 text-muted-foreground"
                            : "whitespace-nowrap border-primary/40 text-primary"
                        }
                      >
                        {deliveryLabel(o.group)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{o.recipient}</TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {new Date(o.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-semibold">{formatGHS(o.amount)}</TableCell>
                    <TableCell>
                      <StatusBadge status={o.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setReceiptOrder(o)}
                        >
                          <Receipt className="mr-1 h-3 w-3" />
                          Receipt
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="ghost" onClick={() => setSelected(o)}>
                              View
                            </Button>
                          </DialogTrigger>
                          {selected?.id === o.id && (
                            <DialogContent className="glass border-0">
                              <DialogHeader>
                                <DialogTitle>Order details</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-2 text-sm">
                                <Row label="Reference" value={o.reference} />
                                <Row label="Bundle" value={`${o.bundleName} (${o.gb}GB)`} />
                                <Row label="Delivery" value={deliveryLabel(o.group)} />
                                <Row label="Network" value={o.network} />
                                <Row label="Recipient" value={o.recipient} />
                                <Row label="Amount" value={formatGHS(o.amount)} />
                                <Row label="Payment" value={o.paymentMethod} />
                                <Row label="Date" value={new Date(o.createdAt).toLocaleString()} />
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">Status</span>
                                  <StatusBadge status={o.status} />
                                </div>
                              </div>
                              <DeliveryTimeline order={o} />

                              <Button
                                onClick={() => downloadReceipt(o)}
                                className="w-full gradient-gold text-primary-foreground"
                              >
                                <Download className="mr-2 h-4 w-4" /> Download receipt
                              </Button>
                            </DialogContent>
                          )}
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────
   Payment Receipt Overlay
───────────────────────────────────────────────── */
function PaymentReceiptOverlay({
  order,
  onClose,
  onDownload,
}: {
  order: Order;
  onClose: () => void;
  onDownload: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Animate in after mount
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  const networkColor =
    order.network?.toLowerCase().includes("mtn")
      ? "#FFCC00"
      : order.network?.toLowerCase().includes("vodafone") || order.network?.toLowerCase().includes("telecel")
        ? "#E10000"
        : order.network?.toLowerCase().includes("airteltigo")
          ? "#CC0066"
          : "#6C63FF";

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(12px)",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.3s ease",
      }}
    >
      <div
        ref={receiptRef}
        style={{
          transform: visible ? "scale(1) translateY(0)" : "scale(0.9) translateY(30px)",
          transition: "transform 0.35s cubic-bezier(0.34,1.56,0.64,1)",
          maxWidth: 440,
          width: "100%",
        }}
      >
        {/* Receipt card */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0f0f17] shadow-2xl">
          {/* Glow top */}
          <div
            className="pointer-events-none absolute -top-20 left-1/2 h-40 w-80 -translate-x-1/2 rounded-full opacity-40 blur-3xl"
            style={{ background: `radial-gradient(circle, ${networkColor}66, transparent 70%)` }}
          />

          {/* Header */}
          <div className="relative px-8 pb-6 pt-10 text-center">
            {/* Animated check */}
            <div
              className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border-4 border-green-400/30 bg-green-500/10"
              style={{ animation: "pulse 2s infinite" }}
            >
              <CheckCircle className="h-10 w-10 text-green-400" />
            </div>

            <div className="text-xs font-semibold uppercase tracking-widest text-green-400">
              Payment Successful
            </div>
            <div className="mt-1 text-4xl font-bold text-white">
              {formatGHS(order.amount)}
            </div>
            <div className="mt-1 text-sm text-white/50">
              {new Date(order.createdAt).toLocaleString("en-GH", {
                dateStyle: "long",
                timeStyle: "short",
              })}
            </div>
          </div>

          {/* Divider with perforation effect */}
          <div className="relative flex items-center">
            <div className="h-5 w-5 -ml-2.5 rounded-full bg-black/80" />
            <div className="flex-1 border-t-2 border-dashed border-white/10" />
            <div className="h-5 w-5 -mr-2.5 rounded-full bg-black/80" />
          </div>

          {/* Details */}
          <div className="px-8 py-6 space-y-3">
            <ReceiptRow icon={<Hash className="h-4 w-4" />} label="Reference" value={order.reference} mono />
            <ReceiptRow icon={<Wifi className="h-4 w-4" />} label="Bundle" value={`${order.bundleName} — ${order.gb}GB`} />
            <ReceiptRow icon={<Zap className="h-4 w-4" />} label="Network" value={order.network} />
            <ReceiptRow icon={<Phone className="h-4 w-4" />} label="Recipient" value={order.recipient} />
            <ReceiptRow icon={<CreditCard className="h-4 w-4" />} label="Payment" value={order.paymentMethod || "Paystack"} />
            <ReceiptRow
              icon={<Calendar className="h-4 w-4" />}
              label="Delivery"
              value={deliveryLabel(order.group)}
              accent
            />
          </div>

          {/* Status pill */}
          <div className="mx-8 mb-6 flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
            <span className="text-xs text-white/50">Order Status</span>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-green-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
          </div>

          {/* Delivery progress bar */}
          <div className="mx-8 mb-6">
            <div className="text-[11px] text-white/40 mb-2">Delivery progress</div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full"
                style={{
                  width:
                    order.status === "completed"
                      ? "100%"
                      : order.status === "processing"
                        ? "60%"
                        : order.status === "pending"
                          ? "20%"
                          : "0%",
                  background: `linear-gradient(90deg, ${networkColor}, #6C63FF)`,
                  transition: "width 1s ease",
                }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-white/30">
              <span>Paid</span>
              <span>Processing</span>
              <span>Delivered</span>
            </div>
          </div>

          {/* Divider */}
          <div className="relative flex items-center">
            <div className="h-5 w-5 -ml-2.5 rounded-full bg-black/80" />
            <div className="flex-1 border-t-2 border-dashed border-white/10" />
            <div className="h-5 w-5 -mr-2.5 rounded-full bg-black/80" />
          </div>

          {/* Actions */}
          <div className="px-8 py-6 space-y-3">
            <button
              onClick={onDownload}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all"
              style={{
                background: `linear-gradient(135deg, ${networkColor}aa, #6C63FF)`,
              }}
            >
              <Download className="h-4 w-4" />
              Download Receipt
            </button>
            <button
              onClick={handleClose}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-3 text-sm font-medium text-white/70 hover:bg-white/5 transition-all"
            >
              View All Orders
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Footer */}
          <div className="border-t border-white/5 px-8 py-4 text-center text-[11px] text-white/30">
            Thank you for choosing DataFlex • Your data is on its way!
          </div>
        </div>
      </div>
    </div>
  );
}

function ReceiptRow({
  icon,
  label,
  value,
  mono,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 text-white/40 text-xs min-w-0">
        {icon}
        <span>{label}</span>
      </div>
      <span
        className={`text-right text-sm truncate max-w-[55%] ${
          mono ? "font-mono text-xs text-white/60" : accent ? "text-primary font-semibold" : "text-white font-medium"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function DeliveryTimeline({ order }: { order: Order }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const steps = deliveryTimeline(order);
  const est = estimatedDelivery(order);
  const settled = order.status === "completed" || order.status === "refunded";
  const broken = order.status === "failed" || order.status === "cancelled";

  return (
    <div className="rounded-xl border border-border/50 p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Delivery timeline</span>
        <span className="text-xs text-muted-foreground">
          {settled ? "Delivered" : broken ? "Stopped" : `Estimated ${formatCountdown(est.to, now)}`}
        </span>
      </div>
      <ol className="mt-3 space-y-3">
        {steps.map((s) => {
          const Icon =
            s.state === "done"
              ? CheckCircle2
              : s.state === "failed"
                ? XCircle
                : s.state === "active"
                  ? Loader2
                  : Circle;
          return (
            <li key={s.key} className="flex gap-3">
              <Icon
                className={`mt-0.5 h-4 w-4 shrink-0 ${
                  s.state === "done"
                    ? "text-primary"
                    : s.state === "failed"
                      ? "text-destructive"
                      : s.state === "active"
                        ? "animate-spin text-primary"
                        : "text-muted-foreground/50"
                }`}
              />
              <div className="min-w-0">
                <div className="text-xs font-medium">{s.label}</div>
                <div className="text-[11px] text-muted-foreground">{s.description}</div>
                {s.at && (
                  <div className="text-[10px] text-muted-foreground">
                    {new Date(s.at).toLocaleString()}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

