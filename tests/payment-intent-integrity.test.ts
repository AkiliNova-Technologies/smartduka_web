import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PaymentGateway, PaymentIntentStatus, PaymentProvider } from "@prisma/client";

type TestIntent = {
  id: string;
  orderId: string;
  subOrderId: string;
  vendorId: string;
  vendorPaymentAccountId: string;
  provider: PaymentProvider;
  amount: { toString(): string };
  currency: string;
  idempotencyKey: string;
  status: PaymentIntentStatus;
  providerReference: string;
};

const fake = vi.hoisted(() => ({
  intents: [] as TestIntent[],
  providerCalls: [] as unknown[],
  providerError: null as Error | null,
  sequence: Promise.resolve(),
  nextId: 1,
}));

const order: {
  id: string;
  customerId: string;
  currency: string;
  paymentGateway: PaymentGateway;
  paymentStatus: string;
  status: string;
  shippingPhone: string;
} = {
  id: "order-1",
  customerId: "customer-1",
  currency: "UGX",
  paymentGateway: PaymentGateway.MTN_MOMO,
  paymentStatus: "PENDING",
  status: "PENDING",
  shippingPhone: "256700000000",
};
const subOrder = {
  id: "sub-1",
  orderId: order.id,
  vendorId: "vendor-1",
  vendorTotal: { toString: () => "12500" },
  order,
};

function statusMatches(intent: TestIntent, status: unknown) {
  if (typeof status === "string") return intent.status === status;
  return Boolean(status && typeof status === "object" && "in" in status && (status as { in: string[] }).in.includes(intent.status));
}

const tx = vi.hoisted(() => ({
  $queryRaw: vi.fn(async () => [{ pg_advisory_xact_lock: null }]),
  subOrder: {
    findFirst: vi.fn(async ({ where }: { where: { id: string; orderId: string; order: { customerId: string } } }) =>
      where.id === subOrder.id && where.orderId === order.id && where.order.customerId === order.customerId ? subOrder : null),
  },
  vendorProfile: {
    findUnique: vi.fn(async () => ({
      status: "ACTIVE",
      deletedAt: null,
      paymentAccounts: [{ id: "account-1", provider: PaymentProvider.MTN_MOMO, status: "VERIFIED", suspendedAt: null }],
    })),
  },
  paymentIntent: {
    findUnique: vi.fn(async ({ where }: { where: { subOrderId_idempotencyKey: { subOrderId: string; idempotencyKey: string } } }) => {
      const key = where.subOrderId_idempotencyKey;
      return fake.intents.find((item) => item.subOrderId === key.subOrderId && item.idempotencyKey === key.idempotencyKey) ?? null;
    }),
    findFirst: vi.fn(async ({ where }: { where: { subOrderId: string; status: unknown } }) =>
      fake.intents.find((item) => item.subOrderId === where.subOrderId && statusMatches(item, where.status)) ?? null),
    create: vi.fn(async ({ data }: { data: Omit<TestIntent, "id" | "amount"> & { amount: { toString(): string } } }) => {
      const intent = { ...data, id: `intent-${fake.nextId++}` } as TestIntent;
      fake.intents.push(intent);
      return intent;
    }),
    update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<TestIntent> }) => {
      const intent = fake.intents.find((item) => item.id === where.id)!;
      Object.assign(intent, data);
      return intent;
    }),
  },
  auditLog: { create: vi.fn(async ({ data }: { data: unknown }) => data) },
}));

const prisma = vi.hoisted(() => ({
  ...tx,
  $transaction: vi.fn(async (callback: (database: typeof tx) => Promise<unknown>) => {
    const previous = fake.sequence;
    let release!: () => void;
    fake.sequence = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try { return await callback(tx); } finally { release(); }
  }),
}));

vi.mock("@/lib/prisma/client", () => ({ prisma }));
vi.mock("@/services/payment-reconciliation", () => ({
  PaymentReconciliationService: { markReconcileFailure: vi.fn(async () => undefined), applyProviderResult: vi.fn() },
}));
vi.mock("@/lib/payments/providers/mtn-momo-provider", () => {
  class MtnMomoProviderError extends Error {
    constructor(message: string, readonly code: string) { super(message); }
  }
  return {
    MtnMomoProviderError,
    MtnMomoProvider: class {
      async initiatePayment(input: unknown) {
        fake.providerCalls.push(input);
        if (fake.providerError) throw fake.providerError;
        return { status: "PENDING" };
      }
    },
    getMtnMomoConfig: () => ({ environment: "sandbox", sandboxTesting: false, directVendorRoutingVerified: true }),
  };
});

import { PaymentIntentError, PaymentIntentService } from "@/services/payment-intent";

const environment = { ...process.env };
const request = (idempotencyKey: string) => ({
  customerId: order.customerId,
  orderId: order.id,
  subOrderId: subOrder.id,
  provider: PaymentProvider.MTN_MOMO,
  idempotencyKey,
});

beforeEach(() => {
  fake.intents.length = 0;
  fake.providerCalls.length = 0;
  fake.providerError = null;
  fake.sequence = Promise.resolve();
  fake.nextId = 1;
  order.paymentGateway = PaymentGateway.MTN_MOMO;
  order.paymentStatus = "PENDING";
  process.env.PAYMENTS_MTN_ENABLED = "true";
  process.env.MTN_MOMO_BASE_URL = "https://sandbox.example.test";
  process.env.MTN_MOMO_COLLECTION_SUBSCRIPTION_KEY = "key";
  process.env.MTN_MOMO_API_USER = "user";
  process.env.MTN_MOMO_API_KEY = "secret";
  process.env.MTN_MOMO_ENVIRONMENT = "sandbox";
  process.env.MTN_SANDBOX_COLLECTION_TESTING_ENABLED = "true";
  process.env.MTN_MOMO_DIRECT_VENDOR_ROUTING_VERIFIED = "true";
  vi.clearAllMocks();
});
afterEach(() => { process.env = { ...environment }; });

describe("payment initiation integrity", () => {
  it("submits one provider request for simultaneous identical idempotency keys", async () => {
    const [first, second] = await Promise.all([
      PaymentIntentService.initiateForCustomer(request("same-key-01")),
      PaymentIntentService.initiateForCustomer(request("same-key-01")),
    ]);
    expect(first.id).toBe(second.id);
    expect(fake.intents).toHaveLength(1);
    expect(fake.providerCalls).toHaveLength(1);
  });

  it("rejects a concurrent different key while the first attempt is unresolved", async () => {
    const outcomes = await Promise.allSettled([
      PaymentIntentService.initiateForCustomer(request("first-key-01")),
      PaymentIntentService.initiateForCustomer(request("second-key-02")),
    ]);
    expect(outcomes.filter((item) => item.status === "fulfilled")).toHaveLength(1);
    expect(outcomes.find((item) => item.status === "rejected")).toMatchObject({ reason: { code: "PAYMENT_ALREADY_PENDING" } });
    expect(fake.providerCalls).toHaveLength(1);
  });

  it("keeps an unknown provider submission pending and blocks recollection", async () => {
    const { MtnMomoProviderError } = await import("@/lib/payments/providers/mtn-momo-provider");
    fake.providerError = new MtnMomoProviderError("timed out", "SUBMISSION_UNKNOWN");
    await expect(PaymentIntentService.initiateForCustomer(request("unknown-key-1"))).rejects.toMatchObject({ code: "PAYMENT_CONFIRMATION_PENDING" });
    fake.providerError = null;
    await expect(PaymentIntentService.initiateForCustomer(request("unknown-key-2"))).rejects.toMatchObject({ code: "PAYMENT_ALREADY_PENDING" });
    expect(fake.providerCalls).toHaveLength(1);
  });

  it("allows an authorized retry after a definitive failed attempt", async () => {
    fake.intents.push({
      id: "failed-1", orderId: order.id, subOrderId: subOrder.id, vendorId: subOrder.vendorId,
      vendorPaymentAccountId: "account-1", provider: PaymentProvider.MTN_MOMO,
      amount: subOrder.vendorTotal, currency: "UGX", idempotencyKey: "old-key-01",
      status: PaymentIntentStatus.FAILED, providerReference: "old-reference",
    });
    await expect(PaymentIntentService.initiateForCustomer(request("retry-key-01"))).resolves.toMatchObject({ status: PaymentIntentStatus.PENDING });
    expect(fake.providerCalls).toHaveLength(1);
  });

  it("rejects cross-customer access without revealing the suborder", async () => {
    await expect(PaymentIntentService.initiateForCustomer({ ...request("foreign-key1"), customerId: "other-customer" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(fake.providerCalls).toHaveLength(0);
  });

  it("rejects cross-vendor suborder substitution without creating an intent", async () => {
    await expect(PaymentIntentService.initiateForCustomer({ ...request("foreign-key2"), subOrderId: "another-vendor-suborder" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(fake.intents).toHaveLength(0);
    expect(fake.providerCalls).toHaveLength(0);
  });

  it("rejects Airtel initiation while its adapter is unavailable", async () => {
    process.env.PAYMENTS_AIRTEL_ENABLED = "true";
    process.env.AIRTEL_MONEY_DIRECT_VENDOR_ROUTING_VERIFIED = "true";
    await expect(PaymentIntentService.initiateForCustomer({ ...request("airtel-key01"), provider: PaymentProvider.AIRTEL_MONEY })).rejects.toMatchObject({ code: "PAYMENT_PROVIDER_UNAVAILABLE" });
    expect(fake.intents).toHaveLength(0);
  });

  it("rejects MTN production initiation even when flags and credentials are present", async () => {
    process.env.MTN_MOMO_ENVIRONMENT = "production";
    await expect(PaymentIntentService.initiateForCustomer(request("prod-key-001"))).rejects.toMatchObject({ code: "PAYMENT_PROVIDER_UNAVAILABLE" });
    expect(fake.intents).toHaveLength(0);
    expect(fake.providerCalls).toHaveLength(0);
  });

  it("rejects a provider that does not match the order payment method", async () => {
    order.paymentGateway = PaymentGateway.AIRTEL_MONEY;
    await expect(PaymentIntentService.initiateSandboxQualification(request("wrong-method"))).rejects.toBeInstanceOf(PaymentIntentError);
    expect(fake.providerCalls).toHaveLength(0);
  });
});
