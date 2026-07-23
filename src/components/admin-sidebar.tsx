import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package,
  Users,
  Receipt,
  Megaphone,
  Settings,
  LogOut,
  Shield,
  Sun,
  Moon,
  ArrowLeft,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";

const items = [
  { title: "Overview", url: "/admin", icon: LayoutDashboard },
  { title: "Orders", url: "/admin/orders", icon: Receipt },
  { title: "Bundles", url: "/admin/bundles", icon: Package },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Broadcast", url: "/admin/broadcast", icon: Megaphone },
  { title: "Settings", url: "/admin/settings", icon: Settings },
] as const;

export function AdminSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const { isMobile, setOpenMobile } = useSidebar();
  const closeIfMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/admin" className="flex items-center gap-2 px-2 py-3">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg gradient-gold">
            <Shield className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <div className="font-display text-sm font-bold leading-tight">DataHub</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Admin</div>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Manage</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = item.url === "/admin" ? path === "/admin" : path.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                      <Link to={item.url} onClick={closeIfMobile} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Customer</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Customer app">
                  <Link to="/dashboard" onClick={closeIfMobile} className="flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to app</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2 group-data-[collapsible=icon]:hidden">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="gradient-gold text-xs font-bold text-primary-foreground">
              {(user?.name || "?").slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{user?.name}</div>
            <div className="truncate text-xs text-muted-foreground">{user?.email}</div>
          </div>
        </div>
        <div className="flex gap-1 px-1 pb-2 group-data-[collapsible=icon]:flex-col">
          <Button variant="ghost" size="icon" onClick={toggle} className="h-8 w-8" aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Sign out"
            onClick={() => {
              signOut();
              navigate({ to: "/" });
            }}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
