import { requireActiveUserId } from "@/lib/auth/session";
import { v1Data, v1Exception } from "@/lib/api/v1/response";
import { AnnouncementService } from "@/services/announcements";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const userId = await requireActiveUserId(); const read = (await request.json().catch(() => ({})))?.read !== false; await AnnouncementService.setRead(userId, (await params).id, read); return v1Data({ read }); }
  catch (error) { return v1Exception(error); }
}
