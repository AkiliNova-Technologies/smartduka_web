import { z } from "zod";
import { v1Data, v1Exception } from "@/lib/api/v1/response";
import { VendorPaymentAccountService } from "@/services/vendor-payment-account";
const merchantCode = z.string().trim().min(3, "Merchant code must be at least 3 characters.").max(120).regex(/^[A-Za-z0-9-]+$/, "Merchant code may only contain letters, numbers, and hyphens.");
const schema = z.object({ action: z.enum(["resubmit", "set-default"]), merchantPhone: z.string().min(7).max(32).optional(), merchantCode: merchantCode.optional(), merchantAccountId: z.string().max(120).optional(), merchantName: z.string().max(120).optional() }).strict();
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) { try { const body = schema.parse(await request.json()), id = (await params).id; return v1Data(body.action === "set-default" ? await VendorPaymentAccountService.setDefault(id) : await VendorPaymentAccountService.resubmit(id, body)); } catch (error) { return v1Exception(error); } }
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) { try { return v1Data(await VendorPaymentAccountService.remove((await params).id)); } catch (error) { return v1Exception(error); } }
