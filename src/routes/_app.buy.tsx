import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, Phone, CreditCard, AlertTriangle, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatGHS, addOrder, pushNotification, type Bundle } from "@/lib/mock-data";
import { DEFAULT_FAST, ensureAdminUser } from "@/lib/admin-data";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/buy")({
  component: BuyPage,
});

type Status = "idle" | "processing" | "success" | "error";

function BuyPage() {
  const navigate = useNavigate();
  const { user, signUp } = useAuth();
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [method, setMethod] = useState("momo");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [reference, setReference] = useState("");
  const [changeOpen, setChangeOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);

  const recipient = user?.phone ?? "";

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("datahub-selected-bundle");
      if (raw) {
        setBundle(JSON.parse(raw));
        return;
      }
    } catch {}
    setBundle(DEFAULT_FAST[0]);
  }, []);

  const handlePay = async () => {
    if (!bundle) return;
    if (!recipient) {
      setErrorMsg("No registered number found. Tap “Change number” to register one.");
      setStatus("error");
      return;
    }
    setStatus("processing");
    setErrorMsg("");
    try {
      await new Promise((r) => setTimeout(r, 1400));
      // Mock gateway: fails occasionally so the retry path is real.
      if (Math.random() < 0.15) throw new Error("Mobile Money request timed out.");

      const ref = "DF-" + Math.random().toString(36).slice(2, 8).toUpperCase();
      setReference(ref);
      addOrder({
        id: crypto.randomUUID(),
        reference: ref,
        bundleId: bundle.id,
        bundleName: bundle.name,
        network: bundle.network,
        gb: bundle.gb,
        amount: bundle.price,
        recipient,
        status: "pending",
        createdAt: new Date().toISOString(),
        paymentMethod: method === "momo" ? "MTN MoMo" : method,
      });
      pushNotification({
        id: crypto.randomUUID(),
        title: "Order received",
        message: `${bundle.name} to ${recipient} — reference ${ref}`,
        createdAt: new Date().toISOString(),
        read: false,
        type: "order",
      });
      try {
        sessionStorage.removeItem("datahub-selected-bundle");
      } catch {}
      setStatus("success");
      toast.success("Payment received. Order created!");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Payment failed. Please try again.");
      toast.error("Payment failed");
    }
  };

  const handleChangeNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone) return;
    setSubmitting(true);
    try {
      await signUp(form.name, form.email, form.phone, "password");
      ensureAdminUser(form);
      setChangeOpen(false);
      setStatus("idle");
      setErrorMsg("");
      toast.success("Number updated");
    } catch {
      toast.error("Could not register that number");
    } finally {
      setSubmitting(false);
    }
  };

  if (!bundle) {
    return (
      <div className="mx-auto max-w-3xl">
        <Card className="glass border-0 p-6 text-center text-sm text-muted-foreground">
          No bundle selected. <Link to="/" className="text-primary underline">Pick one</Link>.
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Buy data</h1>
        <p className="mt-1 text-sm text-muted-foreground">Confirm and pay — done.</p>
      </div>

      <Card className="glass border-0 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">{bundle.network} • {bundle.validity}</div>
            <div className="font-display text-xl font-bold">{bundle.name} ({bundle.gb}GB)</div>
          </div>
          <div className="text-lg font-bold text-gradient-gold">{formatGHS(bundle.price)}</div>
        </div>
      </Card>

      <Card className="glass border-0 p-6">
        {status === "success" ? (
          <div className="space-y-4 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <div>
              <h2 className="text-lg font-semibold">Payment successful</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {bundle.gb}GB is on its way to {recipient}. Reference{" "}
                <span className="font-mono font-medium">{reference}</span>.
              </p>
            </div>
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={() => navigate({ to: "/" })}>Back home</Button>
              <Button onClick={() => navigate({ to: "/orders" })} className="gradient-gold text-primary-foreground">
                View order
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="phone">Recipient number</Label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="phone"
                  className="pl-10"
                  value={recipient}
                  readOnly
                  disabled
                  placeholder="No registered number"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setForm({ name: "", email: "", phone: "" });
                  setChangeOpen(true);
                }}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Change number
              </button>
              <p className="text-xs text-muted-foreground">
                Your registered number is used for delivery and cannot be edited here.
              </p>
            </div>

            <div className="space-y-2 rounded-xl border border-border p-4 text-sm">
              <Row label="Network" value={bundle.network} />
              <Row label="Bundle" value={`${bundle.name} (${bundle.gb}GB)`} />
              <Row label="Validity" value={bundle.validity} />
              <Row label="Recipient" value={recipient || "—"} />
              <div className="border-t border-border pt-2">
                <Row label="Total" value={formatGHS(bundle.price)} bold />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Payment method</Label>
              <RadioGroup value={method} onValueChange={setMethod}>
                {[
                  { v: "momo", label: "MTN Mobile Money", ok: true },
                  { v: "card", label: "Card (coming soon)", ok: false },
                  { v: "bank", label: "Bank transfer (coming soon)", ok: false },
                ].map((m) => (
                  <label
                    key={m.v}
                    className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 ${
                      method === m.v ? "border-primary bg-primary/5" : "border-border"
                    } ${!m.ok ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-center gap-3 text-sm">
                      <CreditCard className="h-4 w-4" />
                      {m.label}
                    </div>
                    <RadioGroupItem value={m.v} disabled={!m.ok} />
                  </label>
                ))}
              </RadioGroup>
            </div>

            {status === "error" && (
              <div className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <div className="flex-1">
                  <div className="font-medium text-destructive">Transaction failed</div>
                  <p className="text-xs text-muted-foreground">{errorMsg}</p>
                </div>
                <Button size="sm" variant="outline" onClick={handlePay}>
                  <RotateCcw className="mr-1 h-3.5 w-3.5" /> Retry
                </Button>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => navigate({ to: "/" })} disabled={status === "processing"}>
                <ArrowLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              <Button
                onClick={handlePay}
                disabled={status === "processing" || !recipient}
                className="gradient-gold text-primary-foreground glow"
              >
                {status === "processing" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing…
                  </>
                ) : status === "error" ? (
                  `Try again — ${formatGHS(bundle.price)}`
                ) : (
                  `Pay ${formatGHS(bundle.price)}`
                )}
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Dialog open={changeOpen} onOpenChange={setChangeOpen}>
        <DialogContent className="glass border-0 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign in — new customer</DialogTitle>
            <DialogDescription>Register a new number to receive this bundle.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangeNumber} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="cn-name">User name</Label>
              <Input id="cn-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cn-email">Email</Label>
              <Input id="cn-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cn-phone">Phone number</Label>
              <Input id="cn-phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            </div>
            <Button type="submit" disabled={submitting} className="w-full gradient-gold text-primary-foreground">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? "font-bold text-gradient-gold" : "font-medium"}>{value}</span>
    </div>
  );
}
