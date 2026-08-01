import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Wifi, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional().default("signin"),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">(mode);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/buy" });
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    try {
      await signIn(String(fd.get("email")), String(fd.get("password")));
      toast.success("Welcome back!");
      navigate({ to: "/buy" });
    } catch {
      toast.error("Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    try {
      await signUp(
        String(fd.get("name")),
        String(fd.get("email")),
        String(fd.get("phone")),
        String(fd.get("password")),
      );
      toast.success("Account created!");
      navigate({ to: "/buy" });
    } catch {
      toast.error("Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hero-bg relative flex min-h-screen items-center justify-center p-4">
      <Link
        to="/"
        className="absolute left-6 top-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <Card className="glass w-full max-w-md border-0 p-8">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="grid h-12 w-12 place-items-center rounded-2xl gradient-gold glow">
            <Wifi className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold">Welcome to DataHub</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ghana's fastest MTN data marketplace
          </p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Create account</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="mt-6">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="si-email">Email</Label>
                <Input id="si-email" name="email" type="email" required placeholder="you@example.com" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="si-password">Password</Label>
                  <button
                    type="button"
                    onClick={() => toast("Password reset link sent (mock).")}
                    className="text-xs text-primary hover:underline"
                  >
                    Forgot?
                  </button>
                </div>
                <Input id="si-password" name="password" type="password" required minLength={6} />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full gradient-gold text-primary-foreground hover:opacity-90"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="mt-6">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="su-name">Full name</Label>
                <Input id="su-name" name="name" required placeholder="Ama Owusu" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="su-email">Email</Label>
                  <Input id="su-email" name="email" type="email" required placeholder="you@example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-phone">Phone</Label>
                  <Input id="su-phone" name="phone" required placeholder="0244123456" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="su-password">Password</Label>
                <Input id="su-password" name="password" type="password" required minLength={6} />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full gradient-gold text-primary-foreground hover:opacity-90"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing you agree to our Terms & Privacy Policy.
        </p>
      </Card>
    </div>
  );
}
