import { ReturnsRefundsService } from "@/services/returns-refunds";
import { successResponse, errorResponse, getErrorMessage } from "@/lib/api-utils";
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) { try { const { id } = await params; return successResponse(await ReturnsRefundsService.cancelSubOrderForCurrentCustomer(id)); } catch (error) { return errorResponse(getErrorMessage(error), 400); } }
