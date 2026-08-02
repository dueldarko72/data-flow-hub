import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Ban, CircleCheck, Package, Plus, Pencil, Trash2, Star, RotateCcw, History } from "lucide-react";
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
  const [q, setQ] = useState("");
  const [bundleUser, setBundleUser] = useState<AdminUser | null>(null);
  const [historyUser, setHistoryUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    setUsers(loadUsers());
  }, []);

  const filtered = useMemo(() => {
    if (!q) return users;
    const s = q.toLowerCase();
    return users.filter(
      (u) => u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s) || (u.phone ?? "").includes(s),
    );
  }, [users, q]);

  const toggle = (id: string) => {
    toggleUserStatus(id);
    setUsers(loadUsers());
    toast.success("User updated");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Customer directory with lifetime spend and per-user bundle catalogues.
        </p>
      </div>

      <Card className="glass border-0 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, email or phone"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
      </Card>

      <Card className="glass border-0 overflow-hidden">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Orders</TableHead>
              <TableHead>Spent</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="gradient-gold text-xs font-bold text-primary-foreground">
                        {u.name.slice(0, 1)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{u.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm">{u.phone ?? "—"}</TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {new Date(u.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-sm font-medium">{u.orders}</TableCell>
                <TableCell className="whitespace-nowrap text-sm font-semibold">{formatGHS(u.spent)}</TableCell>
                <TableCell>
                  {u.status === "active" ? (
                    <Badge variant="outline" className="border-emerald-500/40 text-emerald-600">Active</Badge>
                  ) : (
                    <Badge variant="outline" className="border-destructive/40 text-destructive">Suspended</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="outline" onClick={() => setBundleUser(u)} title="Manage bundles">
                      <Package className="h-3.5 w-3.5 sm:mr-1" />
                      <span className="hidden sm:inline">Bundles</span>
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setHistoryUser(u)} title="Order history">
                      <History className="h-3.5 w-3.5 sm:mr-1" />
                      <span className="hidden sm:inline">History</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggle(u.id)}
                      title={u.status === "active" ? "Suspend" : "Reactivate"}
                    >
                      {u.status === "active" ? (
                        <>
                          <Ban className="h-3.5 w-3.5 sm:mr-1" />
                          <span className="hidden sm:inline">Suspend</span>
                        </>
                      ) : (
                        <>
                          <CircleCheck className="h-3.5 w-3.5 sm:mr-1" />
                          <span className="hidden sm:inline">Reactivate</span>
                        </>
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                  No customers found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>


      <UserBundlesDialog
        user={bundleUser}
        onClose={() => setBundleUser(null)}
      />

      <UserHistoryDialog
        user={historyUser}
        onClose={() => setHistoryUser(null)}
      />
    </div>
  );
}

function UserHistoryDialog({ user, onClose }: { user: AdminUser | null; onClose: () => void }) {
  const orders = useMemo<Order[]>(() => {
    if (!user) return [];
    const all = loadOrders();
    const phone = (user.phone ?? "").replace(/\s+/g, "");
    return all.filter((o) => o.recipient.replace(/\s+/g, "") === phone);
  }, [user]);

  if (!user) return null;

  const total = orders.reduce((s, o) => s + (o.status === "completed" ? o.amount : 0), 0);
  const gb = orders.reduce((s, o) => s + (o.status === "completed" ? o.gb : 0), 0);

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass border-0 w-[calc(100vw-1.5rem)] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Order history — {user.name}</DialogTitle>
          <DialogDescription>
            All orders placed to <span className="font-medium">{user.phone ?? "—"}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border border-border/50 p-2">
            <div className="text-xs text-muted-foreground">Orders</div>
            <div className="text-lg font-bold">{orders.length}</div>
          </div>
          <div className="rounded-lg border border-border/50 p-2">
            <div className="text-xs text-muted-foreground">Data (GB)</div>
            <div className="text-lg font-bold">{gb}</div>
          </div>
          <div className="rounded-lg border border-border/50 p-2">
            <div className="text-xs text-muted-foreground">Spent</div>
            <div className="text-lg font-bold">{formatGHS(total)}</div>
          </div>
        </div>

        <div className="max-h-[50vh] overflow-auto rounded-lg border border-border/50">
          <Table className="min-w-[560px]">
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Bundle</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">{o.reference}</TableCell>
                  <TableCell className="text-sm">{o.bundleName}</TableCell>
                  <TableCell className="font-semibold">{formatGHS(o.amount)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{o.status}</Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(o.createdAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
              {orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    No orders yet for this customer.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UserBundlesDialog({ user, onClose }: { user: AdminUser | null; onClose: () => void }) {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [editing, setEditing] = useState<Bundle | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (user) setBundles(loadUserBundles(user.id));
    else {
      setBundles([]);
      setEditing(null);
    }
  }, [user]);

  if (!user) return null;

  const startCreate = () => {
    setEditing({
      id: "b" + Math.random().toString(36).slice(2, 8),
      network: "MTN",
      name: "",
      gb: 1,
      price: 0,
      validity: "24 hours",
      popular: false,
    });
    setIsNew(true);
  };

  const save = () => {
    if (!editing) return;
    if (!editing.name.trim() || editing.price <= 0 || editing.gb <= 0) {
      toast.error("Fill in all fields correctly");
      return;
    }
    upsertUserBundle(user.id, editing);
    setBundles(loadUserBundles(user.id));
    setEditing(null);
    setIsNew(false);
    toast.success("Bundle saved for " + user.name);
  };

  const doDelete = () => {
    if (!deleteId) return;
    deleteUserBundle(user.id, deleteId);
    setBundles(loadUserBundles(user.id));
    setDeleteId(null);
    toast.success("Bundle removed");
  };

  const doReset = () => {
    resetUserBundles(user.id);
    setBundles(loadUserBundles(user.id));
    setConfirmReset(false);
    toast.success("Catalogue reset to defaults");
  };

  return (
    <>
      <Dialog open={!!user && !editing} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="glass border-0 w-[calc(100vw-1.5rem)] sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Bundles for {user.name}</DialogTitle>
            <DialogDescription>
              Manage this customer's personal bundle catalogue, pricing and validity. Changes apply only to <span className="font-medium">{user.email}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              {bundles.length} bundle{bundles.length === 1 ? "" : "s"}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setConfirmReset(true)}>
                <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset
              </Button>
              <Button size="sm" onClick={startCreate} className="gradient-gold text-primary-foreground hover:opacity-90">
                <Plus className="mr-1 h-3.5 w-3.5" /> New bundle
              </Button>
            </div>
          </div>

          <div className="max-h-[50vh] space-y-6 overflow-auto pr-1">
            <BundleGroupTable
              title="Fast delivery"
              bundles={bundles.filter((b) => b.group !== "slow")}
              onEdit={(b) => { setEditing(b); setIsNew(false); }}
              onDelete={setDeleteId}
            />
            <BundleGroupTable
              title="1hr – 2hr delivery"
              bundles={bundles.filter((b) => b.group === "slow")}
              onEdit={(b) => { setEditing(b); setIsNew(false); }}
              onDelete={setDeleteId}
              headerExtra={
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {slowEnabled ? "Enabled" : "Disabled"}
                  </span>
                  <Switch
                    checked={slowEnabled}
                    onCheckedChange={(v) => {
                      setSlowEnabled(v);
                      setUserSlowEnabled(user.id, v);
                      toast.success(`1hr – 2hr delivery ${v ? "enabled" : "disabled"} for ${user.name}`);
                    }}
                  />
                </div>
              }
              disabled={!slowEnabled}
            />
          </div>


          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) { setEditing(null); setIsNew(false); } }}>
        <DialogContent className="glass border-0 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isNew ? "New bundle" : "Edit bundle"} — {user.name}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <Field label="Name">
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Data (GB)">
                  <Input
                    type="number"
                    min={0}
                    value={editing.gb}
                    onChange={(e) => setEditing({ ...editing, gb: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Price (GHS)">
                  <Input
                    type="number"
                    min={0}
                    value={editing.price}
                    onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })}
                  />
                </Field>
              </div>
              <Field label="Validity">
                <Input
                  value={editing.validity}
                  onChange={(e) => setEditing({ ...editing, validity: e.target.value })}
                  placeholder="e.g. 30 days"
                />
              </Field>
              <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                <div>
                  <div className="text-sm font-medium">Featured</div>
                  <div className="text-xs text-muted-foreground">Highlight this bundle for the customer.</div>
                </div>
                <Switch
                  checked={!!editing.popular}
                  onCheckedChange={(v) => setEditing({ ...editing, popular: v })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditing(null); setIsNew(false); }}>Cancel</Button>
            <Button onClick={save} className="gradient-gold text-primary-foreground">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent className="glass border-0">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this bundle?</AlertDialogTitle>
            <AlertDialogDescription>
              It will no longer be available to {user.name}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent className="glass border-0">
          <AlertDialogHeader>
            <AlertDialogTitle>Reset catalogue?</AlertDialogTitle>
            <AlertDialogDescription>
              This restores {user.name}'s bundle list to the global defaults. Custom prices will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doReset}>Reset</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
