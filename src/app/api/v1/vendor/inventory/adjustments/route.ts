import { inventoryAdjustmentSchema } from "@/lib/api/v1/contracts";
import { VendorInventoryService } from "@/services/vendor-inventory";
import { v1Data, v1Exception } from "@/lib/api/v1/response";
export async function POST(request: Request) { try { return v1Data(await VendorInventoryService.adjust(inventoryAdjustmentSchema.parse(await request.json()))); } catch (error) { return v1Exception(error); } }
