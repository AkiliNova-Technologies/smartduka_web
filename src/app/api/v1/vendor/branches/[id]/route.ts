import { ShopBranchService } from "@/services/shop-branches";
import { v1Data, v1Exception } from "@/lib/api/v1/response";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { return v1Data(await ShopBranchService.updateForCurrentVendor((await params).id, await request.json())); }
  catch (error) { return v1Exception(error); }
}
