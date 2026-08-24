import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import { Switch } from "@/components/ui/switch";
import { Bell } from "lucide-react";
import {
  CHANNELS,
  TOPICS,
  loadNotificationPrefs,
  saveNotificationPrefs,
  type NotificationChannel,
  type NotificationPrefs,
  type NotificationTopic,
} from "@/lib/notification-prefs";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const onSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    await new Promise((r) => setTimeout(r, 500));
    updateUser({
      name: String(fd.get("name")),
      email: String(fd.get("email")),
      phone: String(fd.get("phone")),
    });
    toast.success("Profile updated");
    setSaving(false);
  };

  const onPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await new Promise((r) => setTimeout(r, 500));
    toast.success("Password changed");
    (e.target as HTMLFormElement).reset();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your account settings.</p>
      </div>

      <Card className="glass border-0 p-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="gradient-gold text-xl font-bold text-primary-foreground">
              {user.name.slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-semibold">{user.name}</div>
            <div className="text-xs text-muted-foreground">
              Joined {new Date(user.createdAt).toLocaleDateString()}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => toast("Coming soon")}
          >
            Change photo
          </Button>
        </div>

        <Separator className="my-6" />

        <form onSubmit={onSave} className="space-y-4">
          <h2 className="text-sm font-semibold">Personal information</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" name="name" defaultValue={user.name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={user.phone ?? ""}
                placeholder="0244123456"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={user.email} required />
            </div>
          </div>
          <Button type="submit" disabled={saving} className="gradient-gold text-primary-foreground">
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </Card>

      <Card className="glass border-0 p-6">
        <form onSubmit={onPassword} className="space-y-4">
          <h2 className="text-sm font-semibold">Change password</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="cur">Current password</Label>
              <Input id="cur" type="password" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new">New password</Label>
              <Input id="new" type="password" required minLength={6} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="conf">Confirm</Label>
              <Input id="conf" type="password" required minLength={6} />
            </div>
          </div>
          <Button type="submit" variant="outline">
            Update password
          </Button>
        </form>
      </Card>

      <NotificationPreferences userId={user.email?.toLowerCase() ?? "guest"} />
    </div>
  );
}

function NotificationPreferences({ userId }: { userId: string }) {
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);

  useEffect(() => {
    setPrefs(loadNotificationPrefs(userId));
  }, [userId]);

  const toggle = (topic: NotificationTopic, channel: NotificationChannel, value: boolean) => {
    if (!prefs) return;
    const next: NotificationPrefs = {
      ...prefs,
      [topic]: { ...prefs[topic], [channel]: value },
    };
    setPrefs(next);
    saveNotificationPrefs(userId, next);
    toast.success("Notification preferences updated");
  };

  if (!prefs) return null;

  return (
    <Card className="glass border-0 p-6">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-primary" />
        <h2 className="font-display text-lg font-semibold">Notification preferences</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose how you want to hear about delivery updates and payment failures.
      </p>
      <Separator className="my-4" />
      <div className="space-y-5">
        {TOPICS.map((t) => (
          <div key={t.key} className="rounded-xl border border-border/50 p-4">
            <div className="text-sm font-medium">{t.label}</div>
            <div className="text-xs text-muted-foreground">{t.description}</div>
            <div className="mt-3 flex flex-wrap gap-4">
              {CHANNELS.map((c) => (
                <label key={c.key} className="flex items-center gap-2 text-xs">
                  <Switch
                    checked={prefs[t.key][c.key]}
                    onCheckedChange={(v) => toggle(t.key, c.key, v)}
                  />
                  {c.label}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
