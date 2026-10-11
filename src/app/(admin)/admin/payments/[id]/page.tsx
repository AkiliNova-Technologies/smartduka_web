import { Suspense } from "react";
import { notFound } from "next/navigation";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { StatusBadge } from "@/components/marketplace/status-badge";
import { AdminPaymentOperationsService } from "@/services/admin-payment-operations";
import { PaymentRecheckButton } from "./payment-recheck-button";

export default function AdminPaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={<PaymentDetailSkeleton />}><AdminPaymentDetailContent params={params} /></Suspense>;
}

async function AdminPaymentDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const payment = await AdminPaymentOperationsService.detail((await params).id);
  if (!payment) notFound();
  const recheckable = ["PENDING", "SUCCESSFUL"].includes(payment.status);

  return <div className="space-y-6">
    <DashboardPageHeader title="Payment Details" description={`${payment.vendor.storeName} · ${payment.order.orderNumber} · ${payment.subOrder.subOrderNumber}`} backHref="/admin/payments" trailing={<><span className="rounded-full border border-border/60 px-2.5 py-1 font-mono text-[10px] text-muted-foreground">{payment.id.slice(0, 8)}</span><StatusBadge status={payment.status} /></>} />
    <section className="grid gap-3 rounded-xl border p-5 sm:grid-cols-3">
      <div><p className="text-xs text-muted-foreground">Current status</p><p className="font-medium">{payment.status}</p></div>
      <div><p className="text-xs text-muted-foreground">Payment health</p><p className="font-medium">{payment.paymentHealth ?? "HEALTHY"}</p></div>
      <div><p className="text-xs text-muted-foreground">Provider</p><p className="font-medium">{payment.provider} · {payment.providerReference ?? "—"}</p></div>
      <div><p className="text-xs text-muted-foreground">Amount</p><p>{payment.amount} {payment.currency}</p></div>
      <div><p className="text-xs text-muted-foreground">Reconciliation</p><p>{payment.reconcileAttempts} attempts · last {payment.lastReconciledAt?.toLocaleString() ?? "never"}</p></div>
      <div><p className="text-xs text-muted-foreground">Next reconciliation</p><p>{payment.nextReconcileAt?.toLocaleString() ?? "Not scheduled"}</p></div>
    </section>
    {payment.operationalWarnings.length > 0 && <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">{payment.operationalWarnings.map((warning) => <p key={warning}>{warning}</p>)}</section>}
    <PaymentRecheckButton paymentIntentId={payment.id} enabled={recheckable && payment.provider === "MTN_MOMO"} />
    <section><h2 className="font-semibold">Provider-event timeline</h2><div className="mt-3 space-y-3 border-l pl-4">{payment.timeline.map((entry, index) => <div key={`${entry.timestamp.toISOString()}-${index}`} className="text-sm"><p className="font-medium">{entry.observedStatus ?? "Observation"} · {entry.transitionResult}</p><p className="text-xs text-muted-foreground">{entry.timestamp.toLocaleString()} · {entry.source} · {entry.provider} · {entry.providerReference} · {entry.amount ?? "—"}</p>{entry.safeErrorSummary && <p className="text-xs text-amber-700">{entry.safeErrorSummary}</p>}</div>)}</div></section>
    <section><h2 className="font-semibold">Audit trail</h2><div className="mt-3 space-y-2 border-l pl-4">{payment.auditTrail.map((entry, index) => <p key={`${entry.timestamp.toISOString()}-${index}`} className="text-sm">{entry.action.replaceAll("_", " ")}<span className="ml-2 text-xs text-muted-foreground">{entry.timestamp.toLocaleString()}</span></p>)}</div></section>
  </div>;
}

function PaymentDetailSkeleton() {
  return <div className="space-y-6" aria-busy="true"><div className="h-5 w-36 animate-pulse rounded bg-muted"/><div className="space-y-2"><div className="h-8 w-52 animate-pulse rounded bg-muted"/><div className="h-5 w-80 max-w-full animate-pulse rounded bg-muted"/></div><div className="h-44 animate-pulse rounded-xl border bg-card"/><div className="h-64 animate-pulse rounded-xl border bg-card"/></div>;
}
