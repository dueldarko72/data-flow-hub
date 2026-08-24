import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollText, Search, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { loadAuditLog, type AuditCategory, type AuditEntry } from "@/lib/audit";

export const Route = createFileRoute("/admin/audit")({
  component: AdminAudit,
});

const CATEGORIES: (AuditCategory | "all")[] = [
  "all",
  "bundle",
  "withdrawal",
  "security",
  "user",
  "settings",
];

function AdminAudit() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<AuditCategory | "all">("all");

  useEffect(() => {
    const load = () => setEntries(loadAuditLog());
    load();
    const id = window.setInterval(load, 5000);
    window.addEventListener("focus", load);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", load);
    };
  }, []);

  const filtered = useMemo(
    () =>
      entries.filter((e) => {
        const inCat = category === "all" || e.category === category;
        const term = q.trim().toLowerCase();
        const inQ =
          !term ||
          e.action.toLowerCase().includes(term) ||
          e.actor.toLowerCase().includes(term) ||
          (e.detail ?? "").toLowerCase().includes(term);
        return inCat && inQ;
      }),
    [entries, q, category],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Audit log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every bundle edit, withdrawal and security-sensitive change, with timestamp and actor.
        </p>
      </div>

      <Card className="glass border-0 p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search action, actor, detail…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Select value={category} onValueChange={(v) => setCategory(v as AuditCategory | "all")}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c} className="capitalize">
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="glass border-0 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-16 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10">
              <ScrollText className="h-6 w-6 text-primary" />
            </div>
            <div className="mt-4 text-sm font-medium">No audit entries yet</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Actions you take in the admin dashboard will be recorded here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(e.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs font-mono">{e.actor}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {e.category === "security" && <ShieldCheck className="mr-1 h-3 w-3" />}
                        {e.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm font-medium">
                      {e.action}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {e.detail ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
