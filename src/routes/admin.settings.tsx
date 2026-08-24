import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Loader2,
  Save,
  Store,
  Sliders,
  Shield,
  Phone,
  Mail,
  Smartphone,
  CheckCircle2,
  Server,
  Database,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { loadSettings, saveSettings, type AdminSettings } from "@/lib/admin-data";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const [s, setS] = useState<AdminSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [supabaseConnected, setSupabaseConnected] = useState(isSupabaseConfigured());

  useEffect(() => {
    loadSettings().then(setS);

    const channel = supabase
      .channel("admin-settings-sync-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "settings" }, () => {
        loadSettings().then(setS);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (!s) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const save = async () => {
    setSaving(true);
    try {
      const updated = await saveSettings(s);
      setS(updated);
      toast.success("Store settings updated & published to live customers!");
    } catch {
      toast.error("Failed to save settings to Supabase");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Store & Operations Configuration
            </h1>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 text-xs">
              Live Database Sync
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure brand identity, payment routing, customer support hotlines, and platform
            automation.
          </p>
        </div>

        <Button
          onClick={save}
          disabled={saving}
          className="gradient-gold text-primary-foreground glow gap-1.5"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          <span>{saving ? "Saving..." : "Save Settings"}</span>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Store Profile & Contact Info */}
        <Card className="glass border-0 p-6 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <Store className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">Storefront Branding & Hotlines</h2>
          </div>

          <Field label="Storefront Name" icon={Sparkles}>
            <Input
              value={s.storeName}
              onChange={(e) => setS({ ...s, storeName: e.target.value })}
              placeholder="DataFlex"
            />
          </Field>

          <Field label="Mobile Money Receiving Number" icon={Smartphone}>
            <Input
              value={s.momoNumber}
              onChange={(e) => setS({ ...s, momoNumber: e.target.value })}
              placeholder="0244000111"
            />
            <p className="text-[10px] text-muted-foreground">
              Customers will see this number during MoMo checkout payment prompts.
            </p>
          </Field>

          <Field label="Customer Support Email" icon={Mail}>
            <Input
              type="email"
              value={s.supportEmail}
              onChange={(e) => setS({ ...s, supportEmail: e.target.value })}
              placeholder="support@dataflex.gh"
            />
          </Field>

          <Field label="Support Phone / WhatsApp" icon={Phone}>
            <Input
              value={s.supportPhone}
              onChange={(e) => setS({ ...s, supportPhone: e.target.value })}
              placeholder="0244000111"
            />
          </Field>
        </Card>

        {/* Automation & Safety */}
        <div className="space-y-6">
          <Card className="glass border-0 p-6 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border/40">
              <Sliders className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold">Platform Automation & Status</h2>
            </div>

            <div className="space-y-4">
              <Toggle
                label="Auto-Approve Orders"
                desc="Instantly mark orders as Processing upon verified MoMo payment"
                checked={s.autoApprove}
                onChange={(v) => setS({ ...s, autoApprove: v })}
              />

              <Toggle
                label="Storefront Maintenance Mode"
                desc="Show a friendly maintenance alert to visitors and pause new checkouts"
                checked={s.maintenance}
                onChange={(v) => setS({ ...s, maintenance: v, maintenanceMode: v })}
              />

              <Field label="Minimum Admin Withdrawal (GHS)" icon={Shield}>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={s.minWithdrawal || 10}
                  onChange={(e) => setS({ ...s, minWithdrawal: Number(e.target.value) })}
                />
              </Field>
            </div>
          </Card>

          {/* Database Connection Status */}
          <Card className="glass border-0 p-5 bg-card/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-emerald-500" />
                <span className="text-xs font-semibold">Supabase Cloud Engine</span>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]">
                Connected
              </Badge>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              All data (orders, user wallets, notifications, bundles) are synchronized in real-time
              with your PostgreSQL tables.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5 text-primary" />}
        <span>{label}</span>
      </div>
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
    <div className="flex items-center justify-between rounded-xl border border-border/50 bg-card/30 p-3.5">
      <div className="space-y-0.5 max-w-[80%]">
        <div className="text-xs font-semibold">{label}</div>
        <div className="text-[11px] text-muted-foreground leading-tight">{desc}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
