import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, Megaphone, Package, Settings, CreditCard, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  loadNotifications,
  loadNotificationsFor,
  saveNotifications,
  type AppNotification,
} from "@/lib/mock-data";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/admin/notifications")({
  component: AdminNotifications,
});

const icons = {
  order: Package,
  announcement: Megaphone,
  system: Settings,
  payment: CreditCard,
} as const;

type Filter = "all" | "order" | "payment" | "announcement" | "system";

function AdminNotifications() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [filter, setFilter] = useState<Filter>("all");

  const refresh = () => setItems(loadNotificationsFor("admin"));
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, []);

  const visible = useMemo(
    () => (filter === "all" ? items : items.filter((n) => n.type === filter)),
    [items, filter],
  );
  const unread = items.filter((n) => !n.read).length;

  const persist = (updater: (all: AppNotification[]) => AppNotification[]) => {
    saveNotifications(updater(loadNotifications()));
    refresh();
  };

  const markAll = () =>
    persist((all) =>
      all.map((n) => ((n.audience ?? "customer") !== "customer" ? { ...n, read: true } : n)),
    );

  const markOne = (id: string) =>
    persist((all) => all.map((n) => (n.id === id ? { ...n, read: true } : n)));

  const clearRead = () => persist((all) => all.filter((n) => !n.read));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Delivery updates, payment failures, and system events.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <SelectTrigger className="h-9 w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["all", "order", "payment", "announcement", "system"] as Filter[]).map((f) => (
                <SelectItem key={f} value={f} className="capitalize">
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={markAll} disabled={unread === 0}>
            <CheckCheck className="mr-1 h-4 w-4" /> Mark all read
          </Button>
          <Button variant="ghost" size="sm" onClick={clearRead}>
            <Trash2 className="mr-1 h-4 w-4" /> Clear read
          </Button>
        </div>
      </div>

      <Card className="glass border-0">
        {visible.length === 0 ? (
          <div className="p-16 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10">
              <Bell className="h-6 w-6 text-primary" />
            </div>
            <div className="mt-4 text-sm font-medium">Nothing here yet</div>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {visible.map((n) => {
              const Icon = icons[n.type] ?? Settings;
              return (
                <button
                  key={n.id}
                  onClick={() => markOne(n.id)}
                  className="flex w-full items-start gap-3 p-4 text-left transition hover:bg-primary/5"
                >
                  <div
                    className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                      n.read ? "bg-muted" : "gradient-gold"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 ${n.read ? "text-muted-foreground" : "text-primary-foreground"}`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-sm ${n.read ? "font-medium" : "font-semibold"}`}>
                        {n.title}
                      </span>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {n.type}
                      </Badge>
                      {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                    </div>
                    <p className="mt-0.5 break-words text-xs text-muted-foreground">{n.message}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
