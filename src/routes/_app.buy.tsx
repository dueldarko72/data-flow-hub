import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Loader2,
  Phone,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Smartphone,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatGHS, addOrder, pushNotification, type Bundle } from "@/lib/mock-data";
import { DEFAULT_USER_CATALOG, ensureAdminUser, loadSettings } from "@/lib/admin-data";
import { useAuth } from "@/lib/auth";
import { messageFor } from "@/lib/security";
import { openPaystackCheckout, type PaystackPaymentChannel } from "@/lib/paystack";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/buy")({
  component: BuyPage,
});

type Status = "idle" | "processing" | "success" | "error";

function BuyPage() {
  const navigate = useNavigate();
  const { user, registerQuick, updateUser } = useAuth();
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [method, setMethod] = useState("all");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [reference, setReference] = useState("");
  const [changeOpen, setChangeOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [paystackKey, setPaystackKey] = useState<string | undefined>(undefined);

  const recipient = user?.phone ?? "";

  useEffect(() => {
    async function initBundle() {
      try {
        const raw = sessionStorage.getItem("datahub-selected-bundle");
        if (raw) {
          setBundle(JSON.parse(raw));
          return;
        }
      } catch {}
      const { loadUserBundles } = await import("@/lib/admin-data");
      const bundles = await loadUserBundles(user?.id || "guest");
      if (bundles.length > 0) {
        setBundle(bundles[0]);
      } else {
        setBundle(DEFAULT_USER_CATALOG[0]);
      }
    }
    initBundle();

    loadSettings().then((s) => {
      if (s.paystackPublicKey) {
        setPaystackKey(s.paystackPublicKey);
      }
    });
  }, [user?.id]);

  const handlePay = async () => {
    if (!bundle || !recipient) {
      toast.error("Please ensure a valid recipient number is selected.");
      return;
    }

    setStatus("processing");
    setErrorMsg("");

    const ref = `DF-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const cleanEmail = (user?.email || "").trim();
    const customerEmail =
      cleanEmail.length > 3 && cleanEmail.includes("@")
        ? cleanEmail
        : `customer_${recipient.replace(/[^0-9a-zA-Z]/g, "") || "user"}@dataflex.gh`;

    let channels: PaystackPaymentChannel[] | undefined = undefined;
    if (method === "momo") {
      channels = ["mobile_money"];
    } else if (method === "card") {
      channels = ["card"];
    }

    try {
      await openPaystackCheckout({
        key: paystackKey,
        email: customerEmail,
        amount: bundle.price,
        currency: "GHS",
        reference: ref,
        channels,
        metadata: {
          custom_fields: [
            { display_name: "Recipient", variable_name: "recipient", value: recipient },
            { display_name: "Bundle", variable_name: "bundle", value: `${bundle.name} (${bundle.gb}GB)` },
            { display_name: "Network", variable_name: "network", value: bundle.network },
          ],
        },
        onSuccess: async (res) => {
          setStatus("processing");
          try {
            const confirmedRef = res.reference || ref;
            setReference(confirmedRef);

            const methodLabel =
              method === "momo"
                ? "Paystack (MoMo)"
                : method === "card"
                  ? "Paystack (Card)"
                  : "Paystack";

            // Create order in Supabase
            await addOrder(
              {
                id: crypto.randomUUID(),
                reference: confirmedRef,
                bundleId: bundle.id,
                bundleName: bundle.name,
                network: bundle.network,
                gb: bundle.gb,
                amount: bundle.price,
                recipient,
                status: "pending",
                group: bundle.group ?? "fast",
                createdAt: new Date().toISOString(),
                paymentMethod: methodLabel,
              },
              user?.id,
            );

            // Record transaction log if user has an account
            if (user?.id) {
              const { createSupabaseTransaction } = await import("@/lib/supabase-api");
              await createSupabaseTransaction({
                userId: user.id,
                type: "debit",
                title: `Purchase: ${bundle.name} (${bundle.gb}GB)`,
                amount: bundle.price,
                reference: confirmedRef,
              });
            }

            // Notification
            await pushNotification({
              id: crypto.randomUUID(),
              audience: "all",
              title: "Payment confirmed ✅",
              message: `${bundle.name} delivery started for ${recipient} (Ref: ${confirmedRef})`,
              createdAt: new Date().toISOString(),
              read: false,
              type: "order",
              userId: user?.id,
            });

            try {
              sessionStorage.removeItem("datahub-selected-bundle");
            } catch {}

            setStatus("success");
            toast.success("Payment verified! Your data is being delivered.");
          } catch (insertError: unknown) {
            console.error("Order recording error:", insertError);
            const errObj = insertError as { message?: string } | undefined;
            setStatus("error");
            setErrorMsg(
              `Payment was approved by Paystack, but saving the order had an issue: ${errObj?.message || String(insertError)}. Please contact support with reference ${ref}`,
            );
          }
        },
        onCancel: () => {
          setStatus("idle");
          toast.info("Payment window closed. You can retry at any time.");
        },
        onError: (err) => {
          console.error("Paystack initialization error:", err);
          setStatus("error");
          const msg = err?.message || "Failed to initialize Paystack.";
          setErrorMsg(msg);
          toast.error(msg);
        },
      });
      // Modal has successfully opened
      setStatus("idle");
    } catch (err: unknown) {
      console.error("Payment initiation failed:", err);
      setStatus("error");
      const errObj = err as { message?: string } | undefined;
      const msg = errObj?.message || "Failed to launch Paystack gateway.";
      setErrorMsg(msg);
      toast.error(msg);
    }
  };

  const handleChangeNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone) return;
    setSubmitting(true);
    try {
      await registerQuick(form.name, form.email, form.phone);
      ensureAdminUser({ name: form.name, email: form.email, phone: form.phone });
      toast.success("Signed in with the new number");
      setChangeOpen(false);
      setStatus("idle");
    } catch (err) {
      toast.error(messageFor(err, "Could not sign in. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  if (!bundle) {
    return (
      <div className="mx-auto max-w-3xl">
        <Card className="glass border-0 p-6 text-center text-sm text-muted-foreground">
          No bundle selected.{" "}
          <Link to="/" className="text-primary underline">
            Pick one
          </Link>
          .
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Buy data</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Confirm your registered number and pay — done.
        </p>
      </div>

      {/* Selected bundle summary */}
      <Card className="glass border-0 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">
              {bundle.network} • {bundle.validity}
            </div>
            <div className="font-display text-xl font-bold">
              {bundle.name} ({bundle.gb}GB)
            </div>
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
              <Button variant="outline" onClick={() => navigate({ to: "/" })}>
                Back home
              </Button>
              <Button
                className="gradient-gold text-primary-foreground"
                onClick={() => navigate({ to: "/orders" })}
              >
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
                  value={recipient || "No registered number"}
                  readOnly
                  disabled
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
                Your registered number is used automatically and cannot be edited here.
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
              <RadioGroup value={method} onValueChange={setMethod} className="space-y-2">
                {[
                  {
                    v: "all",
                    label: "Paystack (Mobile Money & Cards)",
                    sub: "MTN, Telecel, AT Money, Visa, Mastercard",
                    badge: "Recommended",
                    icon: Zap,
                  },
                  {
                    v: "momo",
                    label: "Mobile Money",
                    sub: "MTN MoMo, Telecel Cash & AT Money via Paystack",
                    badge: null,
                    icon: Smartphone,
                  },
                  {
                    v: "card",
                    label: "Debit / Credit Card",
                    sub: "Visa, Mastercard, Verve via Paystack",
                    badge: null,
                    icon: CreditCard,
                  },
                ].map((m) => {
                  const Icon = m.icon;
                  return (
                    <label
                      key={m.v}
                      className={`flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition ${
                        method === m.v ? "border-primary bg-primary/5 shadow-sm" : "border-border/60 hover:bg-card/50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 rounded-lg p-2 ${method === m.v ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">{m.label}</span>
                            {m.badge && (
                              <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] px-1.5 py-0">
                                {m.badge}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{m.sub}</p>
                        </div>
                      </div>
                      <RadioGroupItem value={m.v} />
                    </label>
                  );
                })}
              </RadioGroup>
            </div>

            {status === "error" && (
              <div className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <div className="text-sm">
                  <div className="font-semibold text-destructive">Payment failed</div>
                  <p className="text-muted-foreground">{errorMsg}</p>
                </div>
              </div>
            )}

            {status === "processing" && (
              <div className="flex items-center gap-3 rounded-xl border border-border p-4 text-sm text-muted-foreground bg-primary/5">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Opening Paystack secure checkout window…
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => navigate({ to: "/" })}
                disabled={status === "processing"}
              >
                Cancel
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
                  <>
                    <RotateCcw className="mr-2 h-4 w-4" /> Retry payment
                  </>
                ) : (
                  `Pay ${formatGHS(bundle.price)}`
                )}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Change number = sign in as a new user */}
      <Dialog open={changeOpen} onOpenChange={setChangeOpen}>
        <DialogContent className="glass border-0 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign in with another number</DialogTitle>
            <DialogDescription>
              Create a new customer profile — the bundle is delivered to this number.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangeNumber} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="cn-name">User name</Label>
              <Input
                id="cn-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cn-email">Email</Label>
              <Input
                id="cn-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cn-phone">Phone number</Label>
              <Input
                id="cn-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full gradient-gold text-primary-foreground hover:opacity-90"
            >
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
