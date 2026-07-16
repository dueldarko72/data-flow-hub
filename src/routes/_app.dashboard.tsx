import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Wallet,
  ShoppingBag,
  TrendingUp,
  Bell,
  CheckCircle2,
  Clock,
  Zap,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { loadOrders, loadNotifications, formatGHS, type Order, type AppNotification } from "@/lib/mock-data";
import { StatusBadge } from "@/components/status-badge";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifs, setNotifs] = useState<AppNotification[]>([]);

  useEffect(() => {
    setOrders(loadOrders());
    setNotifs(loadNotifications());
  }, []);

  const totalSpent = orders.filter((o) => o.status === "completed").reduce((s, o) => s + o.amount, 0);
  const completed = orders.filter((o) => o.status === "completed").length;
  const pending = orders.filter((o) => o.status === "pending" || o.status === "processing").length;
  const unread = notifs.filter((n) => !n.read).length;

  const profileFields = [user?.name, user?.email, user?.phone, user?.avatarUrl];
  const completion = Math.round((profileFields.filter(Boolean).length / profileFields.length) * 100);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="hero-bg glass overflow-hidden rounded-3xl p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Welcome back</div>
            <h1 className="mt-1 font-display text-3xl font-bold">
              Hey, <span className="text-gradient-gold">{user?.name?.split(" ")[0]}</span> 👋
            </h1>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Ready to top up? Grab a bundle in seconds — MTN data is live and instant.
            </p>
          </div>
          <Button asChild size="lg" className="gradient-gold text-primary-foreground hover:opacity-90 glow">
            <Link to="/buy">
              <Zap className="mr-2 h-4 w-4" /> Quick Buy
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Wallet balance" value={formatGHS(0)} icon={Wallet} sub="Top-up coming soon" />
        <StatCard label="Total spent" value={formatGHS(totalSpent)} icon={TrendingUp} sub={`${completed} orders`} />
        <StatCard label="Active orders" value={String(pending)} icon={Clock} sub="Pending + processing" />
        <StatCard label="Total orders" value={String(orders.length)} icon={ShoppingBag} sub="All time" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent purchases */}
        <Card className="glass border-0 lg:col-span-2">
          <div className="flex items-center justify-between p-6 pb-3">
            <h2 className="text-lg font-semibold">Recent purchases</h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/orders">
                View all <ArrowUpRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>
          <div className="px-6 pb-6">
            {orders.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="divide-y divide-border/50">
                {orders.slice(0, 5).map((o) => (
                  <div key={o.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-xl gradient-gold">
                        <ShoppingBag className="h-4 w-4 text-primary-foreground" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">{o.bundleName}</div>
                        <div className="text-xs text-muted-foreground">
                          {o.recipient} • {new Date(o.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right text-sm font-semibold">{formatGHS(o.amount)}</div>
                      <StatusBadge status={o.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-6">
          {/* Notifications */}
          <Card className="glass border-0 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Notifications</h2>
              {unread > 0 && (
                <Badge className="gradient-gold text-primary-foreground">{unread} new</Badge>
              )}
            </div>
            <div className="mt-4 space-y-3">
              {notifs.slice(0, 3).map((n) => (
                <div key={n.id} className="flex gap-3">
                  <div className="mt-0.5">
                    <Bell className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{n.title}</div>
                    <div className="truncate text-xs text-muted-foreground">{n.message}</div>
                  </div>
                </div>
              ))}
            </div>
            <Button asChild variant="ghost" size="sm" className="mt-3 w-full">
              <Link to="/notifications">See all</Link>
            </Button>
          </Card>

          {/* Profile completion */}
          <Card className="glass border-0 p-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Profile completion</h2>
            </div>
            <div className="mt-3">
              <div className="mb-2 flex justify-between text-xs">
                <span className="text-muted-foreground">{completion}% complete</span>
              </div>
              <Progress value={completion} className="h-2" />
            </div>
            <Button asChild variant="outline" size="sm" className="mt-4 w-full">
              <Link to="/profile">Complete profile</Link>
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

function EmptyState() {
  return (
    <div className="py-12 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10">
        <ShoppingBag className="h-6 w-6 text-primary" />
      </div>
      <div className="mt-4 text-sm font-medium">No orders yet</div>
      <p className="mt-1 text-xs text-muted-foreground">Buy your first bundle to get started.</p>
      <Button asChild size="sm" className="mt-4 gradient-gold text-primary-foreground">
        <Link to="/buy">Buy data</Link>
      </Button>
    </div>
  );
}
