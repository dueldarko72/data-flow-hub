import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { loadSettings, saveSettings, type AdminSettings } from "@/lib/admin-data";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const [s, setS] = useState<AdminSettings | null>(null);

  useEffect(() => {
    setS(loadSettings());
  }, []);

  if (!s) return null;

  const save = () => {
    saveSettings(s);
    toast.success("Settings saved");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Store branding, support contacts and operations.</p>
      </div>

      <Card className="glass border-0 p-6">
        <h2 className="text-sm font-semibold">Store</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Store name">
            <Input value={s.storeName} onChange={(e) => setS({ ...s, storeName: e.target.value })} />
          </Field>
          <Field label="MoMo receiving number">
            <Input value={s.momoNumber} onChange={(e) => setS({ ...s, momoNumber: e.target.value })} />
          </Field>
          <Field label="Support email">
            <Input value={s.supportEmail} onChange={(e) => setS({ ...s, supportEmail: e.target.value })} />
          </Field>
          <Field label="Support phone">
            <Input value={s.supportPhone} onChange={(e) => setS({ ...s, supportPhone: e.target.value })} />
          </Field>
        </div>
      </Card>

      <Card className="glass border-0 p-6">
        <h2 className="text-sm font-semibold">Operations</h2>
        <div className="mt-4 space-y-3">
          <Toggle
            label="Auto-approve orders"
            desc="Orders are marked processing immediately on payment."
            checked={s.autoApprove}
            onChange={(v) => setS({ ...s, autoApprove: v })}
          />
          <Toggle
            label="Maintenance mode"
            desc="Show a maintenance banner to customers and pause new orders."
            checked={s.maintenance}
            onChange={(v) => setS({ ...s, maintenance: v })}
          />
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} className="gradient-gold text-primary-foreground">
          <Save className="mr-1 h-4 w-4" /> Save changes
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function Toggle({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
