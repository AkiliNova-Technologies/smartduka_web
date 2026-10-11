import { PaymentProvider } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { PaymentProviderRegistry } from "@/lib/payments/payment-provider";
import { MtnMomoProvider, getMtnMomoConfig } from "@/lib/payments/providers/mtn-momo-provider";
import { PaymentReconciliationService } from "@/services/payment-reconciliation";

const maskReference = (reference: string) => `••••${reference.slice(-6)}`;

/** Sandbox callbacks are untrusted change notices; MTN status is authoritative. */
async function receive(request: Request) {
  let config; try { config = getMtnMomoConfig(); } catch { return Response.json({ error: "Provider callback is not configured." }, { status: 501 }); }
  if (config.environment !== "sandbox" || !config.sandboxTesting) return Response.json({ error: "MTN callback authentication is not configured." }, { status: 501 });
  if (!PaymentProviderRegistry.isEnabled(PaymentProvider.MTN_MOMO) && !PaymentProviderRegistry.isSandboxQualificationReady(PaymentProvider.MTN_MOMO)) return Response.json({ error: "Provider disabled." }, { status: 404 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || Array.isArray(body)) return Response.json({ error: "Malformed callback payload." }, { status: 400 });
  const reference = typeof body.referenceId === "string" ? body.referenceId : typeof body.externalId === "string" ? body.externalId : request.headers.get("x-reference-id");
  if (!reference || reference.length > 191) return Response.json({ error: "Missing provider reference." }, { status: 400 });
  const intent = await prisma.paymentIntent.findFirst({ where: { provider: PaymentProvider.MTN_MOMO, providerReference: reference }, select: { id: true, vendorId: true } });
  if (!intent) { console.info("MTN callback ignored for unknown reference", { provider: "MTN_MOMO", reference: maskReference(reference), method: request.method }); return Response.json({ ok: true }, { status: 202 }); }
  await prisma.auditLog.create({ data: { vendorId: intent.vendorId, action: "MTN_CALLBACK_RECEIVED", entity: "PaymentIntent", entityId: intent.id, newValues: { provider: "MTN_MOMO", method: request.method, referenceSuffix: reference.slice(-6), statusRequeryAttempted: true } } });
  console.info("MTN callback status re-query", { provider: "MTN_MOMO", reference: maskReference(reference), method: request.method });
  try {
    const status = await new MtnMomoProvider().getPaymentStatus(reference);
    const outcome = await PaymentReconciliationService.applyProviderResult({ paymentIntentId: intent.id, provider: PaymentProvider.MTN_MOMO, providerReference: reference, providerEventId: status.providerTransactionId, eventType: "MTN_CALLBACK_STATUS_REQUERY", status: status.status, amount: status.amount, currency: status.currency, payload: { providerReference: status.providerReference, status: status.status, amount: status.amount, currency: status.currency, providerTransactionId: status.providerTransactionId ?? null, callback: true } });
    console.info("MTN callback reconciliation outcome", { provider: "MTN_MOMO", reference: maskReference(reference), outcome: outcome.outcome, duplicate: outcome.outcome === "DUPLICATE" });
    return Response.json({ ok: true }, { status: status.status === "PENDING" ? 202 : 200 });
  } catch { return Response.json({ error: "Status verification unavailable." }, { status: 503 }); }
}
export const POST = receive;
export const PUT = receive;
