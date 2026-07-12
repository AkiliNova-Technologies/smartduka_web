import { NextRequest, NextResponse } from "next/server";
import { settingsService } from "@/services/settings";

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-marketplace-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await settingsService.getSettings(userId);
    return NextResponse.json(settings);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = req.headers.get("x-marketplace-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const settings = await settingsService.updateSettings(userId, body);
    return NextResponse.json(settings);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}