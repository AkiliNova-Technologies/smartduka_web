import { requireActiveUserId } from "@/lib/auth/session";
import { WishlistService } from "@/services/wishlist";
import { wishlistBodySchema } from "@/lib/api/v1/contracts";
import { v1Data, v1Exception } from "@/lib/api/v1/response";
export async function GET() { try { return v1Data(await WishlistService.getUserWishlist(await requireActiveUserId())); } catch (error) { return v1Exception(error); } }
export async function POST(request: Request) { try { const userId = await requireActiveUserId(); const { productId } = wishlistBodySchema.parse(await request.json()); await WishlistService.addToWishlist(userId, productId); return v1Data({ productId, wishlisted: true }, 201); } catch (error) { return v1Exception(error); } }
