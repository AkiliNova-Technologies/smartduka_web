import { requireVendorContext } from "@/lib/auth/vendor-context";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/auth/permissions";
import { v1Data, v1Exception } from "@/lib/api/v1/response";
export async function GET() { try { const context = await requireVendorContext(); return v1Data({ shop: { id: context.vendor.id, slug: context.vendor.slug, status: context.vendor.status }, role: context.vendorRole, permissions: DEFAULT_ROLE_PERMISSIONS[context.vendorRole] }, 200, { "Cache-Control": "private, no-store" }); } catch (error) { return v1Exception(error); } }
