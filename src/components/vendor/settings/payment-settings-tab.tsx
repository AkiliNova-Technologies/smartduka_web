"use client";

import { useEffect, useMemo, useState } from "react";
import { Landmark, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Account = {
  id: string;
  provider: "MTN_MOMO" | "AIRTEL_MONEY";
  merchantName: string | null;
  maskedMerchantCode: string | null;
  maskedMerchantPhone: string | null;
  status: "PENDING" | "VERIFIED" | "REJECTED" | "SUSPENDED";
  isDefault: boolean;
  verificationNote: string | null;
  createdAt: string;
  verifiedAt: string | null;
};
type Action = "set-default" | "resubmit" | "delete";
const label = (p: Account["provider"]) =>
  p === "MTN_MOMO" ? "MTN Mobile Money" : "Airtel Money";
const statusHelp: Record<Account["status"], string> = {
  PENDING: "Submitted and waiting for verification.",
  VERIFIED: "Verified and ready to receive payments.",
  REJECTED: "Not approved. Review the note and resubmit or delete it.",
  SUSPENDED: "Temporarily disabled. Review the note and resubmit or delete it.",
};
const emptyForm = {
  provider: "MTN_MOMO" as Account["provider"],
  merchantName: "",
  merchantCode: "",
  merchantPhone: "",
};

export function PaymentSettingsTab() {
  const [accounts, setAccounts] = useState<Account[]>([]),
    [show, setShow] = useState(false),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false),
    [loading, setLoading] = useState(true),
    [query, setQuery] = useState(""),
    [statusFilter, setStatusFilter] = useState<"ALL" | Account["status"]>(
      "ALL",
    ),
    [page, setPage] = useState(0),
    [pendingAction, setPendingAction] = useState<{
      account: Account;
      action: Action;
    } | null>(null),
    [form, setForm] = useState(emptyForm);
  const pageSize = 5;
  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/v1/vendor/payment-accounts", {
          cache: "no-store",
        }),
        j = await r.json();
      if (r.ok) setAccounts(j.data.accounts);
      else setError(j.error?.message || "Unable to load payment accounts.");
    } catch {
      setError("Unable to load payment accounts.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/v1/vendor/payment-accounts", { cache: "no-store" })
      .then(async (response) => ({ response, body: await response.json() }))
      .then(({ response, body }) => {
        if (cancelled) return;
        if (response.ok) setAccounts(body.data.accounts);
        else setError(body.error?.message || "Unable to load payment accounts.");
      })
      .catch(() => { if (!cancelled) setError("Unable to load payment accounts."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  const filtered = useMemo(
    () =>
      accounts.filter(
        (a) =>
          (statusFilter === "ALL" || a.status === statusFilter) &&
          `${label(a.provider)} ${a.merchantName ?? ""} ${a.maskedMerchantCode ?? ""} ${a.maskedMerchantPhone ?? ""}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [accounts, query, statusFilter],
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const resetForm = () => {
    setShow(false);
    setForm(emptyForm);
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = form.merchantCode.trim(),
      phone = form.merchantPhone.trim().replace(/[\s()-]/g, "");
    if (!/^[A-Za-z0-9-]{3,120}$/.test(code))
      return setError(
        "Merchant code must be 3–120 letters, numbers, or hyphens.",
      );
    if (!/^(?:\+?256|0)7\d{8}$/.test(phone))
      return setError(
        "Enter a valid Ugandan Mobile Money number (e.g. 0771234567).",
      );
    setSaving(true);
    setError("");
    try {
      const r = await fetch("/api/v1/vendor/payment-accounts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(form),
        }),
        j = await r.json();
      if (!r.ok)
        return setError(j.error?.message || "Unable to submit account.");
      resetForm();
      await load();
    } catch {
      setError("Unable to submit account.");
    } finally {
      setSaving(false);
    }
  };
  const performAction = async () => {
    if (!pendingAction) return;
    const { account, action } = pendingAction;
    setSaving(true);
    setError("");
    try {
      const r = await fetch(
          `/api/v1/vendor/payment-accounts/${account.id}`,
          action === "delete"
            ? { method: "DELETE" }
            : {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ action }),
              },
        ),
        j = await r.json();
      if (!r.ok) setError(j.error?.message || "Unable to update account.");
      else {
        setPendingAction(null);
        await load();
      }
    } catch {
      setError("Unable to update account.");
    } finally {
      setSaving(false);
    }
  };
  const actionText =
    pendingAction?.action === "set-default"
      ? "make this the default"
      : pendingAction?.action === "resubmit"
        ? "resubmit this account for verification"
        : "delete this account";
  return (
    <TooltipProvider>
      <div className="space-y-6">
        <header>
          <h2 className="text-lg font-semibold">Payment accounts</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Customer payments go directly to your verified merchant account.
            Mwezora does not hold your sales funds.
          </p>
        </header>
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-destructive/30 p-3 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search payment accounts"
              className="pl-9 h-10 rounded-full"
              placeholder="Search accounts"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(0); }}
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value as "ALL" | Account["status"]);
              setPage(0);
            }}>
            <SelectTrigger className="w-full sm:w-44 min-h-10 rounded-full">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent className="p-1">
              <SelectItem value="ALL">All statuses</SelectItem>
              {Object.keys(statusHelp).map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {loading ? (
          <div className="grid gap-4" aria-busy="true" aria-live="polite">
            <span className="sr-only">Loading payment accounts…</span>
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-2xl border bg-card p-5">
                <div className="flex justify-between gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-36" />
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-44" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-8 w-20 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-4">
              {visible.map((a) => (
                <section key={a.id} className="rounded-2xl border bg-card p-5">
                  <div className="flex justify-between gap-4">
                    <div>
                      <p className="font-medium">{label(a.provider)}</p>
                      <p className="mt-2 text-sm">
                        {a.merchantName || "Merchant account"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Merchant code: {a.maskedMerchantCode || "Not provided"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {a.maskedMerchantPhone}
                      </p>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          tabIndex={0}
                          className="h-fit cursor-help rounded-full bg-muted px-2 py-1 text-xs font-medium">
                          {a.status}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>{statusHelp[a.status]}</TooltipContent>
                    </Tooltip>
                  </div>
                  {a.verificationNote && (
                    <p className="mt-3 text-sm text-amber-700">
                      {a.verificationNote}
                    </p>
                  )}
                  <p className="mt-3 text-xs text-muted-foreground">
                    Submitted{" "}
                    {new Date(a.createdAt).toLocaleDateString("en-UG")}
                    {a.verifiedAt
                      ? ` · Verified ${new Date(a.verifiedAt).toLocaleDateString("en-UG")}`
                      : ""}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {a.status === "VERIFIED" && !a.isDefault && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setPendingAction({
                            account: a,
                            action: "set-default",
                          })
                        }>
                        Make default
                      </Button>
                    )}
                    {["REJECTED", "SUSPENDED"].includes(a.status) && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setPendingAction({ account: a, action: "resubmit" })
                          }>
                          Resubmit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            setPendingAction({ account: a, action: "delete" })
                          }>
                          <Trash2 /> Delete
                        </Button>
                      </>
                    )}
                    {a.isDefault && (
                      <span className="text-sm font-medium text-emerald-700">
                        Default for {label(a.provider)}
                      </span>
                    )}
                  </div>
                </section>
              ))}
            </div>
            {filtered.length > pageSize && (
              <PaginationControls
                pageIndex={currentPage}
                pageSize={pageSize}
                pageCount={pageCount}
                total={filtered.length}
                pageSizeOptions={[pageSize]}
                onPageChange={setPage}
                onPageSizeChange={() => undefined}
              />
            )}
            {!accounts.length && !show && (
              <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                <Landmark className="mx-auto mb-3 size-7" />
                Add and verify an MTN or Airtel merchant account to accept
                online payments.
              </div>
            )}
            {accounts.length > 0 && !filtered.length && (
              <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                No payment accounts match your filters.
              </p>
            )}
          </>
        )}
        <Button onClick={() => setShow(true)} disabled={show} className="rounded-full px-4 h-10 dark:text-white">
          <Plus /> Add payment account
        </Button>
        {show && (
          <form
            onSubmit={submit}
            className="space-y-5 rounded-2xl border bg-card p-5">
            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <Select
                value={form.provider}
                onValueChange={(provider) =>
                  setForm({
                    ...form,
                    provider: provider as Account["provider"],
                  })
                }>
                <SelectTrigger id="provider" className="w-full rounded-full pl-4">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="p-1">
                  <SelectItem value="MTN_MOMO">MTN Mobile Money</SelectItem>
                  <SelectItem value="AIRTEL_MONEY">Airtel Money</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="merchant-name">Merchant name</Label>
                <Input
                  id="merchant-name"
                  className="rounded-full"
                value={form.merchantName}
                onChange={(e) =>
                  setForm({ ...form, merchantName: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Business Name as registered with your provider. Optional but Recommended.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="merchant-code">Merchant code</Label>
              <Input
                id="merchant-code"
                className="rounded-full"
                required
                pattern="[A-Za-z0-9-]{3,120}"
                value={form.merchantCode}
                onChange={(e) =>
                  setForm({ ...form, merchantCode: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Your provider-issued code: 3–120 letters, numbers, or hyphens.
              </p>
            </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="merchant-phone">Merchant phone</Label>
              <Input
                id="merchant-phone"
                className="rounded-full"
                required
                inputMode="tel"
                placeholder="0771234567"
                value={form.merchantPhone}
                onChange={(e) =>
                  setForm({ ...form, merchantPhone: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Use a Ugandan Mobile Money number (07XXXXXXXX or +2567XXXXXXXX).
              </p>
            </div>
            <div className="flex justify-between gap-2">
                 <Button
                type="button"
                variant="outline"
                className="rounded-full px-4 h-10"
                disabled={saving}
                onClick={resetForm}>
                Cancel
              </Button>
              <Button className="rounded-full px-4 h-10 dark:text-white" disabled={saving} type="submit">
                {saving && <Loader2 className="animate-spin" />}
                {saving ? "Submitting…" : "Submit for verification"}
              </Button>
             
            </div>
          </form>
        )}
        {pendingAction && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-action-title"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-background p-6 shadow-lg">
              <h3 id="payment-action-title" className="text-lg font-semibold">
                Confirm action
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Are you sure you want to {actionText}?
                {pendingAction.action === "delete"
                  ? " This cannot be undone."
                  : ""}
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <Button
                  variant="outline"
                  disabled={saving}
                  onClick={() => setPendingAction(null)}>
                  Cancel
                </Button>
                <Button
                  variant={
                    pendingAction.action === "delete"
                      ? "destructive"
                      : "default"
                  }
                  disabled={saving}
                  onClick={() => void performAction()}>
                  {saving && <Loader2 className="animate-spin" />}Confirm
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
