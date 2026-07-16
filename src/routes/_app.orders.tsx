import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Download, ShoppingBag } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { loadOrders, formatGHS, type Order, type OrderStatus } from "@/lib/mock-data";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/orders")({
  component: OrdersPage,
});

function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [selected, setSelected] = useState<Order | null>(null);

  useEffect(() => {
    setOrders(loadOrders());
  }, []);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matches = q
        ? o.reference.toLowerCase().includes(q.toLowerCase()) ||
          o.recipient.includes(q) ||
          o.bundleName.toLowerCase().includes(q.toLowerCase())
        : true;
      const st = status === "all" || o.status === status;
      return matches && st;
    });
  }, [orders, q, status]);

  const downloadReceipt = (o: Order) => {
    const receipt = `DATAHUB RECEIPT
=================
Reference: ${o.reference}
Date: ${new Date(o.createdAt).toLocaleString()}

Bundle: ${o.bundleName}
Network: ${o.network}
Size: ${o.gb}GB
Recipient: ${o.recipient}

Amount: ${formatGHS(o.amount)}
Payment: ${o.paymentMethod}
Status: ${o.status.toUpperCase()}
`;
    const blob = new Blob([receipt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${o.reference}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Receipt downloaded");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">Search, filter, and download receipts.</p>
        </div>
        <Button asChild className="gradient-gold text-primary-foreground">
          <Link to="/buy">Buy new bundle</Link>
        </Button>
      </div>

      <Card className="glass border-0 p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search reference, phone, bundle…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v as OrderStatus | "all")}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {["all", "pending", "processing", "completed", "failed", "cancelled", "refunded"].map(
                (s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="glass border-0 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-16 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10">
              <ShoppingBag className="h-6 w-6 text-primary" />
            </div>
            <div className="mt-4 text-sm font-medium">No orders found</div>
            <p className="mt-1 text-xs text-muted-foreground">Try clearing your filters.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Bundle</TableHead>
                <TableHead className="hidden md:table-cell">Recipient</TableHead>
                <TableHead className="hidden lg:table-cell">Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">{o.reference}</TableCell>
                  <TableCell className="font-medium">{o.bundleName}</TableCell>
                  <TableCell className="hidden md:table-cell">{o.recipient}</TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                    {new Date(o.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-semibold">{formatGHS(o.amount)}</TableCell>
                  <TableCell>
                    <StatusBadge status={o.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="ghost" onClick={() => setSelected(o)}>
                          View
                        </Button>
                      </DialogTrigger>
                      {selected?.id === o.id && (
                        <DialogContent className="glass border-0">
                          <DialogHeader>
                            <DialogTitle>Order details</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-2 text-sm">
                            <Row label="Reference" value={o.reference} />
                            <Row label="Bundle" value={`${o.bundleName} (${o.gb}GB)`} />
                            <Row label="Network" value={o.network} />
                            <Row label="Recipient" value={o.recipient} />
                            <Row label="Amount" value={formatGHS(o.amount)} />
                            <Row label="Payment" value={o.paymentMethod} />
                            <Row label="Date" value={new Date(o.createdAt).toLocaleString()} />
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Status</span>
                              <StatusBadge status={o.status} />
                            </div>
                          </div>
                          <Button
                            onClick={() => downloadReceipt(o)}
                            className="w-full gradient-gold text-primary-foreground"
                          >
                            <Download className="mr-2 h-4 w-4" /> Download receipt
                          </Button>
                        </DialogContent>
                      )}
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
