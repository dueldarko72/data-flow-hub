import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Star,
  Copy,
  Clock,
  LayoutGrid,
  List,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  Wifi,
  Radio,
  CheckCircle2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { formatGHS, type Bundle } from "@/lib/mock-data";
import { loadBundles, upsertBundle, deleteBundle } from "@/lib/admin-data";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/bundles")({
  component: AdminBundles,
});

function AdminBundles() {
  const [allBundles, setAllBundles] = useState<Bundle[]>([]);
  const [editing, setEditing] = useState<Bundle | null>(null);
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [networkFilter, setNetworkFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);

  const refreshBundles = async () => {
    setLoading(true);
    try {
      const data = await loadBundles();
      setAllBundles(data);
    } catch (e) {
      console.error("Failed to load bundles:", e);
      toast.error("Failed to load bundle catalog");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshBundles();

    // Subscribe to realtime updates for the bundles table
    const channel = supabase
      .channel("admin-bundles-realtime-catalog")
      .on("postgres_changes", { event: "*", schema: "public", table: "bundles" }, () => {
        refreshBundles();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter only standard 1hr-2hr bundles (slow group) as Fast delivery is managed per-user in /admin/users
  const standardBundles = useMemo(() => {
    return allBundles.filter((b) => b.group === "slow");
  }, [allBundles]);

  const filtered = useMemo(() => {
    return standardBundles.filter((b) => {
      if (networkFilter !== "all" && b.network !== networkFilter) return false;
      return true;
    });
  }, [standardBundles, networkFilter]);

  const startCreate = () => {
    setEditing({
      id: "b" + Math.random().toString(36).slice(2, 8),
      network: "MTN",
      name: "",
      gb: 10,
      price: 45,
      validity: "30 days",
      popular: false,
      group: "slow",
      description: "Standard wholesale queue data (1hr – 2hr delivery)",
    });
    setOpen(true);
  };

  const handleDuplicate = (bundle: Bundle) => {
    setEditing({
      ...bundle,
      id: "b" + Math.random().toString(36).slice(2, 8),
      name: `${bundle.name} (Copy)`,
      group: "slow",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim() || editing.price <= 0 || editing.gb <= 0) {
      toast.error("Please fill in valid name, price, and GB values");
      return;
    }
    try {
      // Standard bundles are always saved with group = "slow"
      await upsertBundle({ ...editing, group: "slow" });
      await refreshBundles();
      setOpen(false);
      setEditing(null);
      toast.success("Standard (1hr-2hr) bundle saved & synced to all customer catalogs");
    } catch {
      toast.error("Failed to save bundle to Supabase");
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteBundle(deleteId);
      await refreshBundles();
      toast.success("Standard bundle deleted successfully");
    } catch {
      toast.error("Failed to delete bundle");
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Standard (1hr – 2hr) Bundles Catalog
            </h1>
            <Badge variant="outline" className="border-blue-500/30 text-blue-500 text-xs gap-1">
              <Clock className="h-3 w-3" />
              {standardBundles.length} Standard Plans
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure global wholesale <strong>(standard 1hr – 2hr)</strong> data plans. All changes
            made here automatically reflect across every customer catalog.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center rounded-lg border border-border/60 p-1">
            <Button
              size="sm"
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              onClick={() => setViewMode("grid")}
              className="h-7 w-7 p-0"
              aria-label="Grid View"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === "table" ? "secondary" : "ghost"}
              onClick={() => setViewMode("table")}
              className="h-7 w-7 p-0"
              aria-label="Table View"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={refreshBundles}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            onClick={startCreate}
            className="gradient-gold h-9 gap-1.5 text-primary-foreground glow"
          >
            <Plus className="h-4 w-4" />
            <span>New Standard Bundle</span>
          </Button>
        </div>
      </div>

      {/* Global Sync Notification Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-xs">
        <div className="flex items-start sm:items-center gap-2.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-500/10 text-blue-500">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <span className="font-semibold text-blue-500">
              Universal Realtime Auto-Sync Active:
            </span>{" "}
            Any price, data volume, or validity edited on these{" "}
            <strong>Standard (1hr – 2hr)</strong> packages instantly updates for all customers on
            their storefronts and under their Users profile dialog.
          </div>
        </div>
      </div>

      {/* Filter and Network Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={networkFilter === "all" ? "secondary" : "ghost"}
            onClick={() => setNetworkFilter("all")}
            className="h-8 text-xs"
          >
            All Networks ({standardBundles.length})
          </Button>
          <Button
            size="sm"
            variant={networkFilter === "MTN" ? "secondary" : "ghost"}
            onClick={() => setNetworkFilter("MTN")}
            className="h-8 text-xs"
          >
            MTN Ghana
          </Button>
          <Button
            size="sm"
            variant={networkFilter === "Vodafone" ? "secondary" : "ghost"}
            onClick={() => setNetworkFilter("Vodafone")}
            className="h-8 text-xs"
          >
            Telecel / Vodafone
          </Button>
          <Button
            size="sm"
            variant={networkFilter === "AirtelTigo" ? "secondary" : "ghost"}
            onClick={() => setNetworkFilter("AirtelTigo")}
            className="h-8 text-xs"
          >
            AT / AirtelTigo
          </Button>
        </div>
      </div>

      {/* View: Grid Mode */}
      {viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.length === 0 ? (
            <div className="col-span-full py-16 text-center text-sm text-muted-foreground">
              No Standard (1hr – 2hr) bundles found for the selected filter.
            </div>
          ) : (
            filtered.map((bundle) => (
              <Card
                key={bundle.id}
                className="glass border-0 relative flex flex-col justify-between p-5 transition-all duration-200 hover:border-border hover:shadow-lg"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-500/10 text-blue-500">
                        <Wifi className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm line-clamp-1">{bundle.name}</div>
                        <div className="text-xs text-muted-foreground">{bundle.network}</div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {bundle.popular && (
                        <Badge className="gradient-gold text-[10px] text-primary-foreground">
                          <Star className="mr-1 h-2.5 w-2.5" /> Popular
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className="text-[10px] gap-1 border-blue-500/30 text-blue-500"
                      >
                        <Clock className="h-2.5 w-2.5" /> 1-2hr
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-5 space-y-1">
                    <div className="font-display text-3xl font-extrabold tracking-tight">
                      {bundle.gb}{" "}
                      <span className="text-sm font-medium text-muted-foreground">GB</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Validity:{" "}
                      <span className="font-medium text-foreground">{bundle.validity}</span>
                    </div>
                  </div>

                  {bundle.description && (
                    <p className="mt-3 text-xs text-muted-foreground line-clamp-2">
                      {bundle.description}
                    </p>
                  )}
                </div>

                <div className="mt-5 border-t border-border/50 pt-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Global Price
                      </div>
                      <div className="font-display text-lg font-bold text-primary">
                        {formatGHS(bundle.price)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => handleDuplicate(bundle)}
                        title="Duplicate Plan"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditing(bundle);
                          setOpen(true);
                        }}
                        title="Edit Plan"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setDeleteId(bundle.id)}
                        title="Delete Plan"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      ) : (
        /* View: Table Mode */
        <Card className="glass border-0 overflow-x-auto">
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow className="border-b border-border/50">
                <TableHead>Bundle</TableHead>
                <TableHead>Network</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Global Price</TableHead>
                <TableHead>Validity</TableHead>
                <TableHead>Delivery Speed</TableHead>
                <TableHead>Featured</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-16 text-center text-sm text-muted-foreground"
                  >
                    No Standard (1hr – 2hr) bundles found for the selected filter.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((bundle) => (
                  <TableRow key={bundle.id} className="transition hover:bg-card/40">
                    <TableCell>
                      <div className="font-semibold text-sm">{bundle.name}</div>
                      {bundle.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {bundle.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{bundle.network}</TableCell>
                    <TableCell className="font-bold text-sm">{bundle.gb} GB</TableCell>
                    <TableCell className="font-bold text-primary">
                      {formatGHS(bundle.price)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {bundle.validity}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="text-[10px] gap-1 border-blue-500/30 text-blue-500"
                      >
                        <Clock className="h-3 w-3" /> Standard (1-2hr)
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {bundle.popular ? (
                        <Badge className="gradient-gold text-[10px] text-primary-foreground">
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
                          className="h-8 w-8"
                          onClick={() => handleDuplicate(bundle)}
                          title="Duplicate Plan"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditing(bundle);
                            setOpen(true);
                          }}
                          title="Edit Plan"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive"
                          onClick={() => setDeleteId(bundle.id)}
                          title="Delete Plan"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Add / Edit Standard Bundle Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass border-0 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing?.id && allBundles.some((b) => b.id === editing.id)
                ? "Edit Standard (1hr-2hr) Bundle"
                : "Create Standard (1hr-2hr) Bundle"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure data plan parameters. Changes immediately update across all customer
              catalogs.
            </DialogDescription>
          </DialogHeader>

          {editing && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Plan Title / Name</Label>
                <Input
                  placeholder="e.g. Monthly Standard 20GB"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Network</Label>
                  <Select
                    value={editing.network}
                    onValueChange={(v) =>
                      setEditing({ ...editing, network: v as Bundle["network"] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MTN">MTN Ghana</SelectItem>
                      <SelectItem value="Vodafone">Telecel / Vodafone</SelectItem>
                      <SelectItem value="AirtelTigo">AT / AirtelTigo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Data Volume (GB)</Label>
                  <Input
                    type="number"
                    min={0.1}
                    step={0.5}
                    value={editing.gb}
                    onChange={(e) => setEditing({ ...editing, gb: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Wholesale Price (GHS)</Label>
                  <Input
                    type="number"
                    min={0.1}
                    step={1}
                    value={editing.price}
                    onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Validity Period</Label>
                  <Input
                    placeholder="e.g. 30 days, 60 days"
                    value={editing.validity}
                    onChange={(e) => setEditing({ ...editing, validity: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Description (Optional)</Label>
                <Input
                  placeholder="e.g. Heavy streaming and remote work data plan"
                  value={editing.description || ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border/50 bg-card/40 p-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-medium">Highlight as Popular</div>
                  <div className="text-[11px] text-muted-foreground">
                    Display gold "Popular" badge on customer buy pages
                  </div>
                </div>
                <Switch
                  checked={!!editing.popular}
                  onCheckedChange={(checked) => setEditing({ ...editing, popular: checked })}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} className="gradient-gold text-primary-foreground">
              Save Standard Bundle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent className="glass border-0">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this standard bundle?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this data plan from the global catalog and all customer
              storefronts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Bundle
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
