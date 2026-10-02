type DecimalProfile = {
  deliveryFee: { toString(): string };
};

/** Converts Prisma-only values before a vendor profile crosses a client boundary. */
export function toVendorProfileDto<T extends DecimalProfile>(profile: T) {
  return {
    ...profile,
    deliveryFee: Number(profile.deliveryFee),
  } as Omit<T, "deliveryFee"> & { deliveryFee: number };
}
