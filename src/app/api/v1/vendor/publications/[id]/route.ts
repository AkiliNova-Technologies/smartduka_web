import { v1Data, v1Exception } from "@/lib/api/v1/response";
import { storePublicationInputSchema } from "@/lib/store-publication-schema";
import { StorePublicationService } from "@/services/store-publications";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) { try { return v1Data(await StorePublicationService.update((await params).id, storePublicationInputSchema.parse(await request.json())), 200, { "Cache-Control": "private, no-store" }); } catch (error) { return v1Exception(error); } }
