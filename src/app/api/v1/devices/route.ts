import { deviceRegistrationSchema } from "@/lib/api/v1/contracts";
import { v1Data, v1Exception } from "@/lib/api/v1/response";
import { UserDeviceService } from "@/services/user-devices";
export async function GET() { try { return v1Data(await UserDeviceService.list(), 200, { "Cache-Control": "private, no-store" }); } catch (error) { return v1Exception(error); } }
export async function POST(request: Request) { try { return v1Data(await UserDeviceService.register(deviceRegistrationSchema.parse(await request.json())), 201); } catch (error) { return v1Exception(error); } }
