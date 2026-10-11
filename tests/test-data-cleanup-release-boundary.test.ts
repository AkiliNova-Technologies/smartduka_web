import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const providers = vi.hoisted(() => ({
  deleteUser: vi.fn(),
  getUser: vi.fn(),
  getSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/firebase/admin", () => ({
  adminAuth: { deleteUser: providers.deleteUser, getUser: providers.getUser },
}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: providers.getSupabaseServerClient,
}));

import { POST as runCleanupCron } from "@/app/api/cron/test-data-storage-cleanup/route";
import { isExternalCleanupExecutionEnabled, TestDataStorageCleanupService } from "@/services/test-data-storage-cleanup";

describe("test-data cleanup release boundary", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
    vi.stubEnv("TEST_DATA_ENVIRONMENT", "PRODUCTION");
    vi.stubEnv("ENABLE_TEST_DATA_EXTERNAL_CLEANUP", "true");
    vi.clearAllMocks();
  });

  afterEach(() => vi.unstubAllEnvs());

  it("cannot enable external cleanup in the production cleanup environment", () => {
    expect(isExternalCleanupExecutionEnabled()).toBe(false);
  });

  it("returns before either external provider can be reached", async () => {
    await expect(TestDataStorageCleanupService.processPending()).resolves.toMatchObject({ disabled: true });
    expect(providers.getSupabaseServerClient).not.toHaveBeenCalled();
    expect(providers.getUser).not.toHaveBeenCalled();
    expect(providers.deleteUser).not.toHaveBeenCalled();
  });

  it("blocks the authenticated cleanup cron server-side", async () => {
    const response = await runCleanupCron(new Request("https://mwezora.test/api/cron/test-data-storage-cleanup", {
      method: "POST",
      headers: { authorization: "Bearer test-cron-secret" },
    }));
    expect(response.status).toBe(503);
    expect(providers.getSupabaseServerClient).not.toHaveBeenCalled();
    expect(providers.deleteUser).not.toHaveBeenCalled();
  });
});
