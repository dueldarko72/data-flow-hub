import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { issueTwoFactorCode, messageFor, verifyTwoFactorCode } from "@/lib/security";
import { toast } from "sonner";

export interface TwoFactorRequest {
  purpose: string;
  title: string;
  description: string;
  destination: string;
  onVerified: () => void | Promise<void>;
}

/**
 * Step-up 2FA challenge. A 6-digit one-time code is generated and "delivered"
 * to the admin's registered contact (surfaced in-app in this prototype build).
 */
export function TwoFactorDialog({
  request,
  onClose,
}: {
  request: TwoFactorRequest | null;
  onClose: () => void;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const send = async () => {
    if (!request) return;
    setBusy(true);
    try {
      const issued = await issueTwoFactorCode(request.purpose, request.destination);
      setSentTo(issued.sentTo);
      toast.info(`Verification code sent to ${issued.sentTo}`, {
        description: `Code: ${issued.code} (expires in 5 minutes)`,
        duration: 15000,
      });
    } catch (err) {
      toast.error(messageFor(err, "Could not send code"));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!request) return;
    setBusy(true);
    try {
      await verifyTwoFactorCode(request.purpose, code);
      setCode("");
      setSentTo(null);
      await request.onVerified();
      onClose();
    } catch (err) {
      toast.error(messageFor(err, "Verification failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={!!request}
      onOpenChange={(o) => {
        if (!o) {
          setCode("");
          setSentTo(null);
          onClose();
        }
      }}
    >
      <DialogContent className="glass border-0 sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> {request?.title ?? "Verify it's you"}
          </DialogTitle>
          <DialogDescription>{request?.description}</DialogDescription>
        </DialogHeader>

        {sentTo ? (
          <div className="space-y-2">
            <Label htmlFor="otp">6-digit verification code</Label>
            <Input
              id="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
            />
            <p className="text-xs text-muted-foreground">Sent to {sentTo}. Expires in 5 minutes.</p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            We'll send a one-time code to your registered contact before this action runs.
          </p>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          {sentTo ? (
            <>
              <Button variant="ghost" onClick={send} disabled={busy}>
                Resend
              </Button>
              <Button
                onClick={confirm}
                disabled={busy || code.length !== 6}
                className="gradient-gold text-primary-foreground"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & continue"}
              </Button>
            </>
          ) : (
            <Button onClick={send} disabled={busy} className="gradient-gold text-primary-foreground">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send code"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
