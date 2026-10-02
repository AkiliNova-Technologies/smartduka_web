"use client";

import * as React from "react";
import { AlertCircle, ArrowUpRight, CheckCircle2, Clock3, Landmark, Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardMetricCard } from "@/components/dashboard-metric-card";
import { authHeaders, fetchApi } from "@/lib/providers/useProviderFetch";

type FinanceSummary = {
  currency: string;
  balances: { pending: string; available: string; reserved: string; paidOut: string };
  hasAvailableBalance: boolean;
  destinations: Array<{ id: "MOBILE_MONEY" | "BANK_ACCOUNT"; label: string; maskedDestination: string }>;
  disbursementsEnabled: boolean;
};

type Withdrawal = { id: string; amount: string | number; currency: string | null; status: string; maskedDestination: string | null; createdAt: string; updatedAt: string };

function formatUgx(value: string) {
  const [whole, fraction] = value.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `UGX ${grouped}${fraction && fraction !== "00" ? `.${fraction}` : ""}`;
}

function statusStyle(status: string) {
  if (status === "COMPLETED") return "border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400";
  if (["REQUESTED", "PENDING", "APPROVED", "READY_FOR_DISBURSEMENT"].includes(status)) return "border-amber-500/20 bg-amber-500/5 text-amber-700 dark:text-amber-400";
  if (status === "PROCESSING") return "border-blue-500/20 bg-blue-500/5 text-blue-700 dark:text-blue-400";
  if (["REJECTED", "FAILED"].includes(status)) return "border-rose-500/20 bg-rose-500/5 text-rose-700 dark:text-rose-400";
  return "border-border bg-muted text-muted-foreground";
}

function statusLabel(status: string) {
  if (status === "READY_FOR_DISBURSEMENT") return "Approved for processing";
  return status.replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-UG", { day: "numeric", month: "short", year: "numeric" });
}

export default function VendorFinancePage() {
  const [summary, setSummary] = React.useState<FinanceSummary | null>(null);
  const [withdrawals, setWithdrawals] = React.useState<Withdrawal[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const requestRef = React.useRef<Promise<void> | null>(null);

  const refresh = React.useCallback(async () => {
    if (requestRef.current) return requestRef.current;
    const request = (async () => { setLoading(true); setError(null); try { const [nextSummary, history] = await Promise.all([
        fetchApi<FinanceSummary>("/api/vendor/finance/summary", { headers: authHeaders() }),
        fetchApi<{ withdrawals: Withdrawal[] }>("/api/vendor/withdrawals", { headers: authHeaders() }),
      ]); setSummary(nextSummary); setWithdrawals(history.withdrawals); } catch { setError("We couldn’t load your finance information. Please try again."); } finally { setLoading(false); } })();
    requestRef.current = request;
    try { await request; } finally { requestRef.current = null; }
  }, []);

  React.useEffect(() => { queueMicrotask(() => { void refresh(); }); }, [refresh]);

  const canOpenWithdrawal = Boolean(summary?.hasAvailableBalance && summary.destinations.length > 0);

  return <div className="w-full space-y-8 animate-in fade-in duration-300">
    <header className="flex flex-col gap-4 border-b border-border/40 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div><h1 className="text-2xl font-semibold tracking-tight text-foreground">Earnings & withdrawals</h1><p className="mt-1 text-sm text-muted-foreground">View your available earnings and manage withdrawal requests.</p></div>
      <Button onClick={() => setSheetOpen(true)} disabled={!canOpenWithdrawal || loading} className="h-10 rounded-xl text-sm font-medium"><ArrowUpRight className="size-4" aria-hidden="true" />Request withdrawal</Button>
    </header>

    {error && <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-700 dark:text-rose-400"><span>{error}</span><Button variant="outline" size="sm" onClick={() => void refresh()}>Try again</Button></div>}

    <section aria-labelledby="balance-overview-heading" className="space-y-4"><div><h2 id="balance-overview-heading" className="text-lg font-semibold tracking-tight text-foreground">Balance overview</h2><p className="mt-1 text-sm text-muted-foreground">Balances are calculated using SmartDuka’s current payout rules.</p></div>{loading || !summary ? <BalanceSkeleton /> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <FinanceCard label="Available" value={formatUgx(summary.balances.available)} description="Eligible for a withdrawal request." icon={Wallet} primary />
      <FinanceCard label="Pending" value={formatUgx(summary.balances.pending)} description="Earnings not yet available for withdrawal." icon={Clock3} />
      <FinanceCard label="Reserved" value={formatUgx(summary.balances.reserved)} description="Held for active withdrawal requests." icon={Landmark} />
      <FinanceCard label="Paid out" value={formatUgx(summary.balances.paidOut)} description="Completed withdrawal amounts." icon={CheckCircle2} />
    </div>}</section>

    {summary && !summary.disbursementsEnabled && <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-800 dark:text-amber-300">Withdrawal requests are reviewed and processed according to the current payout workflow. They are not sent automatically.</p>}
    {summary && summary.destinations.length === 0 && <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">A payout destination is required before you can request a withdrawal. Add your payout details in Store settings when that setup is available.</p>}
    {summary && !summary.hasAvailableBalance && <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">You do not currently have earnings available to withdraw. Pending earnings will appear here when they become available.</p>}

    <section aria-labelledby="withdrawal-history-heading" className="space-y-4"><div><h2 id="withdrawal-history-heading" className="text-lg font-semibold tracking-tight text-foreground">Withdrawal requests</h2><p className="mt-1 text-sm text-muted-foreground">Your most recent requests, newest first.</p></div><div className="overflow-hidden rounded-xl border border-border bg-card">{loading ? <p className="p-5 text-sm text-muted-foreground">Loading withdrawal requests…</p> : withdrawals.length === 0 ? <p className="p-5 text-sm text-muted-foreground">You have not made a withdrawal request yet.</p> : <ul className="divide-y divide-border/60">{withdrawals.map((withdrawal) => <li key={withdrawal.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="text-sm font-semibold text-foreground">{formatUgx(String(withdrawal.amount))}</p><p className="truncate text-sm text-muted-foreground">{withdrawal.maskedDestination || "Destination unavailable"} · Requested {formatDate(withdrawal.createdAt)}</p></div><div className="flex items-center justify-between gap-3 sm:justify-end"><span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusStyle(withdrawal.status)}`}>{statusLabel(withdrawal.status)}</span><span className="text-xs text-muted-foreground">Updated {formatDate(withdrawal.updatedAt)}</span></div></li>)}</ul>}</div></section>

    <section aria-labelledby="balance-help-heading" className="rounded-xl border border-border bg-card p-5"><h2 id="balance-help-heading" className="text-base font-semibold text-foreground">Understanding your balances</h2><dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2"><div><dt className="font-medium text-foreground">Available</dt><dd className="mt-1 text-muted-foreground">Money currently eligible for a withdrawal request.</dd></div><div><dt className="font-medium text-foreground">Pending</dt><dd className="mt-1 text-muted-foreground">Earnings recorded but not yet released for withdrawal.</dd></div><div><dt className="font-medium text-foreground">Reserved</dt><dd className="mt-1 text-muted-foreground">Money held for active withdrawal requests.</dd></div><div><dt className="font-medium text-foreground">Paid out</dt><dd className="mt-1 text-muted-foreground">Amounts from completed withdrawals.</dd></div></dl></section>

    {summary && <WithdrawalSheet open={sheetOpen} onOpenChange={setSheetOpen} summary={summary} onRequested={refresh} />}
  </div>;
}

function FinanceCard({ label, value, description, icon: Icon, primary = false }: { label: string; value: string; description: string; icon: typeof Wallet; primary?: boolean }) { return <DashboardMetricCard label={label} value={value} description={description} icon={Icon} tone={primary ? "default" : "info"} />; }

function BalanceSkeleton() { return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-xl" />)}</div>; }

function WithdrawalSheet({ open, onOpenChange, summary, onRequested }: { open: boolean; onOpenChange: (open: boolean) => void; summary: FinanceSummary; onRequested: () => Promise<void> }) {
  const [amount, setAmount] = React.useState("");
  const [destinationId, setDestinationId] = React.useState<string>(summary.destinations[0]?.id || "");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const destination = summary.destinations.find((item) => item.id === destinationId);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) { setAmount(""); setError(null); }
    onOpenChange(nextOpen);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!destination) { setError("Choose an available payout destination."); return; }
    setSubmitting(true); setError(null);
    try {
      await fetchApi("/api/vendor/withdrawals", { method: "POST", headers: authHeaders(), body: JSON.stringify({ amount, currency: summary.currency, destinationId, withdrawalRequestId: crypto.randomUUID().replaceAll("-", "") }) });
      await onRequested();
      onOpenChange(false);
    } catch {
      setError("We couldn’t request this withdrawal. Check the amount and your payout details, then try again.");
    } finally { setSubmitting(false); }
  };

  return <Sheet open={open} onOpenChange={handleOpenChange}><SheetContent side="right" className="w-full overflow-y-auto p-6 sm:max-w-md"><SheetHeader className="p-0"><SheetTitle>Request withdrawal</SheetTitle><SheetDescription>Submit a request using your available balance. It will be reviewed through the current payout workflow.</SheetDescription></SheetHeader><form onSubmit={submit} className="mt-6 space-y-5"><div className="space-y-2"><Label htmlFor="withdrawal-amount">Amount (UGX)</Label><Input id="withdrawal-amount" inputMode="decimal" type="number" min="1" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0" required disabled={submitting} /><p className="text-xs text-muted-foreground">Available: {formatUgx(summary.balances.available)}</p></div><div className="space-y-2"><Label htmlFor="withdrawal-destination">Payout destination</Label><Select value={destinationId} onValueChange={setDestinationId} disabled={submitting}><SelectTrigger id="withdrawal-destination"><SelectValue placeholder="Choose a destination" /></SelectTrigger><SelectContent>{summary.destinations.map((item) => <SelectItem key={item.id} value={item.id}>{item.label} · {item.maskedDestination}</SelectItem>)}</SelectContent></Select>{destination && <p className="text-xs text-muted-foreground">{destination.maskedDestination}</p>}</div>{error && <p role="alert" className="flex items-start gap-2 rounded-lg border border-rose-500/20 bg-rose-500/5 p-3 text-sm text-rose-700 dark:text-rose-400"><AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{error}</p>}<SheetFooter className="p-0"><Button type="submit" disabled={submitting} className="h-10 w-full rounded-xl">{submitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}{submitting ? "Requesting withdrawal…" : "Request withdrawal"}</Button></SheetFooter></form></SheetContent></Sheet>;
}
