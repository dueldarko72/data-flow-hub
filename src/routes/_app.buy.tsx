import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, ArrowLeft, Check, Loader2, Wifi, Phone, CreditCard } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { BUNDLES, formatGHS, addOrder, pushNotification, type Bundle } from "@/lib/mock-data";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/buy")({
  component: BuyPage,
});

type Step = 1 | 2 | 3 | 4;

function BuyPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [network, setNetwork] = useState<Bundle["network"]>("MTN");
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [recipient, setRecipient] = useState("");
  const [method, setMethod] = useState("momo");
  const [processing, setProcessing] = useState(false);

  const validPhone = /^0[235]\d{8}$/.test(recipient);

  const handlePay = async () => {
    if (!bundle) return;
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 1400));
    const ref = "DH-" + Math.random().toString(36).slice(2, 8).toUpperCase();
    const orderId = crypto.randomUUID();
    addOrder({
      id: orderId,
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
    toast.success("Payment received. Order created!");
    navigate({ to: "/orders" });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Buy data</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a bundle, add a recipient, pay — done.
        </p>
      </div>

      {/* Stepper */}
      <div className="glass flex items-center justify-between rounded-2xl p-3">
        {["Network", "Bundle", "Recipient", "Payment"].map((label, i) => {
          const s = (i + 1) as Step;
          const active = step === s;
          const done = step > s;
          return (
            <div key={label} className="flex flex-1 items-center gap-2">
              <div
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold transition ${
                  done
                    ? "gradient-gold text-primary-foreground"
                    : active
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : s}
              </div>
              <span className={`hidden text-xs font-medium sm:inline ${active ? "" : "text-muted-foreground"}`}>
                {label}
              </span>
              {i < 3 && <div className="mx-2 h-px flex-1 bg-border" />}
            </div>
          );
        })}
      </div>

      <Card className="glass border-0 p-6">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Choose network</h2>
            <RadioGroup value={network} onValueChange={(v) => setNetwork(v as Bundle["network"])}>
              {(["MTN", "Vodafone", "AirtelTigo"] as const).map((n) => (
                <label
                  key={n}
                  className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition ${
                    network === n ? "border-primary bg-primary/5" : "border-border"
                  } ${n !== "MTN" ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-lg gradient-gold">
                      <Wifi className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <div className="font-medium">{n}</div>
                      <div className="text-xs text-muted-foreground">
                        {n === "MTN" ? "Available now" : "Coming soon"}
                      </div>
                    </div>
                  </div>
                  <RadioGroupItem value={n} disabled={n !== "MTN"} />
                </label>
              ))}
            </RadioGroup>
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} className="gradient-gold text-primary-foreground">
                Next <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Choose bundle</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {BUNDLES.filter((b) => b.network === network).map((b) => (
                <button
                  key={b.id}
                  onClick={() => setBundle(b)}
                  className={`rounded-xl border p-4 text-left transition hover:border-primary ${
                    bundle?.id === b.id ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="flex items-baseline justify-between">
                    <div className="font-display text-2xl font-bold">
                      {b.gb}
                      <span className="text-sm">GB</span>
                    </div>
                    {b.popular && (
                      <span className="rounded-full gradient-gold px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                        Popular
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{b.validity}</div>
                  <div className="mt-3 text-lg font-bold text-gradient-gold">{formatGHS(b.price)}</div>
                </button>
              ))}
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!bundle}
                className="gradient-gold text-primary-foreground"
              >
                Next <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Recipient number</h2>
            <div className="space-y-2">
              <Label htmlFor="phone">Ghana phone number</Label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="phone"
                  className="pl-10"
                  placeholder="0244123456"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value.replace(/\D/g, "").slice(0, 10))}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Enter a 10-digit MTN number starting with 024, 054, or 025.
              </p>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              <Button
                onClick={() => setStep(4)}
                disabled={!validPhone}
                className="gradient-gold text-primary-foreground"
              >
                Review <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 4 && bundle && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold">Review & pay</h2>
            <div className="space-y-2 rounded-xl border border-border p-4 text-sm">
              <Row label="Network" value={bundle.network} />
              <Row label="Bundle" value={`${bundle.name} (${bundle.gb}GB)`} />
              <Row label="Validity" value={bundle.validity} />
              <Row label="Recipient" value={recipient} />
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

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)} disabled={processing}>
                <ArrowLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              <Button
                onClick={handlePay}
                disabled={processing}
                className="gradient-gold text-primary-foreground glow"
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing…
                  </>
                ) : (
                  `Pay ${formatGHS(bundle.price)}`
                )}
              </Button>
            </div>
          </div>
        )}
      </Card>
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
