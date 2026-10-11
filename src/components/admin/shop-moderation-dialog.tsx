"use client";

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { moderateShopAction } from "@/actions/admin";
import type { ShopModerationAction } from "@/lib/shop-moderation-state";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const copy: Record<ShopModerationAction, { label: string; consequence: string }> = {
  APPROVE: { label: "Approve", consequence: "The shop will become active and its owner will receive vendor access." },
  REJECT: { label: "Reject application", consequence: "The application will be rejected and the applicant will be shown your reason." },
  SUSPEND: { label: "Suspend shop", consequence: "The shop and eligible listings will be removed from normal marketplace availability until restored." },
  RESTORE: { label: "Restore shop", consequence: "The shop will return to active status and eligible listings can become public again." },
  BAN: { label: "Ban shop", consequence: "The shop will be prohibited from operating on the marketplace under the existing ban lifecycle rules." },
};

const reasonRequired = new Set<ShopModerationAction>(["REJECT", "SUSPEND", "BAN"]);

export function ShopModerationDialog({ shop, action, open, onOpenChange, onSuccess }: {
  shop: { id: string; storeName: string } | null;
  action: ShopModerationAction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (action: ShopModerationAction) => void;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const needsReason = action ? reasonRequired.has(action) : false;

  if (!shop || !action) return null;
  const details = copy[action];
  const handleOpenChange = (next: boolean) => {
    if (!next) { setReason(""); setError(""); }
    if (!submitting) onOpenChange(next);
  };
  const submit = async () => {
    const enteredReason = reason.trim();
    if (needsReason && enteredReason.length < 3) {
      setError("Enter a clear moderation reason of at least 3 characters.");
      return;
    }
    setSubmitting(true); setError("");
    try {
      const result = await moderateShopAction(shop.id, action, enteredReason || undefined);
      if (!result.success) { setError(result.error || "The moderation action could not be completed."); return; }
      onSuccess(action);
      handleOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The moderation action could not be completed.");
    } finally { setSubmitting(false); }
  };

  return <Dialog open={open} onOpenChange={handleOpenChange}><DialogContent>
    <DialogHeader><div className="mb-2 grid size-11 place-items-center rounded-full bg-destructive/10 text-destructive"><AlertTriangle className="size-5"/></div><DialogTitle>{details.label}: {shop.storeName}</DialogTitle><DialogDescription>{details.consequence}</DialogDescription></DialogHeader>
    <div className="space-y-2"><label htmlFor="moderation-reason" className="text-sm font-medium">Moderation reason{needsReason && <span aria-hidden="true"> *</span>}</label><Textarea id="moderation-reason" value={reason} onChange={(event) => { setReason(event.target.value); if (error) setError(""); }} placeholder={needsReason ? "Explain the reason for this action" : "Optional internal context"} aria-invalid={!!error} aria-describedby={error ? "moderation-error" : undefined} className="min-h-28" disabled={submitting}/>{error && <p id="moderation-error" role="alert" className="text-sm text-destructive">{error}</p>}</div>
    <DialogFooter><Button type="button" variant="outline" disabled={submitting} onClick={() => handleOpenChange(false)}>Cancel</Button><Button type="button" variant="destructive" disabled={submitting || (needsReason && reason.trim().length < 3)} onClick={() => void submit()}>{submitting && <Loader2 className="size-4 animate-spin"/>}{submitting ? "Submitting…" : details.label}</Button></DialogFooter>
  </DialogContent></Dialog>;
}
