import { requireActiveUserId } from "@/lib/auth/session";
import { v1Data, v1Exception } from "@/lib/api/v1/response";
import { CustomerAddressService } from "@/services/customer-addresses";

export async function POST(_: Request, { params }: { params: Promise<{ addressId: string }> }) { try { const userId = await requireActiveUserId(); const { addressId } = await params; return v1Data(await CustomerAddressService.setDefault(userId, addressId)); } catch (error) { return v1Exception(error); } }
