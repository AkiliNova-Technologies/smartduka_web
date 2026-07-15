import { NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { prisma } from "@/lib/prisma/client";
import { PlatformRole, UserStatus } from "@prisma/client";
import { cookies } from "next/headers";
import { createToken } from "@/lib/auth/jwt";
import { successResponse, errorResponse, getErrorMessage } from "@/lib/api-utils";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    let idToken = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    if (!idToken) {
      const body = await req.json().catch(() => ({}));
      idToken = body.idToken;
    }

    if (!idToken) {
      return errorResponse("Unauthorized: Missing identity token.", 401);
    }

    // Verify Firebase identity
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const { uid, email, name, picture, email_verified } = decodedToken;

    if (!email) {
      return errorResponse("Missing email profile property", 400);
    }

    // Upsert user in database
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

    // Create marketplace JWT with full vendor/role context
    const marketplaceToken = await createToken({
      userId: user.id,
      name: user.name,
      email: user.email,
      platformRole: user.platformRole as PlatformRole,
      vendorRole: user.vendorRole ?? null,
      vendorId: user.vendorId ?? null,
    });

    // Set session cookie for browser requests
    const isBrowserRequest =
      req.headers.get("sec-ch-ua") ||
      req.headers.get("user-agent")?.includes("Mozilla");

    if (isBrowserRequest) {
      const cookieStore = await cookies();
      cookieStore.set("session", marketplaceToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 5, // 5 days
        path: "/",
      });
    }

    return successResponse({
      id: user.id,
      platformRole: user.platformRole,
      name: user.name,
    });
  } catch (error: unknown) {
    console.error("[Auth API]", error);
    return errorResponse(getErrorMessage(error), 401);
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("session");
    return successResponse({ message: "Logged out completely." });
  } catch (error: unknown) {
    console.error("[Auth API DELETE]", error);
    return errorResponse(getErrorMessage(error));
  }
}