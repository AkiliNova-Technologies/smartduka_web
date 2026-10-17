import { requireActiveUserId } from "@/lib/auth/session";
import { v1Data, v1Exception } from "@/lib/api/v1/response";
import { AnnouncementService } from "@/services/announcements";

export async function GET() { try { return v1Data(await AnnouncementService.activeBanners(await requireActiveUserId())); } catch (error) { return v1Exception(error); } }
