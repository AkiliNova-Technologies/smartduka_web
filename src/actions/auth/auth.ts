"server-only";

import { adminAuth } from "@/lib/firebase/admin";
import { prisma } from "@/lib/prisma/client"; 
import { cookies } from "next/headers";
import { PlatformRole, UserStatus } from "@prisma/client";

export async function handleServerSession(idToken: string, provider: string = "google") {
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const { uid, email, name, picture, email_verified } = decodedToken;

    if (!email) {
      return { success: false, error: "Email missing from OAuth provider token" };
    }
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        lastLoginAt: new Date(),
        avatarUrl: picture || null,
        emailVerifiedAt: email_verified ? new Date() : null,
        status: UserStatus.ACTIVE
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
    cookieStore.set("session", idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 5,
      path: "/",
    });

    return { success: true, role: user.platformRole };
  } catch (error: unknown) {
    console.error("Firebase Sync Error:", error);
    const message = error instanceof Error ? error.message : "Authentication failed";
    return { success: false, error: message };
  }
}