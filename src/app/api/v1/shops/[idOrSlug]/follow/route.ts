import { z } from "zod";
import { requireActiveUserId } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { v1Data, v1Error, v1Exception } from "@/lib/api/v1/response";
import { StoreFollowingService } from "@/services/store-following";
const identifier = z.string().uuid();
const privateHeaders = { "Cache-Control": "private, no-store" };
export async function GET(_: Request, { params }: { params: Promise<{ idOrSlug: string }> }) { try { const customerId = await requireActiveUserId(); const vendorId = identifier.parse((await params).idOrSlug); return v1Data(await StoreFollowingService.state(customerId, vendorId), 200, privateHeaders); } catch (error) { return v1Exception(error); } }
export async function PUT(_: Request, { params }: { params: Promise<{ idOrSlug: string }> }) { try { const customerId = await requireActiveUserId(); if (!checkRateLimit(`store-follow:${customerId}`, 30, 60_000)) return v1Error("RATE_LIMITED", "Too many follow requests. Please try again shortly.", 429); const vendorId = identifier.parse((await params).idOrSlug); return v1Data(await StoreFollowingService.follow(customerId, vendorId), 200, privateHeaders); } catch (error) { return v1Exception(error); } }
export async function DELETE(_: Request, { params }: { params: Promise<{ idOrSlug: string }> }) { try { const customerId = await requireActiveUserId(); if (!checkRateLimit(`store-unfollow:${customerId}`, 30, 60_000)) return v1Error("RATE_LIMITED", "Too many follow requests. Please try again shortly.", 429); const vendorId = identifier.parse((await params).idOrSlug); return v1Data(await StoreFollowingService.unfollow(customerId, vendorId), 200, privateHeaders); } catch (error) { return v1Exception(error); } }
