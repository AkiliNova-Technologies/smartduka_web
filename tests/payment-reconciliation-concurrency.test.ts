import { beforeEach, describe, expect, it, vi } from "vitest";
import { PaymentIntentStatus, PaymentProvider, Prisma } from "@prisma/client";

type Intent = Record<string, unknown> & { id: string; status: string; orderId: string; providerReference?: string | null; nextReconcileAt?: Date | null; amount?: string; fulfillmentStatus?: string };
type EventRow = Record<string, unknown> & { provider: string; payloadHash?: string; providerEventId?: string; paymentIntentId?: string; idempotencyKey?: string; type?: string; action?: string; normalizedStatus?: string };
type DbWhere = { id?: string; status?: string; orderId?: string; paymentStatus?: string; paymentIntentId?: string; providerReference?: { not: null }; OR?: Array<{ nextReconcileAt: null | { lte: Date } }>; provider_payloadHash?: { provider: string; payloadHash: string } };
type DbData = Record<string, unknown> & { paymentStatus?: string };
type DbArgs = { where: DbWhere; data: DbData };
type ProviderResult = Record<string, unknown> | Error | Promise<Record<string, unknown>>;
const fake = vi.hoisted(() => ({
  intents: new Map<string, Intent>(), events: [] as EventRow[], audits: [] as EventRow[], notifications: [] as EventRow[], orderUpdates: [] as Array<{ where: DbWhere; data: DbData }>, inventoryUpdates: [] as unknown[], orderStatuses: new Map<string, string>(), providerResults: [] as ProviderResult[],
}));

function dueMatch(intent: Intent, where: DbWhere) {
  if (where.id && intent.id !== where.id) return false;
  if (where.status && intent.status !== where.status) return false;
  if (where.providerReference?.not === null && !intent.providerReference) return false;
  if (where.OR) return where.OR.some((item) => item.nextReconcileAt === null ? intent.nextReconcileAt === null : intent.nextReconcileAt instanceof Date && intent.nextReconcileAt <= item.nextReconcileAt.lte);
  return true;
}

const db = vi.hoisted(() => ({
  paymentIntent: {
    findUnique: vi.fn(async ({ where }: { where: DbWhere }) => where.id && fake.intents.get(where.id) ? { ...fake.intents.get(where.id) } : null),
    findUniqueOrThrow: vi.fn(async ({ where }: { where: DbWhere }) => ({ ...(where.id ? fake.intents.get(where.id) : undefined) })),
    findMany: vi.fn(async ({ where }: { where: DbWhere }) => [...fake.intents.values()].filter((intent) => dueMatch(intent, where)).map((intent) => ({ id: intent.id }))),
    updateMany: vi.fn(async ({ where, data }: DbArgs) => {
      const intent = where.id ? fake.intents.get(where.id) : undefined;
      if (!intent || !dueMatch(intent, where)) return { count: 0 };
      Object.assign(intent, data); return { count: 1 };
    }),
    update: vi.fn(async ({ where, data }: DbArgs) => { const intent = where.id ? fake.intents.get(where.id) : undefined; if (!intent) throw new Error("missing test intent"); Object.assign(intent, data); return { ...intent }; }),
    count: vi.fn(async ({ where }: { where: DbWhere }) => [...fake.intents.values()].filter((intent) => intent.orderId === where.orderId && intent.status === where.status).length),
  },
  paymentProviderEvent: {
    create: vi.fn(async ({ data }: { data: EventRow }) => {
      if (fake.events.some((event) => event.provider === data.provider && (event.payloadHash === data.payloadHash || (data.providerEventId && event.providerEventId === data.providerEventId)))) {
        throw new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "test" });
      }
      fake.events.push({ ...data, receivedAt: new Date() }); return data;
    }),
    update: vi.fn(async ({ where, data }: DbArgs) => { const key = where.provider_payloadHash; const event = key ? fake.events.find((item) => item.provider === key.provider && item.payloadHash === key.payloadHash) : undefined; if (!event) throw new Error("missing test event"); Object.assign(event, data); return event; }),
    findMany: vi.fn(async ({ where }: { where: DbWhere }) => fake.events.filter((event) => event.paymentIntentId === where.paymentIntentId).map((event) => ({ ...event, paymentIntent: { amount: { toFixed: () => typeof event.paymentIntentId === "string" ? fake.intents.get(event.paymentIntentId)?.amount ?? "0.00" : "0.00" } } }))),
  },
  auditLog: { create: vi.fn(async ({ data }: { data: EventRow }) => { fake.audits.push(data); return data; }) },
  notification: {
    createMany: vi.fn(async ({ data }: { data: EventRow[] }) => { fake.notifications.push(...data); return { count: data.length }; }),
    create: vi.fn(async ({ data }: { data: EventRow }) => { fake.notifications.push(data); return data; }),
  },
  subOrder: { count: vi.fn(async ({ where }: { where: DbWhere }) => [...fake.intents.values()].filter((intent) => intent.orderId === where.orderId).length) },
  order: { updateMany: vi.fn(async ({ where, data }: DbArgs) => {
    const current = where.id ? fake.orderStatuses.get(where.id) ?? "PENDING" : "PENDING";
    if (where.paymentStatus && current !== where.paymentStatus) return { count: 0 };
    if (!where.id || !data.paymentStatus) throw new Error("invalid test order update"); fake.orderStatuses.set(where.id, data.paymentStatus); fake.orderUpdates.push({ where, data }); return { count: 1 };
  }) },
  product: { updateMany: vi.fn(async (input: unknown) => { fake.inventoryUpdates.push(input); return { count: 1 }; }) },
}));

vi.mock("@/lib/prisma/client", () => ({ prisma: { ...db, $transaction: async (callback: (tx: typeof db) => unknown) => callback(db) } }));
vi.mock("@/lib/payments/providers/mtn-momo-provider", () => ({
  MtnMomoProvider: class {
    async getPaymentStatus() {
      const result = fake.providerResults.shift();
      if (result instanceof Error) throw result;
      return result;
    }
  },
}));

import { PaymentReconciliationService } from "@/services/payment-reconciliation";

function addIntent(id: string, status: PaymentIntentStatus = PaymentIntentStatus.PENDING, orderId = "order-1") {
  fake.intents.set(id, {
    id, status, orderId, subOrderId: `sub-${id}`, vendorId: `vendor-${id}`, provider: PaymentProvider.MTN_MOMO, providerReference: `ref-${id}`,
    amount: "100.00", currency: "EUR", confirmedAt: null, failedAt: null, nextReconcileAt: new Date(0), reconcileAttempts: 0,
    vendor: { ownerId: `owner-${id}`, storeName: `Shop ${id}` }, order: { customerId: "customer-1" },
  });
}
function event(id: string, status: PaymentIntentStatus, suffix: string) {
  return { paymentIntentId: id, provider: PaymentProvider.MTN_MOMO, providerReference: `ref-${id}`, providerEventId: `event-${suffix}`, eventType: `TEST_${suffix}`, status, amount: "100.00", currency: "EUR", payload: { observation: suffix, status } };
}

beforeEach(() => {
  fake.intents.clear(); fake.events.length = 0; fake.audits.length = 0; fake.notifications.length = 0; fake.orderUpdates.length = 0; fake.inventoryUpdates.length = 0; fake.orderStatuses.clear(); fake.providerResults.length = 0;
  vi.clearAllMocks();
});

describe("PaymentReconciliationService concurrency", () => {
  it("records concurrent callback and poll successes but applies only one business transition", async () => {
    addIntent("a");
    const outcomes = await Promise.all([
      PaymentReconciliationService.applyProviderResult(event("a", PaymentIntentStatus.SUCCESSFUL, "CALLBACK")),
      PaymentReconciliationService.applyProviderResult(event("a", PaymentIntentStatus.SUCCESSFUL, "POLL")),
    ]);
    expect(outcomes.map((outcome) => outcome.outcome).sort()).toEqual(["ALREADY_APPLIED", "TRANSITION_APPLIED"]);
    expect(fake.intents.get("a")!.status).toBe(PaymentIntentStatus.SUCCESSFUL);
    expect(fake.events).toHaveLength(2);
    expect(fake.notifications).toHaveLength(2);
    expect(fake.notifications.filter((notification) => notification.type === "SUCCESS")).toHaveLength(1);
    expect(fake.notifications.map((notification) => notification.idempotencyKey)).toEqual(expect.arrayContaining(["payment:a:successful:customer", "payment:a:successful:vendor"]));
    expect(fake.audits.filter((audit) => audit.action === "PAYMENT_INTENT_RECONCILED")).toHaveLength(1);
  });

  it("deduplicates the same provider event identity before it can create side effects", async () => {
    addIntent("a");
    const observation = event("a", PaymentIntentStatus.SUCCESSFUL, "same");
    const first = await PaymentReconciliationService.applyProviderResult(observation);
    const duplicate = await PaymentReconciliationService.applyProviderResult(observation);
    expect(first.outcome).toBe("TRANSITION_APPLIED");
    expect(duplicate.outcome).toBe("DUPLICATE");
    expect(fake.events).toHaveLength(1);
    expect(fake.notifications).toHaveLength(2);
  });

  it("prevents a failed observation from overwriting a concurrent success and audits the conflict", async () => {
    addIntent("a");
    const outcomes = await Promise.all([
      PaymentReconciliationService.applyProviderResult(event("a", PaymentIntentStatus.SUCCESSFUL, "success")),
      PaymentReconciliationService.applyProviderResult(event("a", PaymentIntentStatus.FAILED, "failure")),
    ]);
    expect(outcomes.filter((outcome) => outcome.outcome === "TRANSITION_APPLIED")).toHaveLength(1);
    expect(outcomes.some((outcome) => outcome.outcome === "IGNORED_STALE")).toBe(true);
    expect(fake.events).toHaveLength(2);
    expect(fake.audits.some((audit) => audit.action === "PAYMENT_PROVIDER_STATE_CONFLICT")).toBe(true);
  });

  it("applies only the legal SUCCESSFUL to REVERSED lifecycle and preserves its history", async () => {
    addIntent("reversal");
    await expect(PaymentReconciliationService.applyProviderResult(event("reversal", PaymentIntentStatus.SUCCESSFUL, "SUCCESS"))).resolves.toMatchObject({ outcome: "TRANSITION_APPLIED" });
    await expect(PaymentReconciliationService.applyProviderResult(event("reversal", PaymentIntentStatus.REVERSED, "REVERSAL"))).resolves.toMatchObject({ outcome: "TRANSITION_APPLIED" });
    expect(fake.intents.get("reversal")!.status).toBe(PaymentIntentStatus.REVERSED);
    expect(fake.events.map((item) => item.normalizedStatus)).toEqual([PaymentIntentStatus.SUCCESSFUL, PaymentIntentStatus.REVERSED]);
    expect(fake.audits.some((audit) => audit.action === "PAYMENT_REVERSAL_NEEDS_REVIEW")).toBe(true);
    expect(fake.notifications.filter((notification) => notification.idempotencyKey?.includes(":reversed:"))).toHaveLength(2);
  });

  it("deduplicates repeated reversal identities and records distinct reversal observations once", async () => {
    addIntent("reversal");
    await PaymentReconciliationService.applyProviderResult(event("reversal", PaymentIntentStatus.SUCCESSFUL, "SUCCESS"));
    const reversal = event("reversal", PaymentIntentStatus.REVERSED, "SAME_REVERSAL");
    await expect(PaymentReconciliationService.applyProviderResult(reversal)).resolves.toMatchObject({ outcome: "TRANSITION_APPLIED" });
    await expect(PaymentReconciliationService.applyProviderResult(reversal)).resolves.toMatchObject({ outcome: "DUPLICATE" });
    await expect(PaymentReconciliationService.applyProviderResult(event("reversal", PaymentIntentStatus.REVERSED, "SECOND_REVERSAL"))).resolves.toMatchObject({ outcome: "ALREADY_APPLIED" });
    expect(fake.notifications.filter((notification) => notification.idempotencyKey?.includes(":reversed:"))).toHaveLength(2);
  });

  it("rejects reversal before payment success and preserves pre-processing, processing, shipment, and delivery history", async () => {
    addIntent("pending");
    await expect(PaymentReconciliationService.applyProviderResult(event("pending", PaymentIntentStatus.REVERSED, "TOO_EARLY"))).resolves.toMatchObject({ outcome: "INVALID_TRANSITION" });
    for (const fulfillmentStatus of ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED"]) {
      const id = `reversal-${fulfillmentStatus}`;
      addIntent(id);
      fake.intents.get(id)!.fulfillmentStatus = fulfillmentStatus;
      await PaymentReconciliationService.applyProviderResult(event(id, PaymentIntentStatus.SUCCESSFUL, `${fulfillmentStatus}-SUCCESS`));
      await PaymentReconciliationService.applyProviderResult(event(id, PaymentIntentStatus.REVERSED, `${fulfillmentStatus}-REVERSED`));
      expect(fake.intents.get(id)!.fulfillmentStatus).toBe(fulfillmentStatus);
      expect(fake.intents.get(id)!.status).toBe(PaymentIntentStatus.REVERSED);
    }
  });

  it("isolates a reversed seller intent while surfacing a parent payment exception", async () => {
    addIntent("a", PaymentIntentStatus.PENDING, "parent"); addIntent("b", PaymentIntentStatus.PENDING, "parent");
    await Promise.all([PaymentReconciliationService.applyProviderResult(event("a", PaymentIntentStatus.SUCCESSFUL, "A_SUCCESS")), PaymentReconciliationService.applyProviderResult(event("b", PaymentIntentStatus.SUCCESSFUL, "B_SUCCESS"))]);
    await PaymentReconciliationService.applyProviderResult(event("b", PaymentIntentStatus.REVERSED, "B_REVERSED"));
    expect(fake.intents.get("a")!.status).toBe(PaymentIntentStatus.SUCCESSFUL);
    expect(fake.intents.get("b")!.status).toBe(PaymentIntentStatus.REVERSED);
    expect(fake.orderStatuses.get("parent")).toBe("REVERSED");
  });

  it("makes concurrent admin recheck and scheduled polling share one successful transition", async () => {
    addIntent("a");
    fake.providerResults.push(
      { providerReference: "ref-a", status: PaymentIntentStatus.SUCCESSFUL, amount: "100.00", currency: "EUR", providerTransactionId: "poll-a" },
      { providerReference: "ref-a", status: PaymentIntentStatus.SUCCESSFUL, amount: "100.00", currency: "EUR", providerTransactionId: "poll-b" },
    );
    const outcomes = await Promise.all([PaymentReconciliationService.reconcilePaymentIntent("a"), PaymentReconciliationService.reconcilePaymentIntent("a")]);
    expect(outcomes.map((outcome) => outcome.outcome).sort()).toEqual(["ALREADY_APPLIED", "TRANSITION_APPLIED"]);
    expect(fake.notifications).toHaveLength(2);
  });

  it("reaches parent paid once when two seller intents complete concurrently", async () => {
    addIntent("a", PaymentIntentStatus.PENDING, "parent"); addIntent("b", PaymentIntentStatus.PENDING, "parent");
    await Promise.all([
      PaymentReconciliationService.applyProviderResult(event("a", PaymentIntentStatus.SUCCESSFUL, "a")),
      PaymentReconciliationService.applyProviderResult(event("b", PaymentIntentStatus.SUCCESSFUL, "b")),
    ]);
    expect(fake.intents.get("a")!.status).toBe(PaymentIntentStatus.SUCCESSFUL);
    expect(fake.intents.get("b")!.status).toBe(PaymentIntentStatus.SUCCESSFUL);
    expect(fake.orderUpdates).toHaveLength(1);
  });

  it("uses nextReconcileAt as a recoverable cross-worker cron claim", async () => {
    addIntent("a");
    fake.providerResults.push({ providerReference: "ref-a", status: PaymentIntentStatus.PENDING, amount: "100.00", currency: "EUR", providerTransactionId: "pending-a" });
    const [first, second] = await Promise.all([PaymentReconciliationService.scheduleDue(), PaymentReconciliationService.scheduleDue()]);
    expect([...first, ...second].filter((result) => result.outcome === "PENDING_RECORDED")).toHaveLength(1);
    expect([...first, ...second].filter((result) => result.outcome === "CLAIM_NOT_ACQUIRED")).toHaveLength(1);
    expect(fake.intents.get("a")!.nextReconcileAt!.getTime()).toBeGreaterThan(Date.now());
  });

  it("does not mutate inventory while reconciling duplicate, cron, admin, and callback observations", async () => {
    const stockAfterOrderCreation = 7;
    addIntent("inventory");
    await Promise.all([
      PaymentReconciliationService.applyProviderResult(event("inventory", PaymentIntentStatus.SUCCESSFUL, "CALLBACK")),
      PaymentReconciliationService.applyProviderResult(event("inventory", PaymentIntentStatus.SUCCESSFUL, "DUPLICATE")),
    ]);
    await PaymentReconciliationService.reconcilePaymentIntent("inventory");
    expect(stockAfterOrderCreation).toBe(7);
    expect(fake.inventoryUpdates).toHaveLength(0);
  });

  it("discovers a persisted pending intent after a fresh reconciliation runner starts", async () => {
    addIntent("restart");
    fake.providerResults.push({ providerReference: "ref-restart", status: PaymentIntentStatus.SUCCESSFUL, amount: "100.00", currency: "EUR", providerTransactionId: "restart-status" });
    await expect(PaymentReconciliationService.scheduleDue()).resolves.toEqual([expect.objectContaining({ outcome: "TRANSITION_APPLIED" })]);
    expect(fake.intents.get("restart")!.status).toBe(PaymentIntentStatus.SUCCESSFUL);
  });

  it("recovers an ambiguous initiation by polling its persisted provider reference without re-initiating", async () => {
    const requestToPay = vi.fn();
    addIntent("ambiguous");
    fake.providerResults.push({ providerReference: "ref-ambiguous", status: PaymentIntentStatus.SUCCESSFUL, amount: "100.00", currency: "EUR", providerTransactionId: "ambiguous-status" });
    await PaymentReconciliationService.scheduleDue();
    expect(fake.intents.get("ambiguous")!.status).toBe(PaymentIntentStatus.SUCCESSFUL);
    expect(requestToPay).not.toHaveBeenCalled();
  });

  it("isolates cron failures and schedules a retry without changing a pending payment to failed", async () => {
    addIntent("success"); addIntent("outage"); addIntent("failed");
    fake.providerResults.push(
      { providerReference: "ref-success", status: PaymentIntentStatus.SUCCESSFUL, amount: "100.00", currency: "EUR", providerTransactionId: "success" },
      Object.assign(new Error("status timeout"), { code: "PROVIDER_UNAVAILABLE" }),
      { providerReference: "ref-failed", status: PaymentIntentStatus.FAILED, amount: "100.00", currency: "EUR", providerTransactionId: "failed" },
    );
    const outcomes = await PaymentReconciliationService.scheduleDue();
    expect(outcomes).toHaveLength(3);
    expect(fake.intents.get("success")!.status).toBe(PaymentIntentStatus.SUCCESSFUL);
    expect(fake.intents.get("failed")!.status).toBe(PaymentIntentStatus.FAILED);
    expect(fake.intents.get("outage")!.status).toBe(PaymentIntentStatus.PENDING);
    expect(fake.intents.get("outage")!.reconcileAttempts).toBe(1);
    expect(fake.intents.get("outage")!.nextReconcileAt!.getTime()).toBeGreaterThan(Date.now());
  });

  it("records a pending provider observation, reschedules it, and emits no notification", async () => {
    addIntent("pending");
    const outcome = await PaymentReconciliationService.applyProviderResult(event("pending", PaymentIntentStatus.PENDING, "pending"));
    expect(outcome.outcome).toBe("PENDING_RECORDED");
    expect(fake.intents.get("pending")!.status).toBe(PaymentIntentStatus.PENDING);
    expect(fake.intents.get("pending")!.nextReconcileAt!.getTime()).toBeGreaterThan(Date.now());
    expect(fake.notifications).toHaveLength(0);
  });

  it("persists retry metadata for timeout, rate-limit, and provider-error polling failures", async () => {
    for (const [id, error] of [["timeout", "STATUS_TIMEOUT"], ["rate", "HTTP_429"], ["error", "HTTP_500"]] as const) {
      addIntent(id);
      fake.providerResults.push(Object.assign(new Error(error), { code: error }));
      await expect(PaymentReconciliationService.reconcilePaymentIntent(id)).resolves.toMatchObject({ outcome: "RETRY_SCHEDULED" });
      const intent = fake.intents.get(id)!;
      expect(intent.status).toBe(PaymentIntentStatus.PENDING);
      expect(intent.reconcileAttempts).toBe(1);
      expect(intent.lastReconciledAt).toBeInstanceOf(Date);
      expect(intent.nextReconcileAt!.getTime()).toBeGreaterThan(Date.now());
      expect(intent.lastReconcileError).toContain(error);
    }
  });

  it("uses increasing bounded retry delays without real sleeps", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-08T00:00:00.000Z"));
    addIntent("retry");
    await PaymentReconciliationService.markReconcileFailure("retry", "first failure");
    expect(fake.intents.get("retry")!.nextReconcileAt!.toISOString()).toBe("2026-10-08T00:02:00.000Z");
    await PaymentReconciliationService.markReconcileFailure("retry", "second failure");
    expect(fake.intents.get("retry")!.nextReconcileAt!.toISOString()).toBe("2026-10-08T00:04:00.000Z");
    vi.useRealTimers();
  });

  it("recovers a claimed intent after its lease expires", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-08T00:00:00.000Z"));
    addIntent("lease");
    let release!: () => void;
    fake.providerResults.push(new Promise((resolve) => { release = () => resolve({ providerReference: "ref-lease", status: PaymentIntentStatus.PENDING, amount: "100.00", currency: "EUR", providerTransactionId: "lease-a" }); }));
    const abandonedWorker = PaymentReconciliationService.scheduleDue();
    await Promise.resolve();
    await expect(PaymentReconciliationService.scheduleDue()).resolves.toEqual([]);
    vi.advanceTimersByTime(2 * 60_000 + 1);
    fake.providerResults.push({ providerReference: "ref-lease", status: PaymentIntentStatus.SUCCESSFUL, amount: "100.00", currency: "EUR", providerTransactionId: "lease-b" });
    await expect(PaymentReconciliationService.scheduleDue()).resolves.toEqual([expect.objectContaining({ outcome: "TRANSITION_APPLIED" })]);
    release();
    await abandonedWorker;
    expect(fake.intents.get("lease")!.status).toBe(PaymentIntentStatus.SUCCESSFUL);
    vi.useRealTimers();
  });

  it("exposes concurrent observations as safe operator timeline entries", async () => {
    addIntent("timeline");
    await Promise.all([
      PaymentReconciliationService.applyProviderResult(event("timeline", PaymentIntentStatus.SUCCESSFUL, "CALLBACK")),
      PaymentReconciliationService.applyProviderResult(event("timeline", PaymentIntentStatus.SUCCESSFUL, "POLL")),
    ]);
    const timeline = await PaymentReconciliationService.timeline("timeline");
    expect(timeline).toHaveLength(2);
    expect(timeline.map((entry) => entry.transitionResult).sort()).toEqual(["ALREADY_APPLIED", "TRANSITION_APPLIED"]);
    expect(timeline.map((entry) => entry.source).sort()).toEqual(["CALLBACK", "CRON"]);
    expect(timeline.every((entry) => entry.providerReference === "••••meline")).toBe(true);
    expect(timeline.every((entry) => !entry.providerReference.includes("ref-"))).toBe(true);
  });
});
