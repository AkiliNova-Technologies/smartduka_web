import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireActiveUserId: vi.fn(),
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
}));

vi.mock("@/lib/auth/session", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/session")>(
    "@/lib/auth/session",
  );
  return { ...actual, requireActiveUserId: mocks.requireActiveUserId };
});

vi.mock("@/services/settings", async () => {
  const actual = await vi.importActual<typeof import("@/services/settings")>(
    "@/services/settings",
  );
  return {
    ...actual,
    SettingsService: {
      getSettings: mocks.getSettings,
      updateSettings: mocks.updateSettings,
    },
  };
});

import {
  AccountInactiveError,
  AuthenticationRequiredError,
} from "@/lib/auth/session";
import { GET, PATCH } from "@/app/api/v1/preferences/appearance/route";

const appearance = {
  themeMode: "dark",
  accentColor: "plum",
  personality: "ELEGANT",
};

const patchRequest = (body: unknown = { accentColor: "plum" }) =>
  new Request("https://smartduka.test/api/v1/preferences/appearance", {
    method: "PATCH",
    headers: {
      authorization: "Bearer firebase-id-token",
      "content-type": "application/json",
      "x-marketplace-user-id": "forged-user",
    },
    body: JSON.stringify(body),
  });

describe("V1 appearance preference route authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireActiveUserId.mockResolvedValue("user-a");
    mocks.getSettings.mockResolvedValue(appearance);
    mocks.updateSettings.mockResolvedValue(appearance);
  });

  it("GET uses the active Firebase-resolved account and returns private data", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    await expect(response.json()).resolves.toEqual({ data: appearance });
    expect(mocks.getSettings).toHaveBeenCalledWith("user-a");
  });

  it("PATCH scopes partial updates to the active account and preserves personality", async () => {
    const response = await PATCH(patchRequest());

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.updateSettings).toHaveBeenCalledWith("user-a", {
      accentColor: "plum",
    });
    expect(mocks.updateSettings.mock.calls[0]?.[1]).not.toHaveProperty(
      "personality",
    );
  });

  it.each([
    ["GET", () => GET()],
    ["PATCH", () => PATCH(patchRequest({ themeMode: "dark" }))],
  ])("returns 401 when %s receives invalid native credentials", async (_, call) => {
    mocks.requireActiveUserId.mockRejectedValue(
      new AuthenticationRequiredError("Invalid Firebase token"),
    );

    const response = await call();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "UNAUTHENTICATED",
        message: "Authentication is required.",
      },
    });
    expect(mocks.getSettings).not.toHaveBeenCalled();
    expect(mocks.updateSettings).not.toHaveBeenCalled();
  });

  it.each([
    ["GET", () => GET()],
    ["PATCH", () => PATCH(patchRequest({ themeMode: "light" }))],
  ])("returns 403 when %s resolves an inactive account", async (_, call) => {
    mocks.requireActiveUserId.mockRejectedValue(
      new AccountInactiveError("Inactive account"),
    );

    const response = await call();

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: { code: "FORBIDDEN", message: "This account is inactive." },
    });
    expect(mocks.getSettings).not.toHaveBeenCalled();
    expect(mocks.updateSettings).not.toHaveBeenCalled();
  });

  it("rejects unsupported appearance fields before performing a write", async () => {
    const response = await PATCH(patchRequest({ accentColor: "plum", userId: "user-b" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "VALIDATION_ERROR" },
    });
    expect(mocks.requireActiveUserId).not.toHaveBeenCalled();
    expect(mocks.updateSettings).not.toHaveBeenCalled();
  });
});
