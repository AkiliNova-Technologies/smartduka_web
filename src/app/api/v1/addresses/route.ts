import { requireActiveUserId } from "@/lib/auth/session";
import { customerAddressBodySchema } from "@/lib/api/v1/contracts";
import { v1Data, v1Exception } from "@/lib/api/v1/response";
import { CustomerAddressService } from "@/services/customer-addresses";

export async function GET() { try { return v1Data(await CustomerAddressService.list(await requireActiveUserId())); } catch (error) { return v1Exception(error); } }
export async function POST(request: Request) { try { const userId = await requireActiveUserId(); const body = customerAddressBodySchema.parse(await request.json()); return v1Data(await CustomerAddressService.create(userId, body), 201); } catch (error) { return v1Exception(error); } }
