import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CheckCheck,
  Megaphone,
  Package,
  Settings,
  CreditCard,
  Trash2,
  RefreshCw,
  Check,
} from "lucide-react";
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
import { loadNotificationsFor, type AppNotification } from "@/lib/mock-data";
import {
  markSupabaseNotificationRead,
  deleteSupabaseNotification,
  clearSupabaseReadNotifications,
} from "@/lib/supabase-api";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

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
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await loadNotificationsFor("admin");
      setItems(data);
    } catch (e) {
      console.error("Failed to load notifications:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();

    const channel = supabase
      .channel("admin-notifications-realtime-sub")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {
        refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const visible = useMemo(
    () => (filter === "all" ? items : items.filter((n) => n.type === filter)),
    [items, filter],
  );
  const unread = items.filter((n) => !n.read).length;

  const markAll = async () => {
    for (const item of items) {
      if (!item.read) {
        await markSupabaseNotificationRead(item.id);
      }
    }
    await refresh();
    toast.success("All notifications marked as read");
  };

  const markOne = async (id: string) => {
    await markSupabaseNotificationRead(id);
    await refresh();
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteSupabaseNotification(id);
    await refresh();
    toast.success("Notification deleted");
  };

  const clearRead = async () => {
    await clearSupabaseReadNotifications();
    await refresh();
    toast.success("Cleared read notifications");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              System Notifications
            </h1>
            {unread > 0 && (
              <Badge className="bg-primary text-primary-foreground text-xs">{unread} Unread</Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Delivery triggers, checkout updates, failed payments, and administrative alerts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <SelectTrigger className="h-9 w-[150px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["all", "order", "payment", "announcement", "system"] as Filter[]).map((f) => (
                <SelectItem key={f} value={f} className="capitalize text-xs">
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={markAll}
            disabled={unread === 0}
            className="h-9 text-xs gap-1"
          >
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={clearRead}
            className="h-9 text-xs gap-1 text-muted-foreground hover:text-foreground"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear read
          </Button>
        </div>
      </div>

      <Card className="glass border-0 overflow-hidden">
        {visible.length === 0 ? (
          <div className="p-16 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10">
              <Bell className="h-6 w-6 text-primary" />
            </div>
            <div className="mt-4 text-sm font-semibold">No notifications found</div>
            <p className="mt-1 text-xs text-muted-foreground">
              New customer activity and orders will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {visible.map((n) => {
              const Icon = icons[n.type] ?? Settings;
              return (
                <div
                  key={n.id}
                  onClick={() => markOne(n.id)}
                  className={`flex w-full items-start justify-between gap-3 p-4 text-left transition cursor-pointer hover:bg-card/40 ${
                    n.read ? "opacity-75" : "bg-primary/[0.02]"
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div
                      className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                        n.read
                          ? "bg-muted text-muted-foreground"
                          : "gradient-gold text-primary-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-sm ${n.read ? "font-medium" : "font-bold text-foreground"}`}
                        >
                          {n.title}
                        </span>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {n.type}
                        </Badge>
                        {!n.read && <span className="h-2 w-2 rounded-full bg-primary" />}
                      </div>
                      <p className="mt-0.5 break-words text-xs text-muted-foreground">
                        {n.message}
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => handleDelete(e, n.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                    title="Delete notification"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
