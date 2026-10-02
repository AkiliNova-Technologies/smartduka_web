import { z } from "zod";

export const FULFILLMENT_METHODS = ["DELIVERY", "PICKUP"] as const;

export const FulfillmentMethodSchema = z.enum(FULFILLMENT_METHODS);

export type FulfillmentMethod = z.infer<typeof FulfillmentMethodSchema>;

export function isFulfillmentMethod(value: unknown): value is FulfillmentMethod {
  return FulfillmentMethodSchema.safeParse(value).success;
}
