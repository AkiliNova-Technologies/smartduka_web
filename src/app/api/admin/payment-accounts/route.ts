import { VendorPaymentAccountStatus } from "@prisma/client";
import { errorResponse, getErrorMessage, successResponse } from "@/lib/api-utils";
import { VendorPaymentAccountService } from "@/services/vendor-payment-account";
export async function GET(request: Request) { try { const value = new URL(request.url).searchParams.get("status"); const status = value && Object.values(VendorPaymentAccountStatus).includes(value as VendorPaymentAccountStatus) ? value as VendorPaymentAccountStatus : undefined; return successResponse(await VendorPaymentAccountService.listForAdmin(status)); } catch (error) { return errorResponse(getErrorMessage(error), 403); } }
