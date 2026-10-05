import { v1Data, v1Error, v1Exception } from "@/lib/api/v1/response";
import { VendorPayoutService } from "@/services/vendor-payout";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) { try { const body = await request.json(); if (body?.action !== "set-default") return v1Error("VALIDATION_ERROR", "Unsupported payout action.", 400); return v1Data(await VendorPayoutService.setDefaultPayoutAccount((await params).id)); } catch (error) { return v1Exception(error); } }
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) { try { return v1Data(await VendorPayoutService.disablePayoutAccount((await params).id)); } catch (error) { return v1Exception(error); } }
