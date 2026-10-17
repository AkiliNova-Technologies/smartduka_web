import { z } from "zod";
import { assertSameOrigin } from "@/lib/request-origin";
import { v1Data, v1Exception } from "@/lib/api/v1/response";
import { BrowserPushSubscriptionService } from "@/services/browser-push-subscriptions";

const inputSchema = z.object({ endpoint: z.string().url().max(2048).refine((value) => value.startsWith("https://"), "must use HTTPS") }).strict();

/** A body keeps the browser's sensitive push endpoint out of URL/access logs. */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { endpoint } = inputSchema.parse(await request.json());
    return v1Data(await BrowserPushSubscriptionService.status(endpoint), 200, { "Cache-Control": "private, no-store" });
  } catch (error) { return v1Exception(error); }
}
