import { prisma } from "@/lib/prisma/client";

export type CustomerAddressInput = {
  label?: string; recipientName?: string; recipientPhone?: string; country?: "Uganda";
  district?: string; city?: string; area?: string; street?: string | null;
  building?: string | null; landmark?: string; deliveryInstructions?: string | null;
  isDefault?: boolean;
};

const addressSelect = {
  id: true, label: true, recipientName: true, recipientPhone: true, country: true,
  district: true, city: true, area: true, street: true, building: true,
  landmark: true, deliveryInstructions: true, isDefault: true,
  createdAt: true, updatedAt: true,
} as const;

function notFound(): Error & { code: string } {
  return Object.assign(new Error("Address not found."), { code: "NOT_FOUND" });
}

export const CustomerAddressService = {
  list(customerId: string) {
    return prisma.customerAddress.findMany({ where: { customerId }, select: addressSelect, orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }] });
  },

  create(customerId: string, input: Required<Omit<CustomerAddressInput, "street" | "building" | "deliveryInstructions" | "isDefault">> & CustomerAddressInput) {
    return prisma.$transaction(async (tx) => {
      // Serialize default transitions on the owning user row. This prevents two
      // concurrent first/default writes from both surviving as defaults.
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${customerId} FOR UPDATE`;
      const count = await tx.customerAddress.count({ where: { customerId } });
      const makeDefault = count === 0 || input.isDefault === true;
      if (makeDefault) await tx.customerAddress.updateMany({ where: { customerId, isDefault: true }, data: { isDefault: false } });
      return tx.customerAddress.create({ data: { customerId, ...input, isDefault: makeDefault }, select: addressSelect });
    });
  },

  update(customerId: string, addressId: string, input: CustomerAddressInput) {
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${customerId} FOR UPDATE`;
      const existing = await tx.customerAddress.findFirst({ where: { id: addressId, customerId }, select: { id: true, isDefault: true } });
      if (!existing) throw notFound();
      if (input.isDefault === true) await tx.customerAddress.updateMany({ where: { customerId, isDefault: true, id: { not: addressId } }, data: { isDefault: false } });
      // A default can only be moved with the explicit default operation.
      const data = { ...input, ...(input.isDefault === false && existing.isDefault ? { isDefault: true } : {}) };
      return tx.customerAddress.update({ where: { id: addressId }, data, select: addressSelect });
    });
  },

  setDefault(customerId: string, addressId: string) {
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${customerId} FOR UPDATE`;
      const existing = await tx.customerAddress.findFirst({ where: { id: addressId, customerId }, select: { id: true } });
      if (!existing) throw notFound();
      await tx.customerAddress.updateMany({ where: { customerId, isDefault: true, id: { not: addressId } }, data: { isDefault: false } });
      return tx.customerAddress.update({ where: { id: addressId }, data: { isDefault: true }, select: addressSelect });
    });
  },

  remove(customerId: string, addressId: string) {
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${customerId} FOR UPDATE`;
      const existing = await tx.customerAddress.findFirst({ where: { id: addressId, customerId }, select: { id: true, isDefault: true } });
      if (!existing) throw notFound();
      await tx.customerAddress.delete({ where: { id: addressId } });
      if (existing.isDefault) {
        const replacement = await tx.customerAddress.findFirst({ where: { customerId }, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], select: { id: true } });
        if (replacement) await tx.customerAddress.update({ where: { id: replacement.id }, data: { isDefault: true } });
      }
      return { addressId, deleted: true };
    });
  },
};
