import { requireActiveUserId } from "@/lib/auth/session";
import { v1Data, v1Exception } from "@/lib/api/v1/response";
import { AnnouncementService } from "@/services/announcements";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const userId = await requireActiveUserId(); await AnnouncementService.dismiss(userId, (await params).id); return v1Data({ dismissed: true }); }
  catch (error) { return v1Exception(error); }
}
