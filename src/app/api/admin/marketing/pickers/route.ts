import { MarketingService } from "@/services/marketing";
import { errorResponse,getErrorMessage,successResponse } from "@/lib/api-utils";
import { AdminAuthorizationError } from "@/lib/auth/admin-context";
import { AuthenticationRequiredError } from "@/lib/auth/session";
export async function GET(){try{return successResponse(await MarketingService.pickerData());}catch(e){return errorResponse(getErrorMessage(e),e instanceof AuthenticationRequiredError?401:e instanceof AdminAuthorizationError?403:400)}}
