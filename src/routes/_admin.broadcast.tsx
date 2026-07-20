import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Megaphone, Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { broadcast } from "@/lib/admin-data";
import { loadNotifications, type AppNotification } from "@/lib/mock-data";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_admin/broadcast")({
  component: BroadcastPage,
});

function BroadcastPage() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [items, setItems] = useState<AppNotification[]>([]);

  useEffect(() => {
    refresh();
  }, []);

  const refresh = () => setItems(loadNotifications().filter((n) => n.type === "announcement"));

  const send = () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Add a title and message");
      return;
    }
    broadcast(title, message);
    setTitle("");
    setMessage("");
    refresh();
    toast.success("Broadcast sent to all customers");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Broadcast</h1>
        <p className="mt-1 text-sm text-muted-foreground">Send announcements to every customer inbox.</p>
      </div>

      <Card className="glass border-0 p-6">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g. Weekend deal 🎉"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="msg">Message</Label>
            <Textarea
              id="msg"
              rows={4}
              placeholder="Tell your customers what's new"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={send} className="gradient-gold text-primary-foreground">
              <Send className="mr-1 h-4 w-4" /> Send broadcast
            </Button>
          </div>
        </div>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Past broadcasts</h2>
        <Card className="glass border-0">
          {items.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">No broadcasts yet.</div>
          ) : (
            <div className="divide-y divide-border/50">
              {items.map((n) => (
                <div key={n.id} className="flex items-start gap-3 p-4">
                  <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl gradient-gold">
                    <Megaphone className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{n.title}</div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{n.message}</p>
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
