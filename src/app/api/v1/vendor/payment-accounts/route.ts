import { z } from "zod";
import { PaymentProvider } from "@prisma/client";
import { VendorPaymentAccountService } from "@/services/vendor-payment-account";
import { v1Data, v1Exception } from "@/lib/api/v1/response";
const merchantCode = z.string().trim().min(3, "Merchant code must be at least 3 characters.").max(120).regex(/^[A-Za-z0-9-]+$/, "Merchant code may only contain letters, numbers, and hyphens.");
const schema = z.object({ provider: z.enum([PaymentProvider.MTN_MOMO, PaymentProvider.AIRTEL_MONEY]), merchantPhone: z.string().min(7).max(32), merchantCode: merchantCode.optional(), merchantAccountId: z.string().max(120).optional(), merchantName: z.string().max(120).optional() }).strict();
export async function GET() { try { return v1Data({ accounts: await VendorPaymentAccountService.list() }, 200, { "Cache-Control": "private, no-store" }); } catch (error) { return v1Exception(error); } }
export async function POST(request: Request) { try { return v1Data(await VendorPaymentAccountService.create(schema.parse(await request.json())), 201); } catch (error) { return v1Exception(error); } }
