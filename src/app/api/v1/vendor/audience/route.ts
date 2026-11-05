import { v1Data, v1Exception } from "@/lib/api/v1/response";
import { StorePublicationService } from "@/services/store-publications";

export async function GET() {
  try { return v1Data(await StorePublicationService.metrics(), 200, { "Cache-Control": "private, no-store" }); }
  catch (error) { return v1Exception(error); }
}
