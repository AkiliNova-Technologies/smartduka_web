import { timingSafeEqual } from "node:crypto";
import { PaymentReconciliationService } from "@/services/payment-reconciliation";

function integerSetting(name: string, fallback: number, maximum: number) {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(value) ? Math.min(Math.max(value, 1), maximum) : fallback;
}

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const actual = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  return actual.length === expected.length &&
    timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

export async function GET(request: Request) {
  if (!isAuthorized(request))
    return Response.json(
      { error: { code: "UNAUTHORIZED", message: "Unauthorized." } },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  if (process.env.SCHEDULED_PAYMENT_RECONCILIATION_ENABLED !== "true")
    return Response.json(
      { data: { disabled: true } },
      { headers: { "Cache-Control": "no-store" } },
    );
  try {
    const outcomes = await PaymentReconciliationService.scheduleDue(
      integerSetting("PAYMENT_RECONCILIATION_BATCH_SIZE", 50, 100),
      {
        concurrency: integerSetting("PAYMENT_RECONCILIATION_CONCURRENCY", 5, 10),
        maxRuntimeMs: integerSetting("PAYMENT_RECONCILIATION_MAX_RUNTIME_MS", 20_000, 55_000),
      },
    );
    const summary = outcomes.reduce<Record<string, number>>((value, result) => {
      const outcome = String(result.outcome);
      value[outcome] = (value[outcome] ?? 0) + 1;
      return value;
    }, {});
    return Response.json(
      { data: { processed: outcomes.length, outcomes: summary } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("payment_reconciliation_worker_failed", {
      errorType: error instanceof Error ? error.constructor.name : "UnknownError",
    });
    return Response.json(
      { error: { code: "WORKER_FAILED", message: "Payment reconciliation worker failed." } },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
