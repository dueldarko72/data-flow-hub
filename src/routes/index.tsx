import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Zap,
  ShieldCheck,
  Clock,
  Sparkles,
  ArrowRight,
  Menu,
  X,
  Sun,
  Moon,
  Wifi,
  Star,
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
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { BUNDLES, formatGHS } from "@/lib/mock-data";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const [menu, setMenu] = useState(false);
  const { theme, toggle } = useTheme();
  const { user } = useAuth();

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
              <span className="font-display text-lg font-bold">DataHub</span>
            </Link>
            <div className="hidden items-center gap-8 md:flex">
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground">Features</a>
              <a href="#how" className="text-sm text-muted-foreground hover:text-foreground">How it works</a>
              <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground">Bundles</a>
              <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground">FAQ</a>
              <a href="#contact" className="text-sm text-muted-foreground hover:text-foreground">Contact</a>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              {user ? (
                <Button asChild size="sm" className="gradient-gold text-primary-foreground hover:opacity-90">
                  <Link to="/dashboard">Dashboard</Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                    <Link to="/auth" search={{ mode: "signin" }}>Sign in</Link>
                  </Button>
                  <Button asChild size="sm" className="gradient-gold text-primary-foreground hover:opacity-90">
                    <Link to="/auth" search={{ mode: "signup" }}>Get started</Link>
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMenu((m) => !m)}
                aria-label="Menu"
              >
                {menu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </nav>
          {menu && (
            <div className="glass mt-2 rounded-2xl p-4 md:hidden">
              <div className="flex flex-col gap-3">
                <a href="#features" onClick={() => setMenu(false)}>Features</a>
                <a href="#how" onClick={() => setMenu(false)}>How it works</a>
                <a href="#pricing" onClick={() => setMenu(false)}>Bundles</a>
                <a href="#faq" onClick={() => setMenu(false)}>FAQ</a>
                <a href="#contact" onClick={() => setMenu(false)}>Contact</a>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* PRICING / BUNDLES — moved to top */}
      <section id="pricing" className="mx-auto max-w-7xl px-4 pt-10 pb-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">Straightforward pricing</h2>
          <p className="mt-2 text-sm text-muted-foreground">The exact price you see. Never a cedi more.</p>
        </div>

        {/* Group 1: Instantly delivered — first 3 */}
        <div className="mt-10">
          <h3 className="text-center text-xl font-semibold text-gradient-gold">Instantly delivered</h3>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            {BUNDLES.slice(0, 3).map((b) => (
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
                  <div className="mt-1 font-display text-2xl font-bold leading-none">{b.gb}<span className="text-sm">GB</span></div>
                  <div className="mt-1 text-[10px] text-muted-foreground">{b.validity}</div>
                </div>
                <div className="text-lg font-bold text-gradient-gold">{formatGHS(b.price)}</div>
                <Button asChild size="sm" className="w-full gradient-gold text-primary-foreground hover:opacity-90 text-xs h-8">
                  <Link to="/auth" search={{ mode: "signup" }}>Buy</Link>
                </Button>
              </Card>
            ))}
          </div>
        </div>

        {/* Group 2: 1hr - 2hr delivery — next 5 */}
        <div className="mt-10">
          <h3 className="text-center text-xl font-semibold text-gradient-gold">1hr – 2hr delivery</h3>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            {BUNDLES.slice(3, 8).map((b) => (
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
                  <div className="mt-1 font-display text-2xl font-bold leading-none">{b.gb}<span className="text-sm">GB</span></div>
                  <div className="mt-1 text-[10px] text-muted-foreground">{b.validity}</div>
                </div>
                <div className="text-lg font-bold text-gradient-gold">{formatGHS(b.price)}</div>
                <Button asChild size="sm" className="w-full gradient-gold text-primary-foreground hover:opacity-90 text-xs h-8">
                  <Link to="/auth" search={{ mode: "signup" }}>Buy</Link>
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* HERO */}
      <section className="hero-bg relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 pt-10 pb-16 text-center">
          <div className="glass mx-auto mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px]">
            <Sparkles className="h-3 w-3 text-primary" />
            Ghana's fastest MTN data marketplace
          </div>
          <h1 className="mx-auto max-w-3xl text-2xl font-bold leading-tight tracking-tight sm:text-4xl">
            Instant data bundles. <span className="text-gradient-gold">Zero hassle.</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-xs text-muted-foreground sm:text-sm">
            Buy MTN Ghana data bundles in seconds. No calls, no waiting, no middlemen — pay securely
            and your bundle lands on any number, instantly.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Button asChild size="sm" className="gradient-gold text-primary-foreground hover:opacity-90 glow">
              <Link to="/auth" search={{ mode: "signup" }}>
                Buy data now <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href="#pricing">View bundles</a>
            </Button>
          </div>

          {/* Trust bar */}
          <div className="mx-auto mt-10 grid max-w-2xl grid-cols-3 gap-3">
            {[
              { k: "10k+", v: "Bundles delivered" },
              { k: "99.9%", v: "Success rate" },
              { k: "< 30s", v: "Avg delivery" },
            ].map((s) => (
              <div key={s.v} className="glass rounded-xl p-3">
                <div className="font-display text-lg font-bold text-gradient-gold">{s.k}</div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

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
              { n: "01", t: "Create your account", d: "Sign up with your email or phone." },
              { n: "02", t: "Pick a bundle", d: "Choose network, size, and recipient." },
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

      {/* TESTIMONIALS */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">Loved across Ghana</h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { n: "Ama K.", r: "Accra", q: "Bought 20GB at midnight and it dropped in seconds. This is the way." },
            { n: "Kwame O.", r: "Kumasi", q: "Cheapest MTN bundles I've found. The dashboard is beautiful too." },
            { n: "Efua M.", r: "Takoradi", q: "I run a small shop — I resell for my customers. DataHub never fails me." },
          ].map((t) => (
            <Card key={t.n} className="glass border-0 p-5">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3 w-3 fill-primary text-primary" />
                ))}
              </div>
              <p className="mt-3 text-xs leading-relaxed">"{t.q}"</p>
              <div className="mt-4 flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-full gradient-gold text-xs font-bold text-primary-foreground">
                  {t.n[0]}
                </div>
                <div>
                  <div className="text-xs font-semibold">{t.n}</div>
                  <div className="text-[10px] text-muted-foreground">{t.r}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>


      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-4 py-24">
        <div className="text-center">
          <h2 className="text-4xl font-bold sm:text-5xl">Frequently asked</h2>
        </div>
        <Accordion type="single" collapsible className="mt-10">
          {[
            { q: "How fast is delivery?", a: "Most bundles are delivered within 30 seconds. You'll see the order move from Pending to Completed in your dashboard in real time." },
            { q: "Which networks are supported?", a: "MTN Ghana is live today. Vodafone Cash and AirtelTigo are coming soon." },
            { q: "What if my bundle doesn't arrive?", a: "You'll receive an automatic refund to your wallet within minutes if delivery fails." },
            { q: "How do I pay?", a: "MTN Mobile Money is supported now. Cards and bank transfer are on the way." },
            { q: "Can I buy for someone else?", a: "Yes — enter any Ghanaian number when placing your order." },
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
                <div><span className="text-muted-foreground">Email:</span> support@datahub.gh</div>
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
              <span className="font-display font-bold">DataHub</span>
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
