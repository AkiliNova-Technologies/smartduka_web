"use client";

import * as React from "react";
import { AlertTriangle, DatabaseZap, FileX2, Loader2, ShieldCheck } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useTestDataCleanup } from "@/hooks/use-test-data-cleanup";

const CONFIRMATION = "DELETE TEST DATA";
type Scope = "ACCOUNT" | "SHOP" | "BATCH" | "ALL";

function sum(plan: Record<string, number>, names: string[]) { return names.reduce((total, name) => total + (plan[name] ?? 0), 0); }

export function TestDataCleanupPage() {
  const cleanup = useTestDataCleanup();
  const [scope, setScope] = React.useState<Scope>("BATCH");
  const [scopeId, setScopeId] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [confirmation, setConfirmation] = React.useState("");
  const plan = cleanup.preview?.plan;
  const choices = scope === "ACCOUNT" ? cleanup.overview?.accounts ?? [] : scope === "SHOP" ? cleanup.overview?.shops ?? [] : scope === "BATCH" ? (cleanup.overview?.batches ?? []).filter((batch) => batch.status === "VERIFIED") : [];

  if (cleanup.loading) return <div className="space-y-4"><Skeleton className="h-10 w-72"/><Skeleton className="h-48 w-full"/><Skeleton className="h-72 w-full"/></div>;

  const metrics = plan ? [
    ["Test users", sum(plan.counts, ["User"])], ["Test shops", sum(plan.counts, ["VendorProfile"])],
    ["Products", sum(plan.counts, ["Product"])], ["Orders", sum(plan.counts, ["Order", "SubOrder", "OrderItem"])],
    ["Transactions", sum(plan.counts, ["FinancialLedger"])], ["Payments", sum(plan.counts, ["PaymentIntent", "PaymentAttempt", "PlatformPaymentIntent"])],
    ["Campaigns", sum(plan.counts, ["Promotion", "PromotionCampaign"])], ["Uploaded files", plan.storage.length],
    ["All dependent records", plan.totalDependentRecords], ["Protected records", plan.protectedRecords],
  ] as const : [];

  async function previewCleanup() {
    await cleanup.createPreview({ scope, scopeId: scope === "ALL" ? null : scopeId });
  }

  async function executeCleanup(event: React.MouseEvent) {
    event.preventDefault();
    try { await cleanup.execute(confirmation); setDialogOpen(false); setConfirmation(""); }
    catch { /* Hook exposes the server-safe error. */ }
  }

  return <div className="space-y-6">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div><h1 className="text-2xl font-semibold tracking-tight">Test data cleanup</h1><p className="mt-1 max-w-3xl text-sm text-muted-foreground">Preview and remove only records whose ownership is proven by a verified test-data batch. Financial and shared production records remain protected.</p></div>
      <Badge variant={cleanup.overview?.environment === "PRODUCTION" ? "destructive" : "outline"}>{cleanup.overview?.environment}</Badge>
    </header>

    {cleanup.error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{cleanup.error}</div>}
    {cleanup.result && <div role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-700 dark:text-emerald-300">Cleanup completed: {cleanup.result.deletedTotal} rows removed, {cleanup.result.storageQueued} file deletions queued, and {cleanup.result.identityDeletionsQueued} authentication identities queued.</div>}

    <Card>
      <CardHeader><CardTitle>Cleanup scope</CardTitle><CardDescription>Arbitrary record deletion is not available. Choose a verified account, shop, batch, or all eligible registry records.</CardDescription></CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-[220px_1fr_auto] md:items-end">
        <div className="space-y-2"><Label>Mode</Label><Select value={scope} onValueChange={(value) => { setScope(value as Scope); setScopeId(""); cleanup.clearPreview(); }}><SelectTrigger className="w-full"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="ACCOUNT">Selected test account</SelectItem><SelectItem value="SHOP">Selected test shop</SelectItem><SelectItem value="BATCH">Selected test batch</SelectItem><SelectItem value="ALL">All eligible test data</SelectItem></SelectContent></Select></div>
        {scope !== "ALL" ? <div className="space-y-2"><Label>Verified target</Label><Select value={scopeId} onValueChange={(value) => { setScopeId(value); cleanup.clearPreview(); }}><SelectTrigger className="w-full"><SelectValue placeholder="Choose a verified target"/></SelectTrigger><SelectContent>{choices.map((choice) => { const id = "entityId" in choice ? choice.entityId : choice.id; const label = "email" in choice ? `${choice.name} · ${choice.email}` : "slug" in choice ? `${choice.name} · ${choice.slug}` : `${choice.name} · ${choice._count.records} records`; return <SelectItem value={id} key={id}>{label}</SelectItem>; })}</SelectContent></Select></div> : <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-300">All verified records in this environment will be considered.</div>}
        <Button onClick={() => void previewCleanup()} disabled={cleanup.planning || (scope !== "ALL" && !scopeId)}>{cleanup.planning ? <Loader2 className="animate-spin"/> : <DatabaseZap/>}Generate dry run</Button>
      </CardContent>
    </Card>

    {plan && <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{metrics.map(([label, value]) => <Card size="sm" key={label}><CardHeader><CardDescription>{label}</CardDescription><CardTitle className="text-2xl">{value}</CardTitle></CardHeader></Card>)}</div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>Dependency-aware deletion plan</CardTitle><CardDescription>Children are deleted before their referenced parents in one serializable transaction.</CardDescription></CardHeader><CardContent className="space-y-3"><div className="flex flex-wrap gap-2">{plan.deletionOrder.map((type, index) => <Badge variant="outline" key={type}>{index + 1}. {type} ({plan.counts[type] ?? 0})</Badge>)}</div><p className="text-xs text-muted-foreground">Plan expires {new Date(cleanup.preview!.expiresAt).toLocaleString()}. Any relevant change makes it stale.</p></CardContent></Card>
        <Card><CardHeader><CardTitle>External storage</CardTitle><CardDescription>Exclusive files are queued after commit; shared files are never deleted.</CardDescription></CardHeader><CardContent className="space-y-2">{plan.storage.length ? plan.storage.map((item) => <div className="flex items-center justify-between gap-3 rounded-md border p-2 text-xs" key={`${item.bucket}/${item.objectPath}`}><span className="truncate"><FileX2 className="mr-2 inline size-3"/>{item.bucket}/{item.objectPath}</span><Badge variant={item.shared ? "destructive" : "secondary"}>{item.shared ? "Protected" : "Queued"}</Badge></div>) : <p className="text-sm text-muted-foreground">No approved storage objects were found.</p>}</CardContent></Card>
      </div>
      {plan.blockers.length ? <Card className="border-destructive/30"><CardHeader><CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle/>Cleanup blocked</CardTitle><CardDescription>Resolve or safely archive these records and generate a fresh plan. UI confirmation cannot override these protections.</CardDescription></CardHeader><CardContent className="space-y-2">{plan.blockers.map((blocker) => <div className="rounded-md bg-destructive/5 p-3 text-sm" key={`${blocker.entityType}:${blocker.entityId}:${blocker.reason}`}><span className="font-medium">{blocker.entityType}</span> · {blocker.entityId}<p className="text-muted-foreground">{blocker.reason}</p></div>)}</CardContent></Card> : <Card className="border-emerald-500/30"><CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="text-emerald-600"/>Ready for explicit confirmation</CardTitle><CardDescription>The server will revalidate authorization, ownership, dependencies, financial classification, and the plan hash immediately before deletion.</CardDescription></CardHeader><CardContent className="flex justify-end"><Button variant="destructive" onClick={() => setDialogOpen(true)}>Review irreversible cleanup</Button></CardContent></Card>}
    </>}

    <AlertDialog open={dialogOpen} onOpenChange={(open) => { if (!cleanup.executing) setDialogOpen(open); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete verified test data?</AlertDialogTitle><AlertDialogDescription>This permanently removes the eligible database graph. It does not refund, reverse, or contact payment providers. Storage deletion runs separately after commit.</AlertDialogDescription></AlertDialogHeader><div className="space-y-2"><Label htmlFor="cleanup-confirmation">Type <span className="font-mono font-semibold">{CONFIRMATION}</span> exactly</Label><Input id="cleanup-confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off"/></div><AlertDialogFooter><AlertDialogCancel disabled={cleanup.executing}>Cancel</AlertDialogCancel><AlertDialogAction disabled={confirmation !== CONFIRMATION || cleanup.executing} onClick={(event) => void executeCleanup(event)}>{cleanup.executing ? <><Loader2 className="animate-spin"/>Cleaning…</> : "Permanently clean test data"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}
