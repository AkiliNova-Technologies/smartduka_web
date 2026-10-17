import { z } from "zod";

const key = z.string().trim().min(16).max(512).regex(/^[A-Za-z0-9_-]+$/, "must be URL-safe base64");

export const browserPushSubscriptionSchema = z.object({
  endpoint: z.string().url().max(2048).refine((value) => value.startsWith("https://"), "must use HTTPS"),
  keys: z.object({ p256dh: key, auth: key }),
  // Included by the standard PushSubscription.toJSON() result. It is not used
  // for authorization or persisted as subscription metadata.
  expirationTime: z.number().finite().nullable().optional(),
  deviceName: z.string().trim().max(120).optional(),
}).strict();

export type BrowserPushSubscriptionInput = z.infer<typeof browserPushSubscriptionSchema>;
