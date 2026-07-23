import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin-sidebar";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-data";
import { Loader2, Shield, Copy, Check, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  ssr: false,
  component: AdminLayout,
});

function AdminLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const isAdmin = isAdminEmail(user?.email);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth", search: { mode: "signin" } });
    else if (!isAdmin) navigate({ to: "/dashboard" });
  }, [user, loading, isAdmin, navigate]);

  if (loading || !user || !isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const customerUrl = typeof window !== "undefined" ? window.location.origin + "/" : "/";
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(customerUrl);
      setCopied(true);
      toast.success("Customer link copied");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AdminSidebar />
        <SidebarInset className="flex flex-1 flex-col">
          <header className="glass sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border/50 px-3 sm:gap-3 sm:px-4">
            <SidebarTrigger />
            <Badge variant="outline" className="gap-1 border-primary/30 text-primary">
              <Shield className="h-3 w-3" /> <span>Admin</span><span className="hidden sm:inline"> Mode</span>
            </Badge>
            <div className="flex-1" />
            <div className="hidden min-w-0 max-w-[38vw] items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-2 py-1 text-xs md:flex">
              <span className="text-muted-foreground">Customer link:</span>
              <span className="truncate font-mono">{customerUrl}</span>
            </div>
            <Button size="sm" variant="outline" onClick={copyLink} className="h-8 gap-1">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{copied ? "Copied" : "Copy customer link"}</span>
            </Button>
            <Button size="sm" variant="ghost" asChild className="h-8 gap-1">
              <a href={customerUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Open</span>
              </a>
            </Button>
          </header>
          <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
