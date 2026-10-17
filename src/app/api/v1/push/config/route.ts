import { requireActiveUserId } from "@/lib/auth/session";
import { v1Data, v1Exception } from "@/lib/api/v1/response";
import { webPushPublicConfiguration } from "@/lib/web-push-config";

export async function GET() {
  try {
    await requireActiveUserId();
    return v1Data(webPushPublicConfiguration(), 200, { "Cache-Control": "private, no-store" });
  } catch (error) { return v1Exception(error); }
}
