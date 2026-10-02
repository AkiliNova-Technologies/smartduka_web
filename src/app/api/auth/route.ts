import { NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { PlatformRole } from "@prisma/client";
import { cookies } from "next/headers";
import { createToken, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/jwt";
import { successResponse, errorResponse, getErrorMessage } from "@/lib/api-utils";
import { getAuthSyncErrorResponse, synchronizeFirebaseIdentity } from "@/services/auth-sync";
import { getCurrentWorkspaceAccess } from "@/lib/auth/workspaces";

export async function GET() {
  return successResponse(await getCurrentWorkspaceAccess());
}

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
    const user = await synchronizeFirebaseIdentity({
      uid,
      email,
      name,
      picture,
      emailVerified: email_verified,
    });

    const marketplaceToken = await createToken({
      userId: user.id,
      name: user.name,
      email: user.email,
      platformRole: user.platformRole as PlatformRole,
      vendorRole: user.vendorRole ?? null,
      vendorId: user.vendorId ?? null,
    });

    const isBrowserRequest =
      req.headers.get("sec-ch-ua") || req.headers.get("user-agent")?.includes("Mozilla");
    if (isBrowserRequest) {
      const cookieStore = await cookies();
      cookieStore.set("session", marketplaceToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: SESSION_MAX_AGE_SECONDS,
        path: "/",
      });
    }

    return successResponse({
      id: user.id,
      platformRole: user.platformRole,
      name: user.name,
    });
  } catch (error: unknown) {
    console.error("[Auth API]", error instanceof Error ? error.name : "Unknown auth error");
    const response = getAuthSyncErrorResponse(error);
    return errorResponse(response.message, response.status, response.code);
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    for (const name of ["session", "marketplace_access_token"]) {
      cookieStore.set(name, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 0, path: "/" });
    }
    return successResponse({ message: "Logged out completely." });
  } catch (error: unknown) {
    console.error("[Auth API DELETE]", error);
    return errorResponse(getErrorMessage(error));
  }
}