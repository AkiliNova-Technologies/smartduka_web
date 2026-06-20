import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { PlatformRole, VendorUserRole } from "@prisma/client";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret-use-env-in-prod");

export interface MarketplaceJWTPayload extends JWTPayload {
  userId: string;
  name: string;
  email: string;
  platformRole: PlatformRole | null; 
  vendorRole: VendorUserRole | null; 
  vendorId: string | null;          
}

/**
 * Encrypts identity profiles and multi-tenant keys into a secure JWT string.
 */
export async function createToken(payload: MarketplaceJWTPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

/**
 * Validates cryptographic signatures at the Edge and returns the typed payload context.
 */
export async function verifyToken(token: string): Promise<MarketplaceJWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as MarketplaceJWTPayload;
  } catch {
    return null;
  }
}