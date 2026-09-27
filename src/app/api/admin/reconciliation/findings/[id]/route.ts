import {ReconciliationService} from "@/services/reconciliation";
import {successResponse,errorResponse,getErrorMessage} from "@/lib/api-utils";
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){try{return successResponse(await ReconciliationService.getFindingForCurrentAdmin((await params).id))}catch(e){return errorResponse(getErrorMessage(e),403)}}
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){try{const body=await request.json();if(body.status!=="RESOLVED"&&body.status!=="IGNORED")return errorResponse("Invalid finding status.",400);return successResponse(await ReconciliationService.transition((await params).id,body.status,typeof body.reason==="string"?body.reason:""))}catch(e){return errorResponse(getErrorMessage(e),400)}}
