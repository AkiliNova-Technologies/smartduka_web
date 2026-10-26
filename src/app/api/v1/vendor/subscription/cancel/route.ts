import { v1Data, v1Exception } from "@/lib/api/v1/response";
import { VendorSubscriptionLifecycleService } from "@/services/vendor-subscription-lifecycle";
export async function POST() { try { return v1Data(await VendorSubscriptionLifecycleService.cancelAtPeriodEnd(), 200, { "Cache-Control": "private, no-store" }); } catch (error) { return v1Exception(error); } }
