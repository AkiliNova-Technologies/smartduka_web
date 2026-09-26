import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ set: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ set: mocks.set }) }));
vi.mock("@/lib/firebase/admin", () => ({ adminAuth: {} }));
vi.mock("@/lib/prisma/client", () => ({ prisma: {} }));

import { DELETE } from "@/app/api/auth/route";

describe("marketplace logout", () => {
  it("expires both current and legacy session cookie names on the root path", async () => {
    expect((await DELETE()).status).toBe(200);
    expect(mocks.set).toHaveBeenCalledWith(
      "session",
      "",
      expect.objectContaining({ maxAge: 0, path: "/", httpOnly: true }),
    );
    expect(mocks.set).toHaveBeenCalledWith(
      "marketplace_access_token",
      "",
      expect.objectContaining({ maxAge: 0, path: "/", httpOnly: true }),
    );
  });
});
