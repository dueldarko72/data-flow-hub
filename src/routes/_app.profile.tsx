import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
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
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => toast("Coming soon")}>
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
              <Input id="phone" name="phone" defaultValue={user.phone ?? ""} placeholder="0244123456" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={user.email} required />
            </div>
          </div>
          <Button
            type="submit"
            disabled={saving}
            className="gradient-gold text-primary-foreground"
          >
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
          <Button type="submit" variant="outline">Update password</Button>
        </form>
      </Card>
    </div>
  );
}
