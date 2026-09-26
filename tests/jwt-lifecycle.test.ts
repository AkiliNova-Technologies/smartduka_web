import { afterEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
import {
  createToken,
  JWTConfigurationError,
  verifyToken,
} from "@/lib/auth/jwt";

const originalSecret = process.env.JWT_SECRET;
const payload = {
  userId: "user-a",
  name: "A",
  email: "a@example.test",
  platformRole: "CUSTOMER" as const,
  vendorRole: null,
  vendorId: null,
};

afterEach(() => {
  if (originalSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalSecret;
  vi.unstubAllEnvs();
});

describe("marketplace JWT lifecycle", () => {
  it("rejects malformed, tampered, and expired JWTs", async () => {
    process.env.JWT_SECRET =
      "a-test-secret-that-is-long-enough-for-session-signing";
    const token = await createToken(payload);
    expect(await verifyToken(token)).toMatchObject({ userId: "user-a" });
    expect(await verifyToken(`${token}x`)).toBeNull();
    const expired = await new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(new TextEncoder().encode(process.env.JWT_SECRET));
    expect(await verifyToken(expired)).toBeNull();
  });

  it("does not permit the known fallback secret in production", async () => {
    delete process.env.JWT_SECRET;
    vi.stubEnv("NODE_ENV", "production");
    await expect(createToken(payload)).rejects.toBeInstanceOf(
      JWTConfigurationError,
    );
    await expect(verifyToken("malformed")).rejects.toBeInstanceOf(
      JWTConfigurationError,
    );
  });
});
