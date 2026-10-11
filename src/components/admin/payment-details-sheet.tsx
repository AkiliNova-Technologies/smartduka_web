"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { AdminPaymentRow } from "@/components/admin/payment-table";
import { StatusBadge } from "@/components/marketplace/status-badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const label = (value: string) =>
  value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^./, (letter) => letter.toUpperCase());
const date = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-UG", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";
const statusTone = (status: string) =>
  status === "SUCCESSFUL"
    ? "success"
    : ["FAILED", "REVERSED"].includes(status)
      ? "danger"
      : "warning";
const healthTone = (health: string) =>
  health === "HEALTHY"
    ? "success"
    : ["STUCK", "NEEDS_REVIEW"].includes(health)
      ? "danger"
      : "warning";

function warning(payment: AdminPaymentRow) {
  if (payment.status === "REVERSED")
    return `Payment was reversed and requires review. Seller fulfillment is ${label(payment.subOrder.status)}.`;
  if (payment.paymentHealth === "STUCK")
    return "Payment confirmation is stuck and may require investigation.";
  if (payment.paymentHealth === "CONFIRMATION_DELAYED")
    return "Payment confirmation is delayed. The provider has not confirmed a terminal result.";
  if (payment.safeErrorSummary)
    return "The latest provider reconciliation needs review. Open the full workspace for the safe diagnostic history.";
  return null;
}

export function PaymentDetailsSheet({
  payment,
  open,
  onOpenChange,
}: {
  payment: AdminPaymentRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!payment) return null;
  const operationalWarning = warning(payment);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="min-w-lg w-full overflow-y-auto sm:max-w-lg md:max-w-xl lg:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Payment details</SheetTitle>
          <SheetDescription className="font-mono">
            {payment.id.slice(0, 8)}
          </SheetDescription>
          <div className="flex flex-wrap gap-2 pt-2">
            <StatusBadge tone={statusTone(payment.status)}>
              {label(payment.status)}
            </StatusBadge>
            {payment.paymentHealth && (
              <StatusBadge tone={healthTone(payment.paymentHealth)}>
                {label(payment.paymentHealth)}
              </StatusBadge>
            )}
          </div>
        </SheetHeader>
        <div className="space-y-5 px-4 pb-6 text-sm">
          {operationalWarning && (
            <div className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-amber-900 dark:text-amber-100">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <p>{operationalWarning}</p>
            </div>
          )}
          <section className="grid grid-cols-2 gap-4 rounded-xl border p-4">
            <Detail
              label="Amount"
              value={`${payment.currency} ${Number(payment.amount).toLocaleString("en-UG")}`}
            />
            <Detail label="Provider" value={label(payment.provider)} />
            <Detail label="Order" value={payment.order.orderNumber} />
            <Detail
              label="Seller suborder"
              value={payment.subOrder.subOrderNumber}
            />
            <Detail label="Vendor" value={payment.vendor.storeName} />
            <Detail
              label="Fulfillment"
              value={label(payment.subOrder.status)}
            />
          </section>
          <section className="grid grid-cols-2 gap-4 rounded-xl border p-4">
            <Detail label="Payment status" value={label(payment.status)} />
            <Detail
              label="Payment health"
              value={
                payment.paymentHealth ? label(payment.paymentHealth) : "Healthy"
              }
            />
            <Detail label="Created" value={date(payment.createdAt)} />
            <Detail label="Updated" value={date(payment.updatedAt)} />
          </section>
          <section className="rounded-xl border p-4">
            <h2 className="font-medium">Provider</h2>
            <Detail
              label="Masked reference"
              value={payment.providerReference ?? "—"}
            />
          </section>
          <section className="rounded-xl border p-4">
            <h2 className="font-medium">Reconciliation</h2>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <Detail
                label="Attempts"
                value={String(payment.reconcileAttempts)}
              />
              <Detail
                label="Last checked"
                value={date(payment.lastReconciledAt)}
              />
              <Detail
                label="Next check"
                value={date(payment.nextReconcileAt)}
              />
              <Detail
                label="Latest safe result"
                value={payment.safeErrorSummary ?? "No provider error recorded"}
              />
            </div>
          </section>
          <Link
            href={`/admin/payments/${payment.id}`}
            className="inline-flex h-10 w-full items-center justify-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground dark:text-white">
            Open full payment details
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-words font-medium line-clamp-1">{value}</p>
    </div>
  );
}
