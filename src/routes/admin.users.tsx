import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Search,
  Ban,
  Package,
  Plus,
  Pencil,
  Trash2,
  Star,
  RotateCcw,
  History,
  UserCheck,
  TrendingUp,
  RefreshCw,
  Zap,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { formatGHS, loadOrders, type Bundle, type Order } from "@/lib/mock-data";
import {
  loadUsers,
  toggleUserStatus,
  loadUserBundles,
  upsertUserBundle,
  deleteUserBundle,
  resetUserBundles,
  loadUserSlowEnabled,
  setUserSlowEnabled,
  type AdminUser,
} from "@/lib/admin-data";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">("all");

  // User Bundle Management Dialog State
  const [bundleUser, setBundleUser] = useState<AdminUser | null>(null);
  const [userBundles, setUserBundles] = useState<Bundle[]>([]);
  const [slowEnabled, setSlowEnabled] = useState(true);
  const [editingBundle, setEditingBundle] = useState<Bundle | null>(null);
  const [isNewBundle, setIsNewBundle] = useState(false);
  const [deleteBundleId, setDeleteBundleId] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  // History Dialog State
  const [historyUser, setHistoryUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchUsersAndOrders = async () => {
    setLoading(true);
    try {
      const [userData, ordersData] = await Promise.all([loadUsers(), loadOrders()]);
      setUsers(userData);
      setOrders(ordersData);
    } catch (e) {
      console.error("Error loading users:", e);
      toast.error("Failed to load customer profiles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndOrders();

    // Subscribe to realtime updates for profiles, orders, and bundles
    const channel = supabase
      .channel("admin-users-realtime-sub")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        fetchUsersAndOrders();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        fetchUsersAndOrders();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "bundles" }, async () => {
        if (bundleUser) {
          const fresh = await loadUserBundles(bundleUser.id);
          setUserBundles(fresh);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bundleUser]);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      if (q.trim()) {
        const s = q.toLowerCase();
        return (
          u.name.toLowerCase().includes(s) ||
          u.email.toLowerCase().includes(s) ||
          (u.phone ?? "").includes(s)
        );
      }
      return true;
    });
  }, [users, q, statusFilter]);

  const toggle = async (id: string) => {
    try {
      await toggleUserStatus(id);
      await fetchUsersAndOrders();
      toast.success("User status toggled successfully");
    } catch {
      toast.error("Failed to update user status");
    }
  };

  // Load specific user's bundles when opening bundle management modal
  const openBundleManager = async (user: AdminUser) => {
    setBundleUser(user);
    const data = await loadUserBundles(user.id);
    setUserBundles(data);
    setSlowEnabled(loadUserSlowEnabled(user.id));
  };

  const handleSaveUserBundle = async () => {
    if (!bundleUser || !editingBundle) return;
    if (!editingBundle.name.trim() || editingBundle.price <= 0 || editingBundle.gb <= 0) {
      toast.error("Please enter valid plan name, data volume, and price");
      return;
    }
    try {
      // Ensure Fast delivery group
      await upsertUserBundle(bundleUser.id, { ...editingBundle, group: "fast" });
      const data = await loadUserBundles(bundleUser.id);
      setUserBundles(data);
      setEditingBundle(null);
      setIsNewBundle(false);
      toast.success(`Fast delivery bundle saved for ${bundleUser.name}`);
    } catch {
      toast.error("Failed to save custom bundle");
    }
  };

  const handleDeleteUserBundle = async () => {
    if (!bundleUser || !deleteBundleId) return;
    try {
      await deleteUserBundle(bundleUser.id, deleteBundleId);
      const data = await loadUserBundles(bundleUser.id);
      setUserBundles(data);
      toast.success("Fast delivery bundle removed");
    } catch {
      toast.error("Failed to delete bundle");
    } finally {
      setDeleteBundleId(null);
    }
  };

  const handleResetUserBundles = async () => {
    if (!bundleUser) return;
    try {
      await resetUserBundles(bundleUser.id);
      const data = await loadUserBundles(bundleUser.id);
      setUserBundles(data);
      setConfirmReset(false);
      toast.success(`Reset ${bundleUser.name}'s bundles to default`);
    } catch {
      toast.error("Failed to reset bundles");
    }
  };

  const handleToggleSlowDelivery = (enabled: boolean) => {
    if (!bundleUser) return;
    setSlowEnabled(enabled);
    setUserSlowEnabled(bundleUser.id, enabled);
    toast.success(`1hr – 2hr delivery ${enabled ? "enabled" : "disabled"} for ${bundleUser.name}`);
  };

  const getUserOrders = (user: AdminUser) => {
    return orders.filter(
      (o) =>
        o.recipient.replace(/\s+/g, "") === (user.phone ?? "").replace(/\s+/g, "") ||
        o.recipient === user.email,
    );
  };

  const totalSpent = useMemo(() => users.reduce((sum, u) => sum + (u.spent || 0), 0), [users]);

  // Fast vs Slow separation in user bundles
  const userFastBundles = useMemo(
    () => userBundles.filter((b) => b.group !== "slow"),
    [userBundles],
  );
  const userSlowBundles = useMemo(
    () => userBundles.filter((b) => b.group === "slow"),
    [userBundles],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Customer Directory
            </h1>
            <Badge variant="outline" className="border-primary/30 text-primary text-xs">
              {users.length} Customers
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage individual customer bundle pricing, custom rates, validity, and accounts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={fetchUsersAndOrders}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card className="glass border-0 p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <UserCheck className="h-4 w-4 text-emerald-500" /> Active Customers
          </div>
          <div className="mt-2 font-display text-2xl font-bold">
            {users.filter((u) => u.status === "active").length} / {users.length}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {users.filter((u) => u.status === "suspended").length} suspended accounts
          </div>
        </Card>

        <Card className="glass border-0 p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Package className="h-4 w-4 text-primary" /> Per-User Pricing
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-primary">Fast & Standard</div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Fast is custom, Standard (1-2hr) is auto-synced
          </div>
        </Card>

        <Card className="glass border-0 p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-emerald-500" /> Total Customer Spend
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-emerald-500">
            {formatGHS(totalSpent)}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            From settled completed orders
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="glass border-0 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by customer name, email address, or phone number..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
            <Button
              size="sm"
              variant={statusFilter === "all" ? "secondary" : "ghost"}
              onClick={() => setStatusFilter("all")}
              className="h-9 text-xs"
            >
              All ({users.length})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === "active" ? "secondary" : "ghost"}
              onClick={() => setStatusFilter("active")}
              className="h-9 text-xs"
            >
              Active
            </Button>
            <Button
              size="sm"
              variant={statusFilter === "suspended" ? "secondary" : "ghost"}
              onClick={() => setStatusFilter("suspended")}
              className="h-9 text-xs"
            >
              Suspended
            </Button>
          </div>
        </div>
      </Card>

      {/* Customers Table (WITHOUT CUSTOM CATALOG COLUMN) */}
      <Card className="glass border-0 overflow-x-auto">
        <Table className="min-w-[650px]">
          <TableHeader>
            <TableRow className="border-b border-border/50">
              <TableHead>Customer</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Lifetime Spend</TableHead>
              <TableHead>Orders</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center text-sm text-muted-foreground">
                  No customers found matching your criteria.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((u) => (
                <TableRow key={u.id} className="transition hover:bg-card/40">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback className="gradient-gold text-xs font-bold text-primary-foreground">
                          {u.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">{u.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-xs">
                    {u.phone || "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-semibold">
                    {formatGHS(u.spent)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {u.orders} orders
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={u.status === "active" ? "outline" : "destructive"}
                      className={`capitalize text-[10px] ${
                        u.status === "active" ? "border-emerald-500/30 text-emerald-500" : ""
                      }`}
                    >
                      {u.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* MANAGE BUNDLES BUTTON */}
                      <Button
                        size="sm"
                        onClick={() => openBundleManager(u)}
                        className="gradient-gold h-8 px-2.5 text-xs gap-1.5 text-primary-foreground glow"
                      >
                        <Package className="h-3.5 w-3.5" />
                        <span>Manage Bundles</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setHistoryUser(u)}
                        className="h-8 px-2 text-xs gap-1"
                      >
                        <History className="h-3.5 w-3.5" /> History
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggle(u.id)}
                        className={`h-8 px-2 text-xs ${
                          u.status === "active"
                            ? "text-destructive hover:text-destructive"
                            : "text-emerald-500 hover:text-emerald-500"
                        }`}
                        title={u.status === "active" ? "Suspend Account" : "Activate Account"}
                      >
                        {u.status === "active" ? (
                          <Ban className="h-3.5 w-3.5" />
                        ) : (
                          <UserCheck className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* ============================================================ */}
      {/* MANAGE CUSTOMER BUNDLE CATALOG DIALOG (SEPARATED INTO TWO) */}
      {/* ============================================================ */}
      <Dialog open={!!bundleUser} onOpenChange={(o) => !o && setBundleUser(null)}>
        <DialogContent className="glass border-0 w-[95vw] sm:max-w-3xl max-h-[90vh] flex flex-col p-4 sm:p-6 overflow-hidden">
          <DialogHeader className="space-y-1">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl gradient-gold text-primary-foreground">
                  <Package className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-base sm:text-lg truncate">
                    Manage Bundles: <span className="text-gradient-gold">{bundleUser?.name}</span>
                  </DialogTitle>
                  <DialogDescription className="text-xs truncate">
                    {bundleUser?.email} • {bundleUser?.phone || "No phone"}
                  </DialogDescription>
                </div>
              </div>

              <Button
                size="sm"
                onClick={() => {
                  setEditingBundle({
                    id: "ub_" + Math.random().toString(36).slice(2, 8),
                    network: "MTN",
                    name: "",
                    gb: 5,
                    price: 25,
                    validity: "7 days",
                    popular: false,
                    group: "fast",
                  });
                  setIsNewBundle(true);
                }}
                className="gradient-gold h-8 gap-1 text-xs text-primary-foreground self-start sm:self-auto"
              >
                <Plus className="h-3.5 w-3.5" /> Add Fast Delivery Bundle
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-5 pr-1 py-1">
            {/* 1. TOP SECTION: (Fast delivery) bundles */}
            <div className="space-y-2.5 rounded-2xl border border-primary/20 bg-primary/5 p-3.5 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-sm text-primary">
                    <Zap className="h-4 w-4 fill-primary" />
                    <span>(Fast delivery) bundles</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Customize rates, GB, validity, or create custom plans exclusively for{" "}
                    {bundleUser?.name}.
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmReset(true)}
                  className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1 self-start sm:self-auto"
                >
                  <RotateCcw className="h-3 w-3" /> Reset to Default
                </Button>
              </div>

              <div className="rounded-xl border border-border/50 bg-card/60 overflow-x-auto">
                <Table className="text-xs min-w-[500px]">
                  <TableHeader>
                    <TableRow className="border-b border-border/50">
                      <TableHead>Plan Name</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Custom Price</TableHead>
                      <TableHead>Validity</TableHead>
                      <TableHead>Featured</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userFastBundles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                          No custom fast delivery plans. Customer inherits standard rates.
                        </TableCell>
                      </TableRow>
                    ) : (
                      userFastBundles.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="font-semibold">{b.name}</TableCell>
                          <TableCell className="font-bold">{b.gb} GB</TableCell>
                          <TableCell className="font-bold text-primary">
                            {formatGHS(b.price)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{b.validity}</TableCell>
                          <TableCell>
                            {b.popular ? (
                              <Badge className="gradient-gold text-[9px] text-primary-foreground">
                                <Star className="mr-0.5 h-2.5 w-2.5" /> Popular
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => {
                                  setEditingBundle(b);
                                  setIsNewBundle(false);
                                }}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive"
                                onClick={() => setDeleteBundleId(b.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* 2. BOTTOM SECTION: (standard 1hr-2hr) bundles */}
            <div className="space-y-2.5 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-3.5 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-sm text-blue-500">
                    <Clock className="h-4 w-4" />
                    <span>(standard 1hr-2hr) bundles</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Live auto-synced from Admin Bundles. Any edits made on the dashboard
                    automatically reflect here.
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground font-medium">
                    Queue Access:
                  </span>
                  <Switch checked={slowEnabled} onCheckedChange={handleToggleSlowDelivery} />
                </div>
              </div>

              <div className="rounded-xl border border-border/40 bg-card/60 overflow-x-auto">
                <Table className="text-xs min-w-[500px]">
                  <TableHeader>
                    <TableRow className="border-b border-border/50">
                      <TableHead>Plan Name</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Global Wholesale Price</TableHead>
                      <TableHead>Validity</TableHead>
                      <TableHead className="text-right">Auto-Sync Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userSlowBundles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                          No standard 1hr-2hr bundles configured in Admin Bundles.
                        </TableCell>
                      </TableRow>
                    ) : (
                      userSlowBundles.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="font-semibold">{b.name}</TableCell>
                          <TableCell className="font-bold">{b.gb} GB</TableCell>
                          <TableCell className="font-bold">{formatGHS(b.price)}</TableCell>
                          <TableCell className="text-muted-foreground">{b.validity}</TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant="outline"
                              className="text-[9px] border-emerald-500/30 text-emerald-500 gap-1"
                            >
                              <CheckCircle2 className="h-2.5 w-2.5" /> Synced Live
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-border/50">
            <Button
              variant="outline"
              onClick={() => setBundleUser(null)}
              className="w-full sm:w-auto"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* EDIT FAST DELIVERY BUNDLE MODAL */}
      {/* ============================================================ */}
      <Dialog open={!!editingBundle} onOpenChange={(o) => !o && setEditingBundle(null)}>
        <DialogContent className="glass border-0 w-[95vw] sm:max-w-md p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>
              {isNewBundle ? "Add (Fast delivery) Bundle" : "Edit (Fast delivery) Bundle"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure fast delivery plan for <strong>{bundleUser?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          {editingBundle && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Plan Title / Name</Label>
                <Input
                  value={editingBundle.name}
                  onChange={(e) => setEditingBundle({ ...editingBundle, name: e.target.value })}
                  placeholder="e.g. Fast 5GB VIP"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Data Volume (GB)</Label>
                  <Input
                    type="number"
                    min={0.1}
                    step={0.5}
                    value={editingBundle.gb}
                    onChange={(e) =>
                      setEditingBundle({ ...editingBundle, gb: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Custom Price (GHS)</Label>
                  <Input
                    type="number"
                    min={0.1}
                    step={1}
                    value={editingBundle.price}
                    onChange={(e) =>
                      setEditingBundle({ ...editingBundle, price: Number(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Validity Period</Label>
                <Input
                  value={editingBundle.validity}
                  onChange={(e) => setEditingBundle({ ...editingBundle, validity: e.target.value })}
                  placeholder="e.g. 24 hours, 7 days, 30 days"
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border/50 bg-card/40 p-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-medium">Highlight Plan</div>
                  <div className="text-[11px] text-muted-foreground">
                    Show "Popular" badge on customer's buy page
                  </div>
                </div>
                <Switch
                  checked={!!editingBundle.popular}
                  onCheckedChange={(v) => setEditingBundle({ ...editingBundle, popular: v })}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setEditingBundle(null)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveUserBundle}
              className="gradient-gold text-primary-foreground w-full sm:w-auto"
            >
              Save Fast Bundle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteBundleId} onOpenChange={(o) => !o && setDeleteBundleId(null)}>
        <AlertDialogContent className="glass border-0 w-[95vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this custom plan?</AlertDialogTitle>
            <AlertDialogDescription>
              This fast delivery plan will no longer be available in {bundleUser?.name}'s personal
              bundle catalog.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUserBundle}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Confirmation */}
      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent className="glass border-0 w-[95vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Reset to Global Default?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all custom bundle overrides for {bundleUser?.name} and revert their
              catalog to standard pricing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetUserBundles}
              className="gradient-gold text-primary-foreground"
            >
              Reset to Default
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Customer Order History Dialog */}
      <Dialog open={!!historyUser} onOpenChange={(o) => !o && setHistoryUser(null)}>
        <DialogContent className="glass border-0 w-[95vw] sm:max-w-2xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Order History: {historyUser?.name}</DialogTitle>
            <DialogDescription className="text-xs">
              Orders placed to recipient: {historyUser?.phone || historyUser?.email}
            </DialogDescription>
          </DialogHeader>

          {historyUser && (
            <div className="py-2">
              {getUserOrders(historyUser).length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No orders recorded for this customer yet.
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                  {getUserOrders(historyUser).map((o) => (
                    <div
                      key={o.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-border/40 bg-card/40 p-3 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-sm">{o.bundleName}</div>
                        <div className="text-muted-foreground font-mono text-[11px]">
                          {o.reference} • {new Date(o.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-3">
                        <div className="font-bold text-sm">{formatGHS(o.amount)}</div>
                        <StatusBadge status={o.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setHistoryUser(null)}
              className="w-full sm:w-auto"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
