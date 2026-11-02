import { requireActiveUserId } from "@/lib/auth/session";
import { checkoutPreviewBodySchema } from "@/lib/api/v1/contracts";
import { v1Data, v1Exception } from "@/lib/api/v1/response";
import { previewCheckout } from "@/services/checkout-preview";

export async function POST(request: Request) {
  try {
    const body = checkoutPreviewBodySchema.parse(await request.json());
    return v1Data(await previewCheckout(await requireActiveUserId(), body), 200, { "Cache-Control": "private, no-store" });
  } catch (error) { return v1Exception(error); }
}
