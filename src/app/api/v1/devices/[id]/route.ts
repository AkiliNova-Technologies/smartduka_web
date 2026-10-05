import { v1Data, v1Exception } from "@/lib/api/v1/response";
import { UserDeviceService } from "@/services/user-devices";
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) { try { await UserDeviceService.remove((await params).id); return v1Data({ removed: true }); } catch (error) { return v1Exception(error); } }
