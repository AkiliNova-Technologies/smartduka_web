"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { Flag } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const options = {
  PRODUCT: [
    ["COUNTERFEIT", "Counterfeit or fake item"],
    ["MISLEADING_INFORMATION", "Misleading information"],
    ["PROHIBITED_ITEM", "Prohibited item"],
    ["WRONG_CATEGORY", "Wrong category"],
    ["PRICE_MANIPULATION", "Price manipulation"],
    ["INTELLECTUAL_PROPERTY", "Intellectual property"],
    ["SCAM_OR_FRAUD", "Scam or fraud"],
    ["OTHER", "Other"],
  ],
  SHOP: [
    ["MISLEADING_INFORMATION", "Misleading information"],
    ["SCAM_OR_FRAUD", "Scam or fraud"],
    ["IMPERSONATION", "Impersonation"],
    ["ABUSIVE_BEHAVIOR", "Abusive behavior"],
    ["SPAM", "Spam"],
    ["OTHER", "Other"],
  ],
} as const;
export function ReportEntryPoint({
  targetType,
  targetId,
  label,
}: {
  targetType: "PRODUCT" | "SHOP";
  targetId: string;
  label: string;
}) {
  const { isAuthenticated, sessionReady } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  if (!sessionReady) return null;
  if (!isAuthenticated)
    return (
      <Link
        href={`/login?callbackUrl=${encodeURIComponent(pathname)}`}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
        <Flag className="size-3" />
        Report {targetType === "PRODUCT" ? "product" : "shop"}
      </Link>
    );
  const submit = async () => {
    setError("");
    if (!reason) return setError("Choose a reason.");
    if (reason === "OTHER" && description.trim().length < 10)
      return setError("Please tell us a little more.");
    setSaving(true);
    try {
      const response = await fetch("/api/marketplace-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId, reason, description }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error || "Unable to submit report.");
      setDone(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to submit report.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setDone(false);
          setError("");
        }
      }}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
          <Flag className="size-3" />
          Report {targetType === "PRODUCT" ? "product" : "shop"}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-card p-5 shadow-xl">
          <Dialog.Title className="text-lg font-semibold">
            Report this {targetType === "PRODUCT" ? "product" : "shop"}
          </Dialog.Title>
          {done ? (
            <>
              <Dialog.Description className="mt-2 text-sm text-muted-foreground">
                Thanks. Your report about {label} has been received. We’ll keep
                you updated.
              </Dialog.Description>
              <button
                onClick={() => setOpen(false)}
                className="mt-5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                Done
              </button>
            </>
          ) : (
            <>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                Tell us what is wrong. Your report is reviewed privately.
              </Dialog.Description>
              <label className="mt-5 block text-sm font-medium">
                Reason
                <Select
                  value={reason}
                  onValueChange={setReason}>
                  <SelectTrigger
                    aria-label="Reason"
                    className="mt-2 h-10 w-full rounded-full bg-background px-3">
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent className="p-2">
                    {options[targetType].map(([value, text]) => (
                      <SelectItem key={value} value={value}>
                        {text}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="mt-4 block text-sm font-medium">
                Tell us more{" "}
                <span className="font-normal text-muted-foreground">
                  (optional unless Other)
                </span>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={2000}
                  className="mt-2 min-h-24"
                  placeholder="What should our team know?"
                />
              </label>
              {error && (
                <p role="alert" className="mt-3 text-sm text-destructive">
                  {error}
                </p>
              )}
              <div className="mt-5 flex justify-end gap-2">
                <Dialog.Close asChild>
                  <button className="rounded-full px-4 py-2 text-sm font-medium hover:bg-muted">
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  disabled={saving}
                  onClick={submit}
                  className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 dark:text-white">
                  {saving ? "Submitting…" : "Submit report"}
                </button>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
