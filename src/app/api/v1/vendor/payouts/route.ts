import { vendorPayoutAccountSchema } from "@/lib/api/v1/contracts";
import { v1Data, v1Exception } from "@/lib/api/v1/response";
import { VendorPayoutService } from "@/services/vendor-payout";

export async function GET() { try { return v1Data(await VendorPayoutService.getPayoutAccounts(), 200, { "Cache-Control": "private, no-store" }); } catch (error) { return v1Exception(error); } }
export async function POST(request: Request) { try { return v1Data(await VendorPayoutService.addPayoutAccount(vendorPayoutAccountSchema.parse(await request.json())), 201); } catch (error) { return v1Exception(error); } }
