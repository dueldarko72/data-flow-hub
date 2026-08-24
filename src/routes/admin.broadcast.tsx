import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Megaphone, Send, Bell, Users, Eye, Sparkles, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { loadNotifications, type AppNotification } from "@/lib/mock-data";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin/broadcast")({
  component: BroadcastPage,
});

function BroadcastPage() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState<"all" | "customer" | "admin">("all");
  const [items, setItems] = useState<AppNotification[]>([]);
  const [sending, setSending] = useState(false);

  const refresh = async () => {
    const all = await loadNotifications();
    setItems(all.filter((n) => n.type === "announcement"));
  };

  useEffect(() => {
    refresh();

    const channel = supabase
      .channel("admin-broadcasts-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {
        refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const send = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Please add a title and message for the announcement");
      return;
    }
    setSending(true);
    try {
      const { pushNotification } = await import("@/lib/mock-data");
      await pushNotification({
        title,
        message,
        createdAt: new Date().toISOString(),
        read: false,
        type: "announcement",
        audience,
      });
      setTitle("");
      setMessage("");
      await refresh();
      toast.success("Broadcast announcement sent to customer inboxes!");
    } catch {
      toast.error("Failed to send broadcast announcement");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Customer Broadcast Announcements
          </h1>
          <Badge variant="outline" className="border-primary/30 text-primary text-xs">
            Push Alerts
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Publish promotional updates, service maintenance advisories, or network alerts directly to
          customer notification centers.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Broadcast Form */}
        <Card className="glass border-0 p-6 lg:col-span-3">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="audience" className="text-xs font-semibold">
                Target Audience
              </Label>
              <Select
                value={audience}
                onValueChange={(v) => setAudience(v as "all" | "customer" | "admin")}
              >
                <SelectTrigger id="audience">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">📢 All Users (Customers & Admins)</SelectItem>
                  <SelectItem value="customer">👥 Customers Only</SelectItem>
                  <SelectItem value="admin">🛡️ Admins Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-xs font-semibold">
                Announcement Title
              </Label>
              <Input
                id="title"
                placeholder="e.g. Flash Promo: 5GB for GHS 22 🎉"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="msg" className="text-xs font-semibold">
                Message Body
              </Label>
              <Textarea
                id="msg"
                rows={4}
                placeholder="Write your announcement message here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={send}
                disabled={sending || !title.trim() || !message.trim()}
                className="gradient-gold text-primary-foreground glow"
              >
                <Send className="mr-1.5 h-4 w-4" />
                <span>{sending ? "Broadcasting..." : "Publish Broadcast"}</span>
              </Button>
            </div>
          </div>
        </Card>

        {/* Live Customer Preview Card */}
        <Card className="glass border-0 p-6 lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary mb-3">
              <Eye className="h-4 w-4" />
              <span>Live Customer Notification Preview</span>
            </div>

            <div className="rounded-2xl border border-primary/20 bg-card/60 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl gradient-gold">
                  <Megaphone className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">
                      {title.trim() || "Your Announcement Title"}
                    </span>
                    <Badge variant="outline" className="text-[9px]">
                      {audience}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground break-words">
                    {message.trim() ||
                      "This is how your broadcast message will appear inside the customer notification drawer in real-time."}
                  </p>
                  <p className="mt-1.5 text-[10px] text-muted-foreground font-mono">Just now</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-border/40 bg-card/30 p-3 text-[11px] text-muted-foreground">
            💡 Broadcasts appear immediately on customer notification feeds and pop up live on
            connected active sessions.
          </div>
        </Card>
      </div>

      {/* Broadcast History */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Past Broadcasts ({items.length})
          </h2>
          <Button size="sm" variant="ghost" onClick={refresh} className="h-7 text-xs gap-1">
            <RefreshCw className="h-3 w-3" /> Refresh
          </Button>
        </div>

        <Card className="glass border-0 overflow-hidden">
          {items.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No broadcast announcements published yet.
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {items.map((n) => (
                <div
                  key={n.id}
                  className="flex items-start gap-3.5 p-4 transition hover:bg-card/30"
                >
                  <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl gradient-gold">
                    <Megaphone className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold">{n.title}</div>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {n.audience || "all"}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground break-words">{n.message}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
