import { prisma } from "@/lib/prisma/client";
import { requireActiveUserId } from "@/lib/auth/session";
import { requireVendorContext } from "@/lib/auth/vendor-context";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/auth/permissions";
import { mePatchSchema } from "@/lib/api/v1/contracts";
import { v1Data, v1Exception } from "@/lib/api/v1/response";

export async function GET() {
  try {
    const userId = await requireActiveUserId();
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { id: true, name: true, email: true, phone: true, avatarUrl: true, vendorId: true, vendorRole: true, vendorProfile: { select: { id: true, storeName: true, slug: true, verificationStatus: true } }, ownedVendor: { select: { id: true, storeName: true, slug: true, verificationStatus: true } } } });
    const shop = user.vendorProfile ?? user.ownedVendor;
    return v1Data({ id: user.id, name: user.name, email: user.email, phone: user.phone, avatarUrl: user.avatarUrl, availableModes: shop && user.vendorRole ? ["CUSTOMER", "VENDOR"] : ["CUSTOMER"], vendor: shop && user.vendorRole ? { id: shop.id, shopName: shop.storeName, slug: shop.slug, role: user.vendorRole, permissions: DEFAULT_ROLE_PERMISSIONS[user.vendorRole], verificationStatus: shop.verificationStatus } : null });
  } catch (error) { return v1Exception(error); }
}

export async function PATCH(request: Request) {
  try { const userId = await requireActiveUserId(); const body = mePatchSchema.parse(await request.json()); const user = await prisma.user.update({ where: { id: userId }, data: body, select: { id: true, name: true, email: true, phone: true, avatarUrl: true } }); return v1Data(user); } catch (error) { return v1Exception(error); }
}
