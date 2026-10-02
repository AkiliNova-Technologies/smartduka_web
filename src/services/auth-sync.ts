import { PlatformRole, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";

const FIREBASE_PROVIDER = "firebase";
const IDENTITY_CONFLICT_MESSAGE = "We couldn't finish signing you in because this account is linked differently. Please try again or contact support.";

export class AuthIdentityConflictError extends Error {
  constructor() { super(IDENTITY_CONFLICT_MESSAGE); this.name = "AuthIdentityConflictError"; }
}

export type FirebaseIdentity = {
  uid: string;
  email: string;
  name?: string | null;
  picture?: string | null;
  emailVerified?: boolean;
};

function isUniqueConstraint(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/** Resolves Firebase's immutable UID to a SmartDuka user. Email is profile data,
 * and can only establish a missing legacy mapping when Firebase has verified it. */
export async function synchronizeFirebaseIdentity(identity: FirebaseIdentity) {
  const email = normalizeEmail(identity.email);
  if (!identity.uid || !email) throw new AuthIdentityConflictError();

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const [accountLinks, legacyIdUser, emailMatches] = await Promise.all([
          tx.account.findMany({
            where: { providerAccountId: identity.uid },
            include: { user: true },
          }),
          tx.user.findUnique({ where: { id: identity.uid } }),
          tx.user.findMany({
            where: { email: { equals: email, mode: "insensitive" } },
          }),
        ]);

        const linkedUsers = accountLinks.map((account) => account.user);
        const identityUsers = [
          ...linkedUsers,
          ...(legacyIdUser ? [legacyIdUser] : []),
        ].filter((user, index, users) => users.findIndex((candidate) => candidate.id === user.id) === index);

        if (identityUsers.length > 1 || emailMatches.length > 1) {
          throw new AuthIdentityConflictError();
        }

        const identityUser = identityUsers[0];
        const emailUser = emailMatches[0];

        if (identityUser && emailUser && identityUser.id !== emailUser.id) {
          throw new AuthIdentityConflictError();
        }

        let user = identityUser;
        if (!user && emailUser) {
          // A verified Firebase email can safely attach a legacy DB user that has
          // no Firebase mapping. An unverified token must not claim that account.
          if (!identity.emailVerified) throw new AuthIdentityConflictError();
          user = emailUser;
        }

        const now = new Date();
        if (user) {
          user = await tx.user.update({
            where: { id: user.id },
            data: {
              email,
              name: identity.name?.trim() || user.name,
              avatarUrl: identity.picture || user.avatarUrl,
              emailVerifiedAt: identity.emailVerified ? now : user.emailVerifiedAt,
              lastLoginAt: now,
            },
          });
        } else {
          user = await tx.user.create({
            data: {
              id: identity.uid,
              email,
              name: identity.name?.trim() || email.split("@")[0],
              avatarUrl: identity.picture || null,
              status: UserStatus.ACTIVE,
              platformRole: PlatformRole.CUSTOMER,
              emailVerifiedAt: identity.emailVerified ? now : null,
              lastLoginAt: now,
            },
          });
        }

        await tx.account.upsert({
          where: {
            provider_providerAccountId: {
              provider: FIREBASE_PROVIDER,
              providerAccountId: identity.uid,
            },
          },
          update: {},
          create: {
            userId: user.id,
            type: "oauth",
            provider: FIREBASE_PROVIDER,
            providerAccountId: identity.uid,
          },
        });

        return user;
      });
    } catch (error) {
      if (error instanceof AuthIdentityConflictError) throw error;
      if (!isUniqueConstraint(error) || attempt === 1) throw error;
      // A simultaneous first sync may have created the user/account mapping.
      // Re-resolving through the deterministic lookup above is safe and idempotent.
    }
  }

  throw new AuthIdentityConflictError();
}

export function getAuthSyncErrorResponse(error: unknown) {
  if (error instanceof AuthIdentityConflictError) {
    return { message: IDENTITY_CONFLICT_MESSAGE, status: 409, code: "IDENTITY_CONFLICT" };
  }
  return { message: "We couldn't finish signing you in. Please try again.", status: 401, code: "AUTH_SYNC_FAILED" };
}
