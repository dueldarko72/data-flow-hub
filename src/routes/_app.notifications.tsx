import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, CheckCheck, CreditCard, Megaphone, Package, Settings } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  loadNotifications,
  loadNotificationsFor,
  saveNotifications,
  type AppNotification,
} from "@/lib/mock-data";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_app/notifications")({
  component: NotificationsPage,
});

const icons = {
  order: Package,
  announcement: Megaphone,
  system: Settings,
  payment: CreditCard,
} as const;

function NotificationsPage() {
  const [items, setItems] = useState<AppNotification[]>([]);

  useEffect(() => {
    setItems(loadNotificationsFor("customer"));
  }, []);

  const persist = (updater: (all: AppNotification[]) => AppNotification[]) => {
    saveNotifications(updater(loadNotifications()));
    setItems(loadNotificationsFor("customer"));
  };

  const markAll = () =>
    persist((all) =>
      all.map((n) => ((n.audience ?? "customer") !== "admin" ? { ...n, read: true } : n)),
    );

  const toggle = (id: string) =>
    persist((all) => all.map((n) => (n.id === id ? { ...n, read: true } : n)));

  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unread > 0 ? `${unread} unread` : "You're all caught up"}
          </p>
        </div>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={markAll}>
            <CheckCheck className="mr-1 h-4 w-4" /> Mark all as read
          </Button>
        )}
      </div>

      <Card className="glass border-0">
        {items.length === 0 ? (
          <div className="p-16 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10">
              <Bell className="h-6 w-6 text-primary" />
            </div>
            <div className="mt-4 text-sm font-medium">No notifications</div>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {items.map((n) => {
              const Icon = icons[n.type] ?? Settings;
              return (
                <button
                  key={n.id}
                  onClick={() => toggle(n.id)}
                  className="flex w-full items-start gap-3 p-4 text-left transition hover:bg-primary/5"
                >
                  <div
                    className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                      n.read ? "bg-muted" : "gradient-gold"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${n.read ? "text-muted-foreground" : "text-primary-foreground"}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${n.read ? "font-medium" : "font-semibold"}`}>
                        {n.title}
                      </span>
                      {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{n.message}</p>
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
