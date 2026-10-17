import { z } from "zod";

const endpoint = z
  .string()
  .url()
  .max(2048)
  .refine((value) => value.startsWith("https://"), "must use HTTPS");

/** Only identifies the browser already controlled by this signed-in session. */
export const pushTestRequestSchema = z
  .object({
    endpoint,
    requestId: z.string().uuid(),
  })
  .strict();

export const pushTestStatusQuerySchema = z.object({ requestId: z.string().uuid() });

export type PushTestRequest = z.infer<typeof pushTestRequestSchema>;
