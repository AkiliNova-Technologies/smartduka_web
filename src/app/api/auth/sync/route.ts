import { NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { successResponse, errorResponse } from "@/lib/api-utils";
import { getAuthSyncErrorResponse, synchronizeFirebaseIdentity } from "@/services/auth-sync";

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

    const user = await synchronizeFirebaseIdentity({
      uid,
      email,
      name,
      picture,
      emailVerified: email_verified,
    });

    return successResponse({
      id: user.id,
      platformRole: user.platformRole,
    });
  } catch (error: unknown) {
    console.error("[Auth Sync API]", error instanceof Error ? error.name : "Unknown auth sync error");
    const response = getAuthSyncErrorResponse(error);
    return errorResponse(response.message, response.status, response.code);
  }
}