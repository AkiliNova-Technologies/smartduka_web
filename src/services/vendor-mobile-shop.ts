import { prisma } from "@/lib/prisma/client";

const select = {
  id: true, storeName: true, slug: true, description: true, email: true, phone: true,
  website: true, address: true, city: true, country: true, logoUrl: true, bannerUrl: true,
  fulfillmentMethods: true, deliveryFee: true, deliveryEstimate: true, pickupLocation: true, updatedAt: true,
} as const;

export class VendorMobileShopService {
  static get(vendorId: string) {
    return prisma.vendorProfile.findUniqueOrThrow({ where: { id: vendorId }, select });
  }

  static update(vendorId: string, input: Record<string, unknown>) {
    return prisma.vendorProfile.update({ where: { id: vendorId }, data: input, select });
  }
}
