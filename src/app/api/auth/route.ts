import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { prisma } from "@/lib/prisma/client";
import { PlatformRole, UserStatus } from "@prisma/client";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    let idToken = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    if (!idToken) {
      const body = await req.json().catch(() => ({}));
      idToken = body.idToken;
    }

    if (!idToken) {
      return NextResponse.json({ error: "Unauthorized: Missing identity token." }, { status: 401 });
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const { uid, email, name, picture, email_verified } = decodedToken;

    if (!email) {
      return NextResponse.json({ error: "Missing email profile property" }, { status: 400 });
    }

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        lastLoginAt: new Date(),
        avatarUrl: picture || null,
        emailVerifiedAt: email_verified ? new Date() : null,
      },
      create: {
        id: uid,
        email,
        name: name || email.split("@")[0],
        avatarUrl: picture || null,
        status: UserStatus.ACTIVE,
        platformRole: PlatformRole.CUSTOMER,
        emailVerifiedAt: email_verified ? new Date() : null,
        lastLoginAt: new Date(),
      },
    });

    const isBrowserRequest = req.headers.get("sec-ch-ua") || req.headers.get("user-agent")?.includes("Mozilla");
    if (isBrowserRequest) {
      const cookieStore = await cookies();
      cookieStore.set("session", idToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 5,
        path: "/",
      });
    }

    return NextResponse.json({ success: true, user: { id: user.id, role: user.platformRole, name: user.name } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Authentication token handling failure";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
  return NextResponse.json({ success: true, message: "Logged out completely." });
}