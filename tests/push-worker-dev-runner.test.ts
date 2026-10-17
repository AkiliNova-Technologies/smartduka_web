import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("development push worker runner", () => {
  it("uses only the existing bounded push outbox worker", () => {
    const source = read("scripts/run-push-worker-dev.mts");
    expect(source).toContain("PushDeliveryOutboxService.run()");
    expect(source).not.toContain("PlatformPaymentReconciliationService");
    expect(source).not.toContain("PromotionCampaignScheduler");
    expect(source).not.toContain("setInterval");
    expect(source).toContain("claimed: result.claimed");
    expect(source).toContain("accepted: result.delivered");
  });

  it("refuses production and keeps errors sanitized", () => {
    const source = read("scripts/run-push-worker-dev.mts");
    expect(source).toContain("NODE_ENV");
    expect(source).toContain("VERCEL_ENV");
    expect(source).toContain('includes("production")');
    expect(source).toContain("Refusing to run outside a development environment");
    expect(source).toContain("Never print transport errors");
    expect(source).not.toContain("console.error(error");
  });

  it("exposes the runner as an explicit npm command", () => {
    const packageJson = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
    expect(packageJson.scripts["push:worker:dev"]).toContain("run-push-worker-dev.mts");
  });
});
