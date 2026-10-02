import { NextRequest } from "next/server";
import { ReturnsRefundsService } from "@/services/returns-refunds";
import { errorResponse, getErrorMessage, successResponse } from "@/lib/api-utils";
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) { try { const { id } = await params; const item = await ReturnsRefundsService.getReturnForCurrentAdmin(id); return item ? successResponse(item) : errorResponse("Return not found", 404); } catch (error) { return errorResponse(getErrorMessage(error), 403); } }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) { try { const { id } = await params; const body = await req.json(); if (body.action !== "approve") return errorResponse("Unsupported return action", 400); return successResponse(await ReturnsRefundsService.approveReturn(id)); } catch (error) { return errorResponse(getErrorMessage(error), 400); } }
