import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin-sidebar";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-data";
import { Loader2, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_admin")({
  ssr: false,
  component: AdminLayout,
});

function AdminLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const isAdmin = isAdminEmail(user?.email);

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

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AdminSidebar />
        <SidebarInset className="flex flex-1 flex-col">
          <header className="glass sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/50 px-4">
            <SidebarTrigger />
            <Badge variant="outline" className="gap-1 border-primary/30 text-primary">
              <Shield className="h-3 w-3" /> Admin Mode
            </Badge>
            <div className="flex-1" />
            <div className="text-xs text-muted-foreground">Signed in as {user.email}</div>
          </header>
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
