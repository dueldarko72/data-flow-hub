import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Banknote, Loader2, Lock, ShieldCheck, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatGHS } from "@/lib/mock-data";

import {
  availableBalance,
  loadSettings,
  loadWithdrawals,
  recordWithdrawal,
  type Withdrawal,
} from "@/lib/admin-data";
import { useAuth } from "@/lib/auth";
import { hasPasscode, messageFor, setPasscode, verifyPasscode } from "@/lib/security";
import { TwoFactorDialog, type TwoFactorRequest } from "@/components/two-factor-dialog";
import { recordAudit } from "@/lib/audit";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/withdraw")({
  component: AdminWithdraw,
});

function AdminWithdraw() {
  const { user } = useAuth();
  const adminId = user?.email?.toLowerCase() ?? "admin";
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState<Withdrawal[]>([]);
  const [amount, setAmount] = useState("");
  const [destination, setDestination] = useState("");
  const [passcode, setPasscodeValue] = useState("");
  const [confirm, setConfirm] = useState("");
  const [needsSetup, setNeedsSetup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [twoFactor, setTwoFactor] = useState<TwoFactorRequest | null>(null);

  const refresh = async () => {
    const [bal, hist] = await Promise.all([availableBalance(), loadWithdrawals()]);
    setBalance(bal);
    setHistory(hist);
  };

  useEffect(() => {
    refresh();
    setNeedsSetup(!hasPasscode(adminId));
    loadSettings().then((s) => setDestination(s.momoNumber ?? ""));

    const channel = (async () => {
      const { supabase } = await import("@/lib/supabase");
      return supabase
        .channel("admin-withdrawals-realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "withdrawals" }, () => {
          refresh();
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
          refresh();
        })
        .subscribe();
    })();

    return () => {
      channel.then((ch) => {
        import("@/lib/supabase").then(({ supabase }) => supabase.removeChannel(ch));
      });
    };
  }, [adminId]);

  const createPasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (passcode !== confirm) throw new Error("Passcodes do not match");
      await setPasscode(adminId, passcode);
      setNeedsSetup(false);
      setPasscodeValue("");
      setConfirm("");
      recordAudit("security", "Withdrawal passcode created");
      toast.success("Withdrawal passcode created");
    } catch (err) {
      toast.error(messageFor(err, "Could not set passcode"));
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const value = Number(amount);
      if (!Number.isFinite(value) || value <= 0) throw new Error("Enter a valid amount");
      if (value > balance) throw new Error("Amount exceeds your available balance");
      if (!/^(?:0\d{9}|\+?233\d{9})$/.test(destination.replace(/[\s-]/g, "")))
        throw new Error("Enter a valid Mobile Money number");
      await verifyPasscode(adminId, passcode);
      // Step-up 2FA before money leaves the account.
      setTwoFactor({
        purpose: "withdrawal",
        title: "Confirm withdrawal",
        description: `Two-factor verification is required to send ${formatGHS(Number(value.toFixed(2)))} to ${destination}.`,
        destination: user?.email ?? destination,
        onVerified: async () => {
          await recordWithdrawal({
            amount: Number(value.toFixed(2)),
            account: destination,
            destination,
            network: "MTN",
            adminId: user?.id,
          });
          setAmount("");
          setPasscodeValue("");
          refresh();
          toast.success("Withdrawal successful");
        },
      });
    } catch (err) {
      toast.error(messageFor(err, "Withdrawal failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <TwoFactorDialog request={twoFactor} onClose={() => setTwoFactor(null)} />
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Withdraw</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Move your settled earnings to Mobile Money. Protected by a 4-digit passcode.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="glass border-0 p-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Wallet className="h-4 w-4 text-primary" /> Available balance
          </div>
          <div className="mt-2 font-display text-3xl font-bold text-gradient-gold">
            {formatGHS(balance)}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Settled from completed orders, minus previous withdrawals.
          </p>
        </Card>

        <Card className="glass border-0 p-5 lg:col-span-2">
          {needsSetup ? (
            <form onSubmit={createPasscode} className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="h-4 w-4 text-primary" /> Create your withdrawal passcode
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="pc">4-digit passcode</Label>
                  <Input
                    id="pc"
                    inputMode="numeric"
                    autoComplete="new-password"
                    type="password"
                    maxLength={4}
                    value={passcode}
                    onChange={(e) => setPasscodeValue(e.target.value.replace(/\D/g, ""))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pc2">Confirm passcode</Label>
                  <Input
                    id="pc2"
                    inputMode="numeric"
                    autoComplete="new-password"
                    type="password"
                    maxLength={4}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))}
                  />
                </div>
              </div>
              <Button disabled={busy} className="gradient-gold text-primary-foreground">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save passcode"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Your passcode is hashed before it is stored — it is never kept in plain text.
              </p>
            </form>
          ) : (
            <form onSubmit={withdraw} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (GHS)</Label>
                  <Input
                    id="amount"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dest">Mobile Money number</Label>
                  <Input
                    id="dest"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="0244000000"
                  />
                </div>
              </div>
              <div className="space-y-2 sm:max-w-[220px]">
                <Label htmlFor="pin" className="flex items-center gap-1">
                  <Lock className="h-3.5 w-3.5" /> 4-digit passcode
                </Label>
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={4}
                  value={passcode}
                  onChange={(e) => setPasscodeValue(e.target.value.replace(/\D/g, ""))}
                />
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-xs text-muted-foreground mr-1">Quick presets:</span>
                {[0.25, 0.5, 0.75, 1.0].map((pct) => (
                  <Button
                    key={pct}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setAmount((balance * pct).toFixed(2))}
                  >
                    {pct * 100}%
                  </Button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  disabled={busy || balance <= 0}
                  className="gradient-gold text-primary-foreground"
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Banknote className="mr-2 h-4 w-4" /> Withdraw Funds
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Protected by your 4-digit passcode plus two-factor verification. Five wrong passcode
                attempts lock withdrawals for 15 minutes.
              </p>
            </form>
          )}
        </Card>
      </div>

      <Card className="glass border-0 overflow-hidden">
        <div className="border-b border-border/50 p-4 text-sm font-semibold">
          Withdrawal history
        </div>
        {history.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No withdrawals yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[520px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(w.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-xs">
                      {w.destination}
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-semibold">
                      {formatGHS(w.amount)}
                    </TableCell>
                    <TableCell className="capitalize">{w.status}</TableCell>
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
