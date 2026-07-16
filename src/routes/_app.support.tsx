import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle, Mail, HelpCircle, Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/support")({
  component: SupportPage,
});

function SupportPage() {
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await new Promise((r) => setTimeout(r, 500));
    toast.success("Ticket submitted — we'll be in touch shortly.");
    (e.target as HTMLFormElement).reset();
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Support</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          We're here 24/7 to help you get back online.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass border-0 p-5">
          <div className="grid h-10 w-10 place-items-center rounded-xl gradient-gold">
            <MessageCircle className="h-5 w-5 text-primary-foreground" />
          </div>
          <h3 className="mt-4 text-sm font-semibold">WhatsApp</h3>
          <p className="mt-1 text-xs text-muted-foreground">Fastest response</p>
          <Button asChild variant="outline" size="sm" className="mt-3 w-full">
            <a href="https://wa.me/233550000000" target="_blank" rel="noreferrer">
              Chat now
            </a>
          </Button>
        </Card>
        <Card className="glass border-0 p-5">
          <div className="grid h-10 w-10 place-items-center rounded-xl gradient-gold">
            <Mail className="h-5 w-5 text-primary-foreground" />
          </div>
          <h3 className="mt-4 text-sm font-semibold">Email</h3>
          <p className="mt-1 text-xs text-muted-foreground">support@datahub.gh</p>
          <Button asChild variant="outline" size="sm" className="mt-3 w-full">
            <a href="mailto:support@datahub.gh">Send email</a>
          </Button>
        </Card>
        <Card className="glass border-0 p-5">
          <div className="grid h-10 w-10 place-items-center rounded-xl gradient-gold">
            <HelpCircle className="h-5 w-5 text-primary-foreground" />
          </div>
          <h3 className="mt-4 text-sm font-semibold">Help center</h3>
          <p className="mt-1 text-xs text-muted-foreground">Answers to common questions</p>
          <Button asChild variant="outline" size="sm" className="mt-3 w-full">
            <a href="#faq">Browse FAQ</a>
          </Button>
        </Card>
      </div>

      <Card className="glass border-0 p-6" id="faq">
        <h2 className="text-lg font-semibold">Frequently asked</h2>
        <Accordion type="single" collapsible className="mt-4">
          {[
            { q: "Where's my bundle?", a: "Most orders are delivered in seconds. Check the Orders page — if it stays Pending for more than 5 minutes, contact us." },
            { q: "Can I get a refund?", a: "Yes — failed orders are refunded automatically, and you can request a refund on Completed orders within 24 hours if the bundle didn't reach the recipient." },
            { q: "Which networks do you support?", a: "MTN Ghana today. Vodafone and AirtelTigo are coming soon." },
          ].map((f, i) => (
            <AccordionItem key={i} value={`f${i}`}>
              <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Card>

      <Card className="glass border-0 p-6">
        <h2 className="text-lg font-semibold">Submit a ticket</h2>
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="subj">Subject</Label>
              <Input id="subj" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ref">Order reference (optional)</Label>
              <Input id="ref" placeholder="DH-XXXXXX" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="msg">Message</Label>
            <Textarea id="msg" rows={5} required />
          </div>
          <Button type="submit" className="gradient-gold text-primary-foreground">
            <Send className="mr-2 h-4 w-4" /> Submit ticket
          </Button>
        </form>
      </Card>
    </div>
  );
}
