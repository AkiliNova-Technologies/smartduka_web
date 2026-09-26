import { UserStatus } from "@prisma/client";
import { getCurrentUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";

export class ApplicantAuthorizationError extends Error {}

/** Resolves an active applicant from the verified session and current DB user. */
export async function requireApplicantContext() {
  const userId = await getCurrentUserId();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, status: true },
  });
  if (!user || user.status !== UserStatus.ACTIVE) {
    throw new ApplicantAuthorizationError("An active applicant account is required.");
  }
  return { userId: user.id };
}
