import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Filter,
  Download,
  CheckCircle2,
  Clock,
  Zap,
  MoreHorizontal,
  RefreshCw,
  Eye,
  SlidersHorizontal,
  CheckSquare,
  Square,
  PackageCheck,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/status-badge";
import {
  loadOrders,
  formatGHS,
  deliveryLabel,
  type Order,
  type OrderStatus,
} from "@/lib/mock-data";
import { updateOrderStatus, bulkUpdateOrders } from "@/lib/admin-data";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/orders")({
  component: AdminOrders,
});

const STATUSES: OrderStatus[] = [
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled",
  "refunded",
];

function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [groupFilter, setGroupFilter] = useState<"all" | "fast" | "slow">("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshOrders = async () => {
    setLoading(true);
    try {
      const data = await loadOrders();
      setOrders(data);
    } catch (e) {
      console.error("Failed to load orders:", e);
      toast.error("Failed to refresh orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshOrders();

    // Subscribe to realtime changes on orders table
    const channel = supabase
      .channel("admin-orders-table-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        refreshOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      await refreshOrders();
      toast.success(`Order marked as ${newStatus}`);
      if (detailOrder && detailOrder.id === orderId) {
        setDetailOrder({ ...detailOrder, status: newStatus });
      }
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleBulkStatus = async (newStatus: OrderStatus) => {
    if (selectedIds.length === 0) return;
    try {
      await bulkUpdateOrders(selectedIds, newStatus);
      await refreshOrders();
      toast.success(`Updated ${selectedIds.length} orders to ${newStatus}`);
      setSelectedIds([]);
    } catch {
      toast.error("Failed to apply bulk update");
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((o) => o.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (groupFilter !== "all" && (o.group || "fast") !== groupFilter) return false;
      if (q.trim()) {
        const s = q.toLowerCase();
        return (
          o.reference.toLowerCase().includes(s) ||
          o.recipient.includes(s) ||
          o.bundleName.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [orders, q, statusFilter, groupFilter]);

  const counts = useMemo(() => {
    return {
      all: orders.length,
      pending: orders.filter((o) => o.status === "pending").length,
      processing: orders.filter((o) => o.status === "processing").length,
      completed: orders.filter((o) => o.status === "completed").length,
      failed: orders.filter((o) => o.status === "failed" || o.status === "cancelled").length,
    };
  }, [orders]);

  const exportCSV = () => {
    if (filtered.length === 0) {
      toast.error("No orders to export");
      return;
    }
    const headers = [
      "Reference",
      "Bundle",
      "Recipient",
      "Network",
      "Amount",
      "Group",
      "Status",
      "Date",
    ];
    const rows = filtered.map((o) => [
      o.reference,
      `"${o.bundleName}"`,
      o.recipient,
      o.network,
      o.amount,
      o.group || "fast",
      o.status,
      new Date(o.createdAt).toISOString(),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `DataFlex_Orders_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Orders CSV exported");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Orders Management
            </h1>
            <Badge variant="outline" className="border-primary/30 text-primary text-xs">
              {orders.length} Total
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Approve, fulfill, process refunds and monitor real-time order delivery.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={refreshOrders}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
          <Button size="sm" variant="outline" onClick={exportCSV} className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Status Filter Pills */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={statusFilter === "all" ? "secondary" : "ghost"}
          onClick={() => setStatusFilter("all")}
          className="h-8 text-xs gap-1.5"
        >
          All Orders <span className="opacity-60">({counts.all})</span>
        </Button>
        <Button
          size="sm"
          variant={statusFilter === "pending" ? "secondary" : "ghost"}
          onClick={() => setStatusFilter("pending")}
          className={`h-8 text-xs gap-1.5 ${counts.pending > 0 ? "text-amber-500 font-semibold" : ""}`}
        >
          Pending{" "}
          <Badge className="h-4 px-1 text-[10px] bg-amber-500 text-white">{counts.pending}</Badge>
        </Button>
        <Button
          size="sm"
          variant={statusFilter === "processing" ? "secondary" : "ghost"}
          onClick={() => setStatusFilter("processing")}
          className="h-8 text-xs gap-1.5"
        >
          Processing <span className="opacity-60">({counts.processing})</span>
        </Button>
        <Button
          size="sm"
          variant={statusFilter === "completed" ? "secondary" : "ghost"}
          onClick={() => setStatusFilter("completed")}
          className="h-8 text-xs gap-1.5"
        >
          Completed <span className="opacity-60">({counts.completed})</span>
        </Button>
        <Button
          size="sm"
          variant={statusFilter === "failed" ? "secondary" : "ghost"}
          onClick={() => setStatusFilter("failed")}
          className="h-8 text-xs gap-1.5"
        >
          Failed / Refunded <span className="opacity-60">({counts.failed})</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card className="glass border-0 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by reference, recipient phone, or bundle name..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={groupFilter}
              onValueChange={(v) => setGroupFilter(v as "all" | "fast" | "slow")}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Delivery Speed" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Speeds</SelectItem>
                <SelectItem value="fast">⚡ Fast (30s)</SelectItem>
                <SelectItem value="slow">⏳ Standard (1-2hr)</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as OrderStatus | "all")}
            >
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Bulk Action Toolbar */}
        {selectedIds.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/10 p-2.5 animate-in fade-in">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary">
              <PackageCheck className="h-4 w-4" />
              <span>{selectedIds.length} orders selected</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                size="sm"
                onClick={() => handleBulkStatus("completed")}
                className="h-7 bg-emerald-600 px-2 text-xs text-white hover:bg-emerald-700"
              >
                Mark Completed
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkStatus("processing")}
                className="h-7 text-xs"
              >
                Mark Processing
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkStatus("refunded")}
                className="h-7 text-xs text-destructive hover:text-destructive"
              >
                Mark Refunded
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedIds([])}
                className="h-7 text-xs"
              >
                Deselect
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Orders Table */}
      <Card className="glass border-0 overflow-hidden">
        <Table className="min-w-[840px]">
          <TableHeader>
            <TableRow className="border-b border-border/50">
              <TableHead className="w-10">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="grid h-4 w-4 place-items-center text-muted-foreground hover:text-foreground"
                >
                  {selectedIds.length === filtered.length && filtered.length > 0 ? (
                    <CheckSquare className="h-4 w-4 text-primary" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </button>
              </TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Bundle & Network</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-16 text-center text-sm text-muted-foreground">
                  No orders match your search or filter parameters.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((o) => {
                const isSelected = selectedIds.includes(o.id);
                return (
                  <TableRow key={o.id} className={`transition ${isSelected ? "bg-primary/5" : ""}`}>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => toggleSelectOne(o.id)}
                        className="grid h-4 w-4 place-items-center text-muted-foreground hover:text-foreground"
                      >
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 text-primary" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-xs font-semibold">
                      {o.reference}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      <div className="font-semibold">{o.bundleName}</div>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Badge variant="outline" className="h-4 px-1 text-[9px]">
                          {o.network}
                        </Badge>
                        <span>{deliveryLabel(o.group)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-sm font-medium">
                      {o.recipient}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm font-bold">
                      {formatGHS(o.amount)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(o.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={o.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDetailOrder(o)}
                          className="h-8 px-2 text-xs gap-1"
                        >
                          <Eye className="h-3.5 w-3.5" /> Details
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline" className="h-8 px-2 text-xs">
                              Update
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="glass border-0 w-40">
                            {STATUSES.map((s) => (
                              <DropdownMenuItem
                                key={s}
                                disabled={s === o.status}
                                onClick={() => handleStatusChange(o.id, s)}
                                className="capitalize text-xs font-medium cursor-pointer"
                              >
                                {s === "completed" && (
                                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-emerald-500" />
                                )}
                                {s === "processing" && (
                                  <Clock className="mr-1.5 h-3.5 w-3.5 text-blue-500" />
                                )}
                                {s === "refunded" && (
                                  <RotateCcw className="mr-1.5 h-3.5 w-3.5 text-purple-500" />
                                )}
                                Mark {s}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Order Detail Modal */}
      <Dialog open={!!detailOrder} onOpenChange={(open) => !open && setDetailOrder(null)}>
        <DialogContent className="glass border-0 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Order Details</span>
              {detailOrder && <StatusBadge status={detailOrder.status} />}
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">
              Reference: {detailOrder?.reference}
            </DialogDescription>
          </DialogHeader>

          {detailOrder && (
            <div className="space-y-4 py-2 text-sm">
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-border/50 bg-card/40 p-3.5">
                <div>
                  <div className="text-xs text-muted-foreground">Bundle Name</div>
                  <div className="font-semibold text-foreground">{detailOrder.bundleName}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Amount Paid</div>
                  <div className="font-bold text-primary font-display text-base">
                    {formatGHS(detailOrder.amount)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Recipient Number</div>
                  <div className="font-mono font-medium">{detailOrder.recipient}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Network Provider</div>
                  <div className="font-medium">{detailOrder.network}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Delivery Speed</div>
                  <div className="text-xs font-medium">{deliveryLabel(detailOrder.group)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Payment Method</div>
                  <div className="text-xs font-medium">{detailOrder.paymentMethod}</div>
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold mb-2">Change Order Status:</div>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    size="sm"
                    variant={detailOrder.status === "completed" ? "default" : "outline"}
                    className={
                      detailOrder.status === "completed"
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : ""
                    }
                    onClick={() => handleStatusChange(detailOrder.id, "completed")}
                  >
                    Completed
                  </Button>
                  <Button
                    size="sm"
                    variant={detailOrder.status === "processing" ? "default" : "outline"}
                    onClick={() => handleStatusChange(detailOrder.id, "processing")}
                  >
                    Processing
                  </Button>
                  <Button
                    size="sm"
                    variant={detailOrder.status === "refunded" ? "default" : "outline"}
                    onClick={() => handleStatusChange(detailOrder.id, "refunded")}
                  >
                    Refunded
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOrder(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
