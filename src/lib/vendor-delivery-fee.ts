import { z } from "zod";

/** Client-safe monetary input that Prisma can persist without a Number round-trip. */
export const vendorDeliveryFeeSchema = z
  .union([z.string(), z.number()])
  .transform(String)
  .refine(
    (value) => /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(value),
    "Enter a valid delivery fee with no more than two decimal places.",
  );
