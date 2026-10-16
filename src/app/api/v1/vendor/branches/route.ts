import { ShopBranchService } from "@/services/shop-branches";
import { v1Data, v1Exception } from "@/lib/api/v1/response";

export async function GET() {
  try { return v1Data(await ShopBranchService.listForCurrentVendor(), 200, { "Cache-Control": "private, no-store" }); }
  catch (error) { return v1Exception(error); }
}

export async function POST(request: Request) {
  try { return v1Data(await ShopBranchService.createForCurrentVendor(await request.json()), 201); }
  catch (error) { return v1Exception(error); }
}
