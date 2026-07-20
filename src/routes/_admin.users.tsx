import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Ban, CircleCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatGHS } from "@/lib/mock-data";
import { loadUsers, toggleUserStatus, type AdminUser } from "@/lib/admin-data";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [q, setQ] = useState("");

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
        <h1 className="font-display text-3xl font-bold">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">Customer directory with lifetime spend.</p>
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
        <Table>
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
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="gradient-gold text-xs font-bold text-primary-foreground">
                        {u.name.slice(0, 1)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium">{u.name}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{u.phone ?? "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(u.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-sm font-medium">{u.orders}</TableCell>
                <TableCell className="text-sm font-semibold">{formatGHS(u.spent)}</TableCell>
                <TableCell>
                  {u.status === "active" ? (
                    <Badge variant="outline" className="border-emerald-500/40 text-emerald-600">Active</Badge>
                  ) : (
                    <Badge variant="outline" className="border-destructive/40 text-destructive">Suspended</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => toggle(u.id)}>
                    {u.status === "active" ? (
                      <>
                        <Ban className="mr-1 h-3.5 w-3.5" /> Suspend
                      </>
                    ) : (
                      <>
                        <CircleCheck className="mr-1 h-3.5 w-3.5" /> Reactivate
                      </>
                    )}
                  </Button>
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
    </div>
  );
}
