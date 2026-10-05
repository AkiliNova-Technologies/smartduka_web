import { requireActiveUserId } from "@/lib/auth/session";
import { WishlistService } from "@/services/wishlist";
import { v1Data, v1Exception } from "@/lib/api/v1/response";
export async function DELETE(_: Request, { params }: { params: Promise<{ productId: string }> }) { try { const { productId } = await params; await WishlistService.removeFromWishlist(await requireActiveUserId(), productId); return v1Data({ productId, wishlisted: false }); } catch (error) { return v1Exception(error); } }
