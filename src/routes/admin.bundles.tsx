import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { formatGHS, type Bundle } from "@/lib/mock-data";
import { loadBundles, upsertBundle, deleteBundle } from "@/lib/admin-data";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/bundles")({
  component: AdminBundles,
});

function AdminBundles() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [editing, setEditing] = useState<Bundle | null>(null);
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setBundles(loadBundles());
  }, []);

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
    setOpen(true);
  };

  const save = () => {
    if (!editing) return;
    if (!editing.name.trim() || editing.price <= 0 || editing.gb <= 0) {
      toast.error("Fill in all fields correctly");
      return;
    }
    upsertBundle(editing);
    setBundles(loadBundles());
    setOpen(false);
    setEditing(null);
    toast.success("Bundle saved");
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    deleteBundle(deleteId);
    setBundles(loadBundles());
    setDeleteId(null);
    toast.success("Bundle removed");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Bundles</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage bundle catalogue, pricing and validity.</p>
        </div>
        <Button onClick={startCreate} className="gradient-gold text-primary-foreground hover:opacity-90">
          <Plus className="mr-1 h-4 w-4" /> <span className="hidden sm:inline">New bundle</span><span className="sm:hidden">New</span>
        </Button>
      </div>

      <Card className="glass border-0 overflow-hidden">
        <Table className="min-w-[760px]">

          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Network</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Validity</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Featured</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bundles.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="whitespace-nowrap font-medium">{b.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{b.network}</Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap">{b.gb} GB</TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{b.validity}</TableCell>
                <TableCell className="whitespace-nowrap font-semibold">{formatGHS(b.price)}</TableCell>

                <TableCell>
                  {b.popular ? (
                    <Badge className="gradient-gold text-primary-foreground">
                      <Star className="mr-1 h-3 w-3" /> Popular
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditing(b);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleteId(b.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="glass border-0 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing && bundles.find((b) => b.id === editing.id) ? "Edit bundle" : "New bundle"}</DialogTitle>
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
                  <div className="text-xs text-muted-foreground">Show a "Popular" badge on the buy page.</div>
                </div>
                <Switch
                  checked={!!editing.popular}
                  onCheckedChange={(v) => setEditing({ ...editing, popular: v })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} className="gradient-gold text-primary-foreground">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent className="glass border-0">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this bundle?</AlertDialogTitle>
            <AlertDialogDescription>Customers will no longer see it on the buy page.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
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
