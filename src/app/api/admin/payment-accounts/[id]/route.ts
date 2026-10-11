import { z } from "zod";
import { errorResponse, getErrorMessage, successResponse } from "@/lib/api-utils";
import { VendorPaymentAccountService } from "@/services/vendor-payment-account";
const schema = z.object({ action: z.enum(["VERIFY", "REJECT", "SUSPEND", "RESTORE"]), reason: z.string().trim().max(1000).optional() }).strict();
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) { try { const body = schema.parse(await request.json()); return successResponse(await VendorPaymentAccountService.transitionForAdmin((await params).id, body.action, body.reason)); } catch (error) { return errorResponse(getErrorMessage(error), 400); } }
