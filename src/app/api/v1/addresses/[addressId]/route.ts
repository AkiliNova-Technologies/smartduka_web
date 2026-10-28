import { requireActiveUserId } from "@/lib/auth/session";
import { customerAddressPatchSchema } from "@/lib/api/v1/contracts";
import { v1Data, v1Exception } from "@/lib/api/v1/response";
import { CustomerAddressService } from "@/services/customer-addresses";

type Context = { params: Promise<{ addressId: string }> };
export async function PATCH(request: Request, { params }: Context) { try { const userId = await requireActiveUserId(); const { addressId } = await params; return v1Data(await CustomerAddressService.update(userId, addressId, customerAddressPatchSchema.parse(await request.json()))); } catch (error) { return v1Exception(error); } }
export async function DELETE(_: Request, { params }: Context) { try { const userId = await requireActiveUserId(); const { addressId } = await params; return v1Data(await CustomerAddressService.remove(userId, addressId)); } catch (error) { return v1Exception(error); } }
