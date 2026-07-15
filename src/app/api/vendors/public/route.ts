import { VendorService } from "@/services/vendor";
import {
  successResponse,
  errorResponse,
  getErrorMessage,
} from "@/lib/api-utils";

export async function GET() {
  try {
    const stores = await VendorService.getPublicStoreListings();
    return successResponse(stores);
  } catch (error: unknown) {
    console.error("[Public Vendors API]", error);
    return errorResponse(getErrorMessage(error));
  }
}