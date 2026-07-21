import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { TrendingUp, Users, ShoppingBag, Database, ArrowUpRight } from "lucide-react";
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
import { loadOrders, formatGHS, type Order } from "@/lib/mock-data";
import { computeAnalytics, loadUsers, type AdminUser } from "@/lib/admin-data";
import { StatusBadge } from "@/components/status-badge";

export const Route = createFileRoute("/admin/")({
  component: AdminOverview,
});

function AdminOverview() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);

  useEffect(() => {
    setOrders(loadOrders());
    setUsers(loadUsers());
  }, []);

  const a = useMemo(() => computeAnalytics(orders), [orders]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">Real-time performance across the marketplace.</p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">

        <Stat label="Revenue" value={formatGHS(a.revenue)} sub={`${a.completed} completed`} icon={TrendingUp} />
        <Stat label="Orders" value={String(orders.length)} sub="All time" icon={ShoppingBag} />
        <Stat label="Data sold" value={`${a.gbSold} GB`} sub="Completed" icon={Database} />
        <Stat label="Customers" value={String(users.length)} sub={`${users.filter((u) => u.status === "active").length} active`} icon={Users} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="glass border-0 p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Revenue — last 7 days</h2>
              <p className="text-xs text-muted-foreground">Daily completed order revenue</p>
            </div>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <AreaChart data={a.days} margin={{ left: -20, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => formatGHS(v)}
                />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#rev)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="glass border-0 p-6">
          <h2 className="text-lg font-semibold">Top bundles</h2>
          <p className="text-xs text-muted-foreground">By revenue</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <BarChart data={a.topBundles} margin={{ left: -20, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => formatGHS(v)}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="glass border-0">
        <div className="flex items-center justify-between p-4 pb-3 sm:p-6 sm:pb-3">
          <h2 className="text-lg font-semibold">Recent orders</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin/orders">
              Manage <ArrowUpRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
        <div className="px-4 pb-4 sm:px-6 sm:pb-6">
          {orders.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No orders yet.</div>
          ) : (
            <div className="divide-y divide-border/50">
              {orders.slice(0, 6).map((o) => (
                <div key={o.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{o.bundleName} → {o.recipient}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {o.reference} • {new Date(o.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:shrink-0">
                    <div className="text-sm font-semibold">{formatGHS(o.amount)}</div>
                    <StatusBadge status={o.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ElementType;
}) {
  return (
    <Card className="glass border-0 p-5">
      <div className="flex items-start justify-between">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      <div className="mt-3 font-display text-2xl font-bold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </Card>
  );
}
