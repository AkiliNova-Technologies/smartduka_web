import type { VendorProfile } from "@prisma/client";

type DecimalProfile = {
  deliveryFee: { toString(): string } | string | number | null;
};

export type VendorProfileDto = Omit<VendorProfile, "deliveryFee"> & {
  deliveryFee: string | null;
};

/** Converts Prisma-only values before a vendor profile crosses a client boundary. */
export function toVendorProfileDto<T extends DecimalProfile>(profile: T) {
  return {
    ...profile,
    deliveryFee: profile.deliveryFee?.toString() ?? null,
  } as Omit<T, "deliveryFee"> & { deliveryFee: string | null };
}
