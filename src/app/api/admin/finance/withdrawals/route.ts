import { AdminFinanceService } from "@/services/admin-finance"; import { errorResponse, getErrorMessage, successResponse } from "@/lib/api-utils";
export async function GET(){try{return successResponse(await AdminFinanceService.listWithdrawals())}catch(error){return errorResponse(getErrorMessage(error),403)}}
