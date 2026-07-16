import { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "@/lib/mock-data";

const styles: Record<OrderStatus, string> = {
  pending: "bg-warning/15 text-warning border-warning/30",
  processing: "bg-primary/15 text-primary border-primary/30",
  completed: "bg-success/15 text-success border-success/30",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
  cancelled: "bg-muted text-muted-foreground border-border",
  refunded: "bg-accent/15 text-accent border-accent/30",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant="outline" className={`capitalize ${styles[status]}`}>
      {status}
    </Badge>
  );
}
