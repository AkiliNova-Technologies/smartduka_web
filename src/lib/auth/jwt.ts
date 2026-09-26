import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { PlatformRole, VendorUserRole } from "@prisma/client";

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
export class JWTConfigurationError extends Error {}

function getSigningSecret(): Uint8Array {
  const configuredSecret = process.env.JWT_SECRET;
  if (!configuredSecret) {
    if (process.env.NODE_ENV === "production") {
      throw new JWTConfigurationError("JWT_SECRET must be configured in production.");
    }
    return new TextEncoder().encode("smartduka-development-session-secret-not-for-production");
  }
  if (process.env.NODE_ENV === "production" && configuredSecret.length < 32) {
    throw new JWTConfigurationError("JWT_SECRET must be at least 32 characters in production.");
  }
  return new TextEncoder().encode(configuredSecret);
}

/** Role/vendor claims are display hints only; privileged contexts re-check PostgreSQL. */
export interface MarketplaceJWTPayload extends JWTPayload {
  userId: string;
  name: string;
  email: string;
  platformRole: PlatformRole | null;
  vendorRole: VendorUserRole | null;
  vendorId: string | null;
}

export async function createToken(payload: MarketplaceJWTPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSigningSecret());
}

export async function verifyToken(token: string): Promise<MarketplaceJWTPayload | null> {
  const secret = getSigningSecret();
  try {
    const { payload } = await jwtVerify(token, secret);
    if (typeof payload.userId !== "string" || !payload.userId) return null;
    return payload as MarketplaceJWTPayload;
  } catch {
    return null;
  }
}
