import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ preview: vi.fn(), execute: vi.fn(), assertSameOrigin: vi.fn(), checkRateLimit: vi.fn(() => true) }));
vi.mock("@/services/test-data-cleanup", () => ({
  TestDataCleanupService: { preview: mocks.preview, execute: mocks.execute },
  TestDataCleanupError: class TestDataCleanupError extends Error { constructor(message: string, public code: string, public status = 400) { super(message); } },
}));
vi.mock("@/lib/auth/csrf", () => ({ assertSameOrigin: mocks.assertSameOrigin, CsrfValidationError: class CsrfValidationError extends Error {} }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: mocks.checkRateLimit }));
vi.mock("@/lib/auth/session", () => ({ AuthenticationRequiredError: class AuthenticationRequiredError extends Error {} }));
vi.mock("@/lib/auth/admin-context", () => ({ AdminAuthorizationError: class AdminAuthorizationError extends Error {} }));

import * as previewRoute from "@/app/api/admin/test-data-cleanup/preview/route";
import * as executeRoute from "@/app/api/admin/test-data-cleanup/execute/route";

function request(path: string, body: unknown) { return new Request(`http://smartduka.test${path}`, { method: "POST", headers: { "content-type": "application/json", origin: "http://smartduka.test" }, body: JSON.stringify(body) }); }

describe("test-data cleanup routes", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.checkRateLimit.mockReturnValue(true); });

  it("validates same-origin requests and accepts only supported cleanup scopes", async () => {
    mocks.preview.mockResolvedValue({ planId: "plan-1" });
    const response = await previewRoute.POST(request("/api/admin/test-data-cleanup/preview", { scope: "BATCH", scopeId: "batch-1" }));
    expect(response.status).toBe(200);
    expect(mocks.assertSameOrigin).toHaveBeenCalledOnce();
    expect(mocks.preview).toHaveBeenCalledWith({ scope: "BATCH", scopeId: "batch-1" });
    expect((await previewRoute.POST(request("/api/admin/test-data-cleanup/preview", { scope: "ARBITRARY" }))).status).toBe(400);
  });

  it("passes only the opaque plan id and exact confirmation to execution", async () => {
    mocks.execute.mockResolvedValue({ deletedTotal: 4 });
    const response = await executeRoute.POST(request("/api/admin/test-data-cleanup/execute", { planId: "plan-1", confirmation: "DELETE TEST DATA", entities: { User: ["forged"] } }));
    expect(response.status).toBe(200);
    expect(mocks.execute).toHaveBeenCalledWith({ planId: "plan-1", confirmation: "DELETE TEST DATA" });
  });
});
