"server-only";

import { adminAuth } from "@/lib/firebase/admin";
import { prisma } from "@/lib/prisma/client";
import { getAuthSyncErrorResponse, synchronizeFirebaseIdentity } from "@/services/auth-sync";
import { cookies } from "next/headers";
import { createToken, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/jwt";

export async function handleServerSession(idToken: string, provider: string = "google") {
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const { uid, email, name, picture, email_verified } = decodedToken;

    if (!email) {
      return { success: false, error: "Email missing from OAuth provider token" };
    }
    const user = await synchronizeFirebaseIdentity({
      uid,
      email,
      name,
      picture,
      emailVerified: email_verified,
    });

    await prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId: uid,
        },
      },
      update: {},
      create: {
        userId: user.id,
        type: "oauth",
        provider,
        providerAccountId: uid,
        id_token: idToken,
      },
    });

    const cookieStore = await cookies();
    const marketplaceToken = await createToken({ userId: user.id, name: user.name, email: user.email, platformRole: user.platformRole, vendorRole: user.vendorRole ?? null, vendorId: user.vendorId ?? null });
    cookieStore.set("session", marketplaceToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: SESSION_MAX_AGE_SECONDS, path: "/" });

    return { success: true, role: user.platformRole };
  } catch (error: unknown) {
    console.error("Firebase Sync Error:", error instanceof Error ? error.name : "Unknown auth error");
    return { success: false, error: getAuthSyncErrorResponse(error).message };
  }
}