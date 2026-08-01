import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Zap,
  ShieldCheck,
  Clock,
  Menu,
  X,
  Sun,
  Moon,
  Wifi,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { formatGHS, loadOrders, type Bundle, type Order } from "@/lib/mock-data";
import { catalogueFor, ensureAdminUser, type UserCatalogue } from "@/lib/admin-data";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DataFlex — Buy MTN Ghana Data Bundles Instantly" },
      {
        name: "description",
        content:
          "DataFlex delivers MTN Ghana data bundles in seconds. Pick a bundle, pay with MoMo, and your data lands instantly.",
      },
      { property: "og:title", content: "DataFlex — Buy MTN Data Bundles Instantly" },
      {
        property: "og:description",
        content: "Fast delivery and 1hr–2hr bundles at unbeatable prices in Ghana.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const [menu, setMenu] = useState(false);
  const { theme, toggle } = useTheme();
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);
  const [mode, setMode] = useState<"signup" | "login">("login");
  const [selectedBundle, setSelectedBundle] = useState<Bundle | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [activeBar, setActiveBar] = useState<null | "fast" | "slow">(null);
  const [pendingBar, setPendingBar] = useState<null | "fast" | "slow">(null);
  const [catalogue, setCatalogue] = useState<UserCatalogue | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    setCatalogue(catalogueFor({ name: user?.name, email: user?.email, phone: user?.phone }));
    const all = loadOrders();
    setOrders(
      user?.phone
        ? all.filter((o) => o.recipient.replace(/\s+/g, "") === user.phone!.replace(/\s+/g, ""))
        : all,
    );
  }, [user]);

  const bundles = useMemo(() => {
    if (!catalogue || !activeBar) return [];
    return activeBar === "fast" ? catalogue.fast : catalogue.slow;
  }, [catalogue, activeBar]);

  const revealBundles = (bar: "fast" | "slow") => {
    setActiveBar(bar);
    setTimeout(() => {
      document.getElementById("bundle-list")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  const openAuth = (nextMode: "signup" | "login") => {
    setMode(nextMode);
    setForm({ name: "", email: "", phone: "" });
    setAuthOpen(true);
  };

  const handleBarTap = (bar: "fast" | "slow") => {
    if (bar === "slow" && catalogue && !catalogue.slowEnabled) {
      toast.error("1hr – 2hr delivery is currently unavailable.");
      return;
    }
    if (bar === "fast" && !user) {
      setPendingBar("fast");
      setSelectedBundle(null);
      openAuth("login");
      return;
    }
    revealBundles(bar);
  };

  const openBuy = (b: Bundle) => {
    try {
      sessionStorage.setItem("datahub-selected-bundle", JSON.stringify(b));
    } catch {}
    if (user) {
      navigate({ to: "/buy" });
      return;
    }
    setSelectedBundle(b);
    openAuth("signup");
  };

  const afterAuth = (profile: { name: string; email: string; phone: string }) => {
    ensureAdminUser(profile);
    setCatalogue(catalogueFor(profile));
    setAuthOpen(false);
    if (selectedBundle) {
      navigate({ to: "/buy" });
      return;
    }
    if (pendingBar) {
      const bar = pendingBar;
      setPendingBar(null);
      revealBundles(bar);
      return;
    }
    revealBundles("fast");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone) return;
    setSubmitting(true);
    try {
      await signUp(form.name, form.email, form.phone, "password");
      toast.success("Account created");
      afterAuth({ name: form.name, email: form.email, phone: form.phone });
    } catch {
      toast.error("Sign up failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) return;
    setSubmitting(true);
    try {
      const email = `${form.name.toLowerCase().replace(/\s+/g, ".")}@dataflex.gh`;
      await signIn(email, "password");
      toast.success("Welcome back");
      afterAuth({ name: form.name, email, phone: form.phone });
    } catch {
      toast.error("Log in failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const navLinks = [
    { href: "#reports", label: "Reports" },
    { href: "#how", label: "How it works" },
    { href: "#faq", label: "FAQ" },
    { href: "#contact", label: "Contact" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* NAV */}
      <header className="sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 pt-4">
          <nav className="glass flex items-center justify-between rounded-2xl px-4 py-3">
            <Link to="/" className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-xl gradient-gold glow">
                <Wifi className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-display text-lg font-bold">DataFlex</span>
            </Link>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMenu((m) => !m)}
                aria-label="Menu"
              >
                {menu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </nav>
          {menu && (
            <div className="glass mt-2 rounded-2xl p-4">
              <div className="flex flex-col gap-3">
                {navLinks.map((l) => (
                  <a key={l.href} href={l.href} onClick={() => setMenu(false)} className="text-sm">
                    {l.label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* PRICING / BUNDLES */}
      <section id="pricing" className="mx-auto max-w-7xl px-4 pt-10 pb-16">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold sm:text-4xl">Buy Data Bundle Here</h1>
        </div>

        {/* Golden vertical card with two black bars */}
        <div className="mt-8 flex justify-center">
          <div
            className="relative flex flex-col items-stretch justify-center gap-4 rounded-2xl gradient-gold p-4 glow"
            style={{ width: "5cm", height: "8cm" }}
          >
            <div className="text-center text-[10px] font-semibold uppercase tracking-wider text-primary-foreground/80">
              DataFlex • MTN
            </div>
            <button
              type="button"
              onClick={() => handleBarTap("fast")}
              className={`w-full rounded-lg bg-black px-3 py-3 text-sm font-semibold text-white transition hover:bg-black/85 ${activeBar === "fast" ? "ring-2 ring-white/60" : ""}`}
            >
              Fast delivery
            </button>
            <button
              type="button"
              onClick={() => handleBarTap("slow")}
              disabled={!!catalogue && !catalogue.slowEnabled}
              className={`w-full rounded-lg bg-black px-3 py-3 text-sm font-semibold text-white transition hover:bg-black/85 disabled:opacity-40 ${activeBar === "slow" ? "ring-2 ring-white/60" : ""}`}
            >
              1hr – 2hr delivery
            </button>
            <div className="text-center text-[9px] text-primary-foreground/70">
              Tap a bar to view bundles
            </div>
          </div>
        </div>

        {/* Bundles list — appears after a bar is chosen */}
        {activeBar && (
          <div id="bundle-list" className="mt-10">
            <h2 className="text-center text-xl font-semibold text-gradient-gold">
              {activeBar === "fast" ? "Fast delivery" : "1hr – 2hr delivery"}
            </h2>
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              {bundles.map((b) => (
                <Card
                  key={b.id}
                  className={`glass relative border-0 p-3 flex flex-col justify-between w-[3cm] h-[7cm] ${b.popular ? "ring-2 ring-primary" : ""}`}
                >
                  {b.popular && (
                    <span className="absolute right-1 top-1 rounded-full gradient-gold px-1.5 py-0.5 text-[8px] font-semibold uppercase text-primary-foreground">
                      Popular
                    </span>
                  )}
                  <div>
                    <div className="text-[10px] font-medium text-muted-foreground">{b.network}</div>
                    <div className="mt-1 font-display text-2xl font-bold leading-none">
                      {b.gb}
                      <span className="text-sm">GB</span>
                    </div>
                    <div className="mt-1 text-[10px] text-muted-foreground">{b.validity}</div>
                  </div>
                  <div className="text-lg font-bold text-gradient-gold">{formatGHS(b.price)}</div>
                  <Button
                    size="sm"
                    onClick={() => openBuy(b)}
                    className="w-full gradient-gold text-primary-foreground hover:opacity-90 text-xs h-8"
                  >
                    Buy
                  </Button>
                </Card>
              ))}
              {bundles.length === 0 && (
                <p className="text-sm text-muted-foreground">No bundles allocated yet.</p>
              )}
            </div>
          </div>
        )}

        {/* ORDERS — moved from the app menu to the homepage */}
        <div id="reports" className="mx-auto mt-14 max-w-3xl">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold">Your orders</h2>
          </div>
          <Card className="glass mt-3 border-0 divide-y divide-border/50">
            {orders.slice(0, 8).map((o) => (
              <div key={o.id} className="flex flex-col gap-1 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{o.bundleName}</div>
                  <div className="text-xs text-muted-foreground">
                    {o.recipient} • {new Date(o.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="capitalize">{o.status}</Badge>
                  <span className="text-sm font-semibold text-gradient-gold">{formatGHS(o.amount)}</span>
                </div>
              </div>
            ))}
            {orders.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">No orders yet.</div>
            )}
          </Card>
        </div>
      </section>

      {/* Auth dialog */}
      <Dialog open={authOpen} onOpenChange={setAuthOpen}>
        <DialogContent className="glass border-0 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {mode === "signup" ? "Sign in — new customer" : "Log in — existing customer"}
            </DialogTitle>
            <DialogDescription>
              {selectedBundle
                ? `${selectedBundle.gb}GB • ${formatGHS(selectedBundle.price)} • ${selectedBundle.validity}`
                : "Continue to see the bundles allocated to you."}
            </DialogDescription>
          </DialogHeader>

          {mode === "signup" ? (
            <form onSubmit={handleSignup} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="su-name">User name</Label>
                <Input id="su-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="su-email">Email</Label>
                <Input id="su-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="su-phone">Phone number</Label>
                <Input id="su-phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
              </div>
              <Button type="submit" disabled={submitting} className="w-full gradient-gold text-primary-foreground hover:opacity-90">
                {submitting ? "Please wait..." : "Sign in"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Already a customer?{" "}
                <button type="button" onClick={() => setMode("login")} className="font-semibold text-primary hover:underline">
                  Log in
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="li-name">Username</Label>
                <Input id="li-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="li-phone">Registered phone number</Label>
                <Input id="li-phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
              </div>
              <Button type="submit" disabled={submitting} className="w-full gradient-gold text-primary-foreground hover:opacity-90">
                {submitting ? "Please wait..." : "Log in"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                New customer?{" "}
                <button type="button" onClick={() => setMode("signup")} className="font-semibold text-primary hover:underline">
                  Sign in
                </button>
              </p>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* FEATURES */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">Built for speed and trust</h2>
          <p className="mt-2 text-xs text-muted-foreground sm:text-sm">
            Every bundle is delivered by an automated pipeline built to be fast, transparent, and reliable.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { icon: Zap, title: "Instant delivery", desc: "Bundles arrive in under 30 seconds on average." },
            { icon: ShieldCheck, title: "Secure payments", desc: "MTN MoMo, cards, and bank — encrypted end-to-end." },
            { icon: Clock, title: "Real-time tracking", desc: "Watch your order move from pending to completed live." },
          ].map((f) => (
            <Card key={f.title} className="glass border-0 p-5 transition hover:-translate-y-1">
              <div className="grid h-10 w-10 place-items-center rounded-xl gradient-gold">
                <f.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{f.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="relative">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">Three steps. Done.</h2>
            <p className="mt-2 text-xs text-muted-foreground sm:text-sm">
              From account to activated data in less than a minute.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              { n: "01", t: "Pick a delivery speed", d: "Fast delivery or 1hr – 2hr." },
              { n: "02", t: "Choose your bundle", d: "Prices are set for your account." },
              { n: "03", t: "Pay & receive", d: "Complete payment — bundle lands instantly." },
            ].map((s) => (
              <div key={s.n} className="glass rounded-2xl p-5">
                <div className="font-display text-3xl font-bold text-gradient-gold">{s.n}</div>
                <h3 className="mt-3 text-base font-semibold">{s.t}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-4 py-24">
        <div className="text-center">
          <h2 className="text-4xl font-bold sm:text-5xl">Frequently asked</h2>
        </div>
        <Accordion type="single" collapsible className="mt-10">
          {[
            { q: "How fast is delivery?", a: "Fast delivery bundles land in under 30 seconds. The 1hr – 2hr group is delivered within two hours." },
            { q: "Which networks are supported?", a: "MTN Ghana is live today. Vodafone Cash and AirtelTigo are coming soon." },
            { q: "What if my bundle doesn't arrive?", a: "You'll receive an automatic refund within minutes if delivery fails." },
            { q: "How do I pay?", a: "MTN Mobile Money is supported now. Cards and bank transfer are on the way." },
            { q: "Can I buy for someone else?", a: "Your registered number is used by default. Tap Change number to register another one." },
          ].map((f, i) => (
            <AccordionItem key={i} value={`i${i}`} className="glass mb-3 rounded-2xl border-0 px-5">
              <AccordionTrigger className="text-left hover:no-underline">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CONTACT */}
      <section id="contact" className="mx-auto max-w-5xl px-4 py-24">
        <Card className="glass border-0 p-8 md:p-12">
          <div className="grid gap-10 md:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold sm:text-4xl">Talk to us</h2>
              <p className="mt-3 text-muted-foreground">
                Have a question or need support? Reach out and we'll get back within an hour.
              </p>
              <div className="mt-6 space-y-3 text-sm">
                <div><span className="text-muted-foreground">Email:</span> support@dataflex.gh</div>
                <div><span className="text-muted-foreground">WhatsApp:</span> +233 55 000 0000</div>
                <div><span className="text-muted-foreground">Hours:</span> 24/7</div>
              </div>
            </div>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                toast.success("Message sent — we'll be in touch.");
                (e.target as HTMLFormElement).reset();
              }}
            >
              <Input placeholder="Your name" required />
              <Input type="email" placeholder="Email address" required />
              <Textarea placeholder="How can we help?" rows={4} required />
              <Button type="submit" className="w-full gradient-gold text-primary-foreground hover:opacity-90">
                Send message
              </Button>
            </form>
          </div>
        </Card>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border/50">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg gradient-gold">
                <Wifi className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-display font-bold">DataFlex</span>
              <span className="text-xs text-muted-foreground">© {new Date().getFullYear()}</span>
            </div>
            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              <a href="#">Terms</a>
              <a href="#">Privacy</a>
              <a href="#contact">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
