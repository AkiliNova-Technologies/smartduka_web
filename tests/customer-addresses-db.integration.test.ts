import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma/client";
import { CustomerAddressService, type CustomerAddressInput } from "@/services/customer-addresses";

const enabled = process.env.RUN_CUSTOMER_ADDRESSES_DB_TESTS === "1";
const databaseName = "mwezora_customer_addresses_tests";

async function reset() {
  const configuredUrl = process.env.DATABASE_URL;
  if (process.env.CUSTOMER_ADDRESSES_TEST_DATABASE !== "isolated-local" || !configuredUrl) {
    throw new Error("Refusing destructive setup without the isolated customer-address test marker.");
  }
  const url = new URL(configuredUrl);
  if (url.hostname !== "127.0.0.1" || url.pathname !== `/${databaseName}`) {
    throw new Error("Refusing destructive setup outside the local customer-address test database.");
  }
  await prisma.customerAddress.deleteMany();
  await prisma.user.deleteMany();
}

async function customer(label: string) {
  return prisma.user.create({
    data: { name: label, email: `${label.toLowerCase()}-${randomUUID()}@customer.test`, status: "ACTIVE" },
    select: { id: true },
  });
}

function address(label: string, overrides: CustomerAddressInput = {}) {
  return {
    label,
    recipientName: `${label} Customer`,
    recipientPhone: "+256 772 123456",
    country: "Uganda" as const,
    district: "Kampala",
    city: "Kampala",
    area: "Ntinda",
    street: "Semawata Road",
    building: null,
    landmark: `${label} landmark`,
    deliveryInstructions: null,
    ...overrides,
  };
}

describe.runIf(enabled).sequential("customer addresses against isolated PostgreSQL", () => {
  beforeEach(reset);
  afterAll(async () => { await prisma.$disconnect(); });

  it("serializes concurrent first-address creation and permits independent customer defaults", async () => {
    const firstCustomer = await customer("First");
    const results = await Promise.all([
      CustomerAddressService.create(firstCustomer.id, address("Home")),
      CustomerAddressService.create(firstCustomer.id, address("Work")),
    ]);

    expect(results).toHaveLength(2);
    expect(await prisma.customerAddress.count({ where: { customerId: firstCustomer.id } })).toBe(2);
    expect(await prisma.customerAddress.count({ where: { customerId: firstCustomer.id, isDefault: true } })).toBe(1);
    expect(await prisma.customerAddress.count({ where: { customerId: firstCustomer.id, isDefault: false } })).toBe(1);

    const secondCustomer = await customer("Second");
    await CustomerAddressService.create(secondCustomer.id, address("Home"));
    expect(await prisma.customerAddress.count({ where: { isDefault: true } })).toBe(2);
  });

  it("serializes concurrent default changes and retains exactly one default", async () => {
    const owner = await customer("Owner");
    const first = await CustomerAddressService.create(owner.id, address("First"));
    const second = await CustomerAddressService.create(owner.id, address("Second"));
    const third = await CustomerAddressService.create(owner.id, address("Third"));

    const results = await Promise.all([
      CustomerAddressService.setDefault(owner.id, second.id),
      CustomerAddressService.setDefault(owner.id, third.id),
    ]);

    expect(results).toHaveLength(2);
    const defaults = await prisma.customerAddress.findMany({ where: { customerId: owner.id, isDefault: true } });
    expect(defaults).toHaveLength(1);
    expect([second.id, third.id]).toContain(defaults[0].id);
    expect(defaults[0].id).not.toBe(first.id);
  });

  it("deletes the default and promotes the most recently updated replacement", async () => {
    const owner = await customer("Owner");
    const current = await CustomerAddressService.create(owner.id, address("Current"));
    const older = await CustomerAddressService.create(owner.id, address("Older"));
    const newer = await CustomerAddressService.create(owner.id, address("Newer"));
    await prisma.customerAddress.update({ where: { id: older.id }, data: { updatedAt: new Date("2026-01-01T00:00:00.000Z") } });
    await prisma.customerAddress.update({ where: { id: newer.id }, data: { updatedAt: new Date("2026-01-02T00:00:00.000Z") } });

    await CustomerAddressService.remove(owner.id, current.id);

    expect(await prisma.customerAddress.findUnique({ where: { id: current.id } })).toBeNull();
    expect(await prisma.customerAddress.findUniqueOrThrow({ where: { id: newer.id } })).toMatchObject({ isDefault: true });
    expect(await prisma.customerAddress.findUniqueOrThrow({ where: { id: older.id } })).toMatchObject({ isDefault: false });
  });

  it("uses ascending id as the deterministic tie-breaker when deleting the default", async () => {
    const owner = await customer("Owner");
    const current = await CustomerAddressService.create(owner.id, address("Current"));
    const tiedAt = new Date("2026-01-01T00:00:00.000Z");
    await prisma.customerAddress.create({ data: { id: "replacement-b", customerId: owner.id, ...address("B"), isDefault: false, updatedAt: tiedAt } });
    await prisma.customerAddress.create({ data: { id: "replacement-a", customerId: owner.id, ...address("A"), isDefault: false, updatedAt: tiedAt } });

    await CustomerAddressService.remove(owner.id, current.id);

    expect(await prisma.customerAddress.findUniqueOrThrow({ where: { id: "replacement-a" } })).toMatchObject({ isDefault: true });
    expect(await prisma.customerAddress.findUniqueOrThrow({ where: { id: "replacement-b" } })).toMatchObject({ isDefault: false });
  });

  it("rejects cross-customer update, delete, and default-setting operations", async () => {
    const owner = await customer("Owner");
    const attacker = await customer("Attacker");
    const target = await CustomerAddressService.create(owner.id, address("Private"));

    await expect(CustomerAddressService.update(attacker.id, target.id, { label: "Stolen" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(CustomerAddressService.remove(attacker.id, target.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(CustomerAddressService.setDefault(attacker.id, target.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await prisma.customerAddress.findUniqueOrThrow({ where: { id: target.id } })).toMatchObject({ label: "Private", isDefault: true });
  });

  it("enforces one default per customer while allowing multiple non-default addresses", async () => {
    const owner = await customer("Owner");
    await prisma.customerAddress.create({ data: { customerId: owner.id, ...address("Default"), isDefault: true } });
    await expect(prisma.customerAddress.create({ data: { customerId: owner.id, ...address("Duplicate"), isDefault: true } })).rejects.toMatchObject({ code: "P2002" });
    await prisma.customerAddress.createMany({
      data: [
        { customerId: owner.id, ...address("Non-default A"), isDefault: false },
        { customerId: owner.id, ...address("Non-default B"), isDefault: false },
      ],
    });
    expect(await prisma.customerAddress.count({ where: { customerId: owner.id } })).toBe(3);
  });

  it("enables RLS and removes every anon and authenticated table privilege", async () => {
    const rls = await prisma.$queryRaw<Array<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>>`
      SELECT relrowsecurity, relforcerowsecurity
      FROM pg_class
      WHERE oid = 'public."CustomerAddress"'::regclass
    `;
    const grants = await prisma.$queryRaw<Array<{ grantee: string; privilege_type: string }>>`
      SELECT grantee, privilege_type
      FROM information_schema.role_table_grants
      WHERE table_schema = 'public'
        AND table_name = 'CustomerAddress'
        AND grantee IN ('anon', 'authenticated')
    `;

    expect(rls).toEqual([{ relrowsecurity: true, relforcerowsecurity: false }]);
    expect(grants).toEqual([]);
  });
});
