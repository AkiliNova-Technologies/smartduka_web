import { NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { prisma } from "@/lib/prisma/client";
import { PlatformRole, UserStatus } from "@prisma/client";
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

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const { uid, email, name, picture, email_verified } = decodedToken;

    if (!email) {
      return errorResponse("Email missing from token.", 400);
    }

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name: name || undefined,
        avatarUrl: picture || null,
        emailVerifiedAt: email_verified ? new Date() : null,
        lastLoginAt: new Date(),
        status: UserStatus.ACTIVE,
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

    return successResponse({
      id: user.id,
      platformRole: user.platformRole,
    });
  } catch (error: unknown) {
    console.error("[Auth Sync API]", error);
    return errorResponse(getErrorMessage(error), 401);
  }
}