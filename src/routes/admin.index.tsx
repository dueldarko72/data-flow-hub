import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  TrendingUp,
  Users,
  ShoppingBag,
  Database,
  ArrowUpRight,
  Copy,
  Check,
  ExternalLink,
  Link2,
  Zap,
  Clock,
  CheckCircle2,
  RefreshCw,
  Megaphone,
  Plus,
  ShieldCheck,
  Sparkles,
  DollarSign,
  Activity,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { loadOrders, formatGHS, deliveryLabel, type Order } from "@/lib/mock-data";
import {
  computeAnalytics,
  loadUsers,
  fetchSupabaseAnalytics,
  updateOrderStatus,
  loadSettings,
  saveSettings,
  type AdminUser,
  type SystemSettings,
} from "@/lib/admin-data";
import { StatusBadge } from "@/components/status-badge";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin/")({
  component: AdminOverview,
});

function AdminOverview() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [chartDays, setChartDays] = useState<{ date: string; revenue: number; orders: number }[]>(
    [],
  );
  const [chartBundles, setChartBundles] = useState<
    { name: string; count: number; revenue: number }[]
  >([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [chartMetric, setChartMetric] = useState<"revenue" | "orders">("revenue");

  const customerUrl = typeof window !== "undefined" ? window.location.origin + "/" : "/";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(customerUrl);
      setCopied(true);
      toast.success("Customer store link copied to clipboard");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Copy failed");
    }
  };

  const loadData = async () => {
    setRefreshing(true);
    try {
      const [o, u, analytics, s] = await Promise.all([
        loadOrders(),
        loadUsers(),
        fetchSupabaseAnalytics(),
        loadSettings(),
      ]);
      setOrders(o);
      setUsers(u);
      setChartDays(analytics.days);
      setChartBundles(analytics.topBundles);
      setSettings(s);
    } catch (e) {
      console.error("Error loading admin overview data:", e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();

    // Subscribe to realtime updates for orders, profiles, and settings
    const channel = supabase
      .channel("admin-dashboard-realtime-overview")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        if (payload.eventType === "INSERT") {
          toast.info(
            `🔔 New order received: ${payload.new.bundle_name} (${payload.new.reference})`,
          );
        }
        loadData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        loadData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "settings" }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const a = useMemo(() => computeAnalytics(orders, users), [orders, users]);

  const pendingOrders = useMemo(
    () => orders.filter((o) => o.status === "pending" || o.status === "processing"),
    [orders],
  );

  const completedOrders = useMemo(() => orders.filter((o) => o.status === "completed"), [orders]);

  const successRate =
    orders.length > 0 ? Math.round((completedOrders.length / orders.length) * 100) : 100;

  const totalWalletBalances = useMemo(
    () => users.reduce((acc, u) => acc + (u.balance || 0), 0),
    [users],
  );

  // Quick Inline Status Update
  const handleQuickApprove = async (orderId: string) => {
    try {
      await updateOrderStatus(orderId, "completed");
      toast.success("Order marked as completed ✅");
      await loadData();
    } catch (e) {
      toast.error("Failed to update order status");
    }
  };

  const handleToggleAutoApprove = async (checked: boolean) => {
    if (!settings) return;
    try {
      const updated = await saveSettings({ ...settings, autoApprove: checked });
      setSettings(updated);
      toast.success(`Auto-approve ${checked ? "enabled" : "disabled"}`);
    } catch {
      toast.error("Failed to update auto-approve");
    }
  };

  const handleToggleMaintenance = async (checked: boolean) => {
    if (!settings) return;
    try {
      const updated = await saveSettings({
        ...settings,
        maintenance: checked,
        maintenanceMode: checked,
      });
      setSettings(updated);
      toast.success(`Maintenance mode ${checked ? "activated" : "deactivated"}`);
    } catch {
      toast.error("Failed to update maintenance mode");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Admin Command Center
            </h1>
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-500">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              Live Supabase Sync
            </div>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Real-time telemetry, store automation, order fulfillment & customer analytics.
          </p>
        </div>

        {/* Quick Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={loadData}
            disabled={refreshing}
            className="h-9 gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </Button>

          <Button size="sm" variant="outline" asChild className="h-9 gap-1.5">
            <Link to="/admin/broadcast">
              <Megaphone className="h-3.5 w-3.5 text-primary" />
              <span>Broadcast</span>
            </Link>
          </Button>

          <Button
            size="sm"
            asChild
            className="gradient-gold h-9 gap-1.5 text-primary-foreground glow"
          >
            <Link to="/admin/bundles">
              <Plus className="h-4 w-4" />
              <span>New Bundle</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Customer Store Live Link Card */}
      <Card className="glass border-primary/20 bg-primary/[0.02] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10">
              <Link2 className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">Live Customer Storefront</span>
                <Badge
                  variant="outline"
                  className="border-emerald-500/30 text-[10px] text-emerald-500"
                >
                  Online
                </Badge>
              </div>
              <a
                href={customerUrl}
                target="_blank"
                rel="noreferrer"
                className="block truncate font-mono text-xs text-muted-foreground hover:text-primary"
              >
                {customerUrl}
              </a>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={copyLink} className="h-8 gap-1.5">
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              <span>{copied ? "Copied Link" : "Copy Link"}</span>
            </Button>
            <Button size="sm" asChild className="gradient-gold h-8 gap-1.5 text-primary-foreground">
              <a href={customerUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Visit Store</span>
              </a>
            </Button>
          </div>
        </div>
      </Card>

      {/* Stat KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Revenue"
          value={formatGHS(a.revenue)}
          sub={`${completedOrders.length} settled orders`}
          icon={TrendingUp}
          badge="Live Revenue"
          badgeColor="text-emerald-500 bg-emerald-500/10"
        />
        <StatCard
          label="Order Velocity"
          value={String(orders.length)}
          sub={`${pendingOrders.length} pending in queue`}
          icon={ShoppingBag}
          badge={`${successRate}% Success`}
          badgeColor={
            pendingOrders.length > 0
              ? "text-amber-500 bg-amber-500/10"
              : "text-primary bg-primary/10"
          }
        />
        <StatCard
          label="Total Data Dispatched"
          value={`${a.gbSold} GB`}
          sub="Delivered to MTN customers"
          icon={Database}
          badge="MTN Ghana"
          badgeColor="text-amber-400 bg-amber-400/10"
        />
        <StatCard
          label="Active Customer Base"
          value={String(users.length)}
          sub={`Liability: ${formatGHS(totalWalletBalances)}`}
          icon={Users}
          badge="Registered"
          badgeColor="text-blue-500 bg-blue-500/10"
        />
      </div>

      {/* Analytics Suite */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Chart */}
        <Card className="glass border-0 p-6 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">Store Performance</h2>
                <Badge variant="outline" className="text-[10px]">
                  Last 7 Days
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Realtime transactional flow across all customer checkout sessions
              </p>
            </div>

            {/* Toggle metric */}
            <div className="flex items-center rounded-lg border border-border/60 p-1">
              <Button
                size="sm"
                variant={chartMetric === "revenue" ? "secondary" : "ghost"}
                onClick={() => setChartMetric("revenue")}
                className="h-7 px-2.5 text-xs font-medium"
              >
                Revenue (GHS)
              </Button>
              <Button
                size="sm"
                variant={chartMetric === "orders" ? "secondary" : "ghost"}
                onClick={() => setChartMetric("orders")}
                className="h-7 px-2.5 text-xs font-medium"
              >
                Orders Count
              </Button>
            </div>
          </div>

          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              {chartMetric === "revenue" ? (
                <AreaChart data={chartDays} margin={{ left: -15, right: 8, top: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(v) => `₵${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "12px",
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
                      fontSize: "12px",
                    }}
                    formatter={(v: number) => [formatGHS(v), "Revenue"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#revenueGrad)"
                  />
                </AreaChart>
              ) : (
                <BarChart data={chartDays} margin={{ left: -15, right: 8, top: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                    formatter={(v: number) => [v, "Orders"]}
                  />
                  <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Top Bundles Leaderboard */}
        <Card className="glass flex flex-col justify-between border-0 p-6">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Top Selling Bundles</h2>
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground">Revenue share by bundle tier</p>

            <div className="mt-4 space-y-3">
              {chartBundles.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No completed orders yet.
                </div>
              ) : (
                chartBundles.slice(0, 5).map((b, idx) => (
                  <div
                    key={b.name}
                    className="flex items-center justify-between rounded-xl bg-card/40 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{b.name}</div>
                        <div className="text-[11px] text-muted-foreground">{b.count} orders</div>
                      </div>
                    </div>
                    <div className="text-right font-display text-sm font-bold text-primary">
                      {formatGHS(b.revenue)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border/50">
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link to="/admin/bundles">Manage Bundle Catalog</Link>
            </Button>
          </div>
        </Card>
      </div>

      {/* Live Order Stream & Quick Operations */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Live Orders Table */}
        <Card className="glass border-0 lg:col-span-2">
          <div className="flex items-center justify-between p-4 pb-3 sm:p-6 sm:pb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Live Order Stream</h2>
              {pendingOrders.length > 0 && (
                <Badge className="bg-amber-500 text-white text-[10px]">
                  {pendingOrders.length} Action Needed
                </Badge>
              )}
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin/orders">
                View All Orders <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          <div className="px-4 pb-4 sm:px-6 sm:pb-6">
            {orders.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No orders recorded in Supabase yet.
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {orders.slice(0, 6).map((o) => (
                  <div
                    key={o.id}
                    className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                          o.status === "completed"
                            ? "bg-emerald-500/10 text-emerald-500"
                            : o.status === "pending"
                              ? "bg-amber-500/10 text-amber-500"
                              : "bg-primary/10 text-primary"
                        }`}
                      >
                        {o.group === "slow" ? (
                          <Clock className="h-4 w-4" />
                        ) : (
                          <Zap className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{o.bundleName}</span>
                          <span className="text-xs text-muted-foreground">→</span>
                          <span className="font-mono text-xs">{o.recipient}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {o.reference} • {deliveryLabel(o.group)} •{" "}
                          {new Date(o.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <div className="text-sm font-bold text-right">{formatGHS(o.amount)}</div>
                      <StatusBadge status={o.status} />

                      {o.status === "pending" && (
                        <Button
                          size="sm"
                          onClick={() => handleQuickApprove(o.id)}
                          className="h-7 bg-emerald-600 px-2.5 text-xs text-white hover:bg-emerald-700"
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Approve
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Quick Operations & System Controls */}
        <div className="space-y-6">
          <Card className="glass border-0 p-6">
            <h2 className="text-base font-semibold">Store Automation & Controls</h2>
            <p className="text-xs text-muted-foreground">
              Dynamic switches backed by Supabase `settings` table
            </p>

            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-border/50 bg-card/30 p-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold">Auto-Approve Orders</div>
                  <div className="text-[10px] text-muted-foreground">
                    Mark orders processing immediately on payment
                  </div>
                </div>
                <Switch
                  checked={settings?.autoApprove ?? true}
                  onCheckedChange={handleToggleAutoApprove}
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border/50 bg-card/30 p-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold">Maintenance Mode</div>
                  <div className="text-[10px] text-muted-foreground">
                    Display maintenance alert to storefront visitors
                  </div>
                </div>
                <Switch
                  checked={settings?.maintenance ?? false}
                  onCheckedChange={handleToggleMaintenance}
                />
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Store Name:</span>
                <span className="font-semibold">{settings?.storeName || "DataFlex"}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">MoMo Receiver:</span>
                <span className="font-mono font-medium">
                  {settings?.momoNumber || "0244000111"}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Support:</span>
                <span className="font-medium">{settings?.supportPhone || "0244000111"}</span>
              </div>
            </div>

            <Button asChild variant="outline" size="sm" className="mt-4 w-full">
              <Link to="/admin/settings">Configure All Settings</Link>
            </Button>
          </Card>

          {/* Quick Payouts Card */}
          <Card className="glass border-0 p-6">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium text-muted-foreground">Available to Withdraw</div>
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2 font-display text-2xl font-bold text-gradient-gold">
              {formatGHS(a.revenue)}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Direct payout to MTN Mobile Money with 4-digit PIN verification.
            </p>
            <Button asChild className="mt-4 gradient-gold w-full text-primary-foreground">
              <Link to="/admin/withdraw">Initiate Payout</Link>
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  badge,
  badgeColor,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
}) {
  return (
    <Card className="glass border-0 p-5 transition hover:translate-y-[-2px] hover:shadow-lg">
      <div className="flex items-start justify-between">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <div className="font-display text-2xl font-bold tracking-tight">{value}</div>
        {badge && (
          <span
            className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${badgeColor || "text-primary bg-primary/10"}`}
          >
            {badge}
          </span>
        )}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </Card>
  );
}
