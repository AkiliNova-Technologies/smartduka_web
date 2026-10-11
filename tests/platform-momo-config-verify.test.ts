import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const script = resolve(process.cwd(), "scripts/platform-momo-config-verify.mjs");
const { auditPlatformMomoConfig, parseCliArguments, run } = await import(script);
const example = readFileSync(resolve(process.cwd(), ".env.example"), "utf8");
const base = `
PAYMENTS_MTN_ENABLED=false
MTN_MOMO_ENABLED=false
MTN_MOMO_ENVIRONMENT=sandbox
MTN_MOMO_BASE_URL=https://sandbox.momodeveloper.mtn.com
MTN_MOMO_COLLECTION_SUBSCRIPTION_KEY=marketplace-subscription-key
MTN_MOMO_API_USER=marketplace-user
MTN_MOMO_API_KEY=marketplace-api-key
MTN_MOMO_TARGET_ENVIRONMENT=sandbox
MTN_MOMO_CALLBACK_URL=
MTN_MOMO_CALLBACK_HOST=
MTN_MOMO_DIRECT_VENDOR_ROUTING_VERIFIED=false
MTN_DIRECT_VENDOR_ROUTING_VERIFIED=false
MTN_SANDBOX_COLLECTION_TESTING_ENABLED=false
MTN_SANDBOX_RECONCILIATION_QUALIFICATION_ENABLED=false
MTN_SANDBOX_TEST_MSISDN=
MTN_SANDBOX_TEST_CURRENCY=EUR
MTN_SANDBOX_TEST_AMOUNT=100
MTN_SANDBOX_TEST_USE_CALLBACK=false
MTN_MOMO_REAL_CALLBACK_DELIVERY_VERIFIED=false
PLATFORM_PAYMENTS_MTN_ENABLED=false
PLATFORM_MTN_ENVIRONMENT=sandbox
PLATFORM_MTN_BASE_URL=https://sandbox.momodeveloper.mtn.com
PLATFORM_MTN_COLLECTION_SUBSCRIPTION_KEY=platform-subscription-key
PLATFORM_MTN_API_USER=platform-user
PLATFORM_MTN_API_KEY=platform-api-key
PLATFORM_MTN_TARGET_ENVIRONMENT=sandbox
PLATFORM_MTN_MERCHANT_ID=merchant-id
PLATFORM_MTN_MERCHANT_CODE=merchant-code
PLATFORM_MTN_SANDBOX_TESTING_ENABLED=true
PLATFORM_MTN_SANDBOX_TEST_VENDOR_ID=vendor-id
PLATFORM_MTN_SANDBOX_TEST_MSISDN=256700000000
PLATFORM_MTN_SANDBOX_TEST_CURRENCY=EUR
PLATFORM_MTN_SANDBOX_TEST_AMOUNT=100
PLATFORM_MTN_LIVE_TEST_ENABLED=false
PLATFORM_MTN_LIVE_TEST_CONFIRM_REAL_MONEY=false
PLATFORM_MTN_LIVE_TEST_VENDOR_ID=live-vendor-id
PLATFORM_MTN_LIVE_TEST_QUALIFICATION_ID=550e8400-e29b-41d4-a716-446655440000
PLATFORM_MTN_LIVE_TEST_MSISDN=256700000001
PLATFORM_MTN_LIVE_TEST_CURRENCY=UGX
PLATFORM_MTN_LIVE_TEST_AMOUNT=500
PLATFORM_MTN_LIVE_TEST_CALLBACK_VERIFIED=false
PLATFORM_MTN_PRODUCTION_ENABLED=false
`;
const audit = (envText = base) => auditPlatformMomoConfig({ envText, exampleText: example });
const liveConfig = base
  .replace("PLATFORM_MTN_ENVIRONMENT=sandbox", "PLATFORM_MTN_ENVIRONMENT=production")
  .replace("PLATFORM_MTN_BASE_URL=https://sandbox.momodeveloper.mtn.com", "PLATFORM_MTN_BASE_URL=https://momodeveloper.mtn.com")
  .replace("PLATFORM_MTN_TARGET_ENVIRONMENT=sandbox", "PLATFORM_MTN_TARGET_ENVIRONMENT=production")
  .replace("PLATFORM_MTN_SANDBOX_TESTING_ENABLED=true", "PLATFORM_MTN_SANDBOX_TESTING_ENABLED=false");
const files = (entries: Record<string, string>) => (path: string) => {
  if (!(path in entries)) throw new Error(`Missing fixture: ${path}`);
  return entries[path];
};

describe("platform MTN configuration verifier", () => {
  it("reports a complete sandbox configuration without arming live payments", () => {
    const result = audit();
    expect(result.exitCode).toBe(0);
    expect(result.lines).toContain("Platform sandbox readiness: READY");
    expect(result.lines).toContain("Live test currently armed: NO");
  });
  it("reports a missing sandbox credential as a readiness blocker", () => {
    const result = audit(base.replace("PLATFORM_MTN_API_KEY=platform-api-key", "PLATFORM_MTN_API_KEY="));
    expect(result.exitCode).toBe(1);
    expect(result.lines).toContain("Platform sandbox readiness: NOT READY");
    expect(result.lines.join("\n")).toContain("PLATFORM_MTN_API_KEY");
  });
  it("detects mixed production and sandbox configuration as unsafe", () => {
    const result = audit(base.replace("PLATFORM_MTN_ENVIRONMENT=sandbox", "PLATFORM_MTN_ENVIRONMENT=production"));
    expect(result.exitCode).toBe(2);
    expect(result.lines).toContain("Environment consistency: FAIL");
  });
  it("detects duplicate environment keys", () => {
    const result = audit(`${base}\nPLATFORM_MTN_API_USER=duplicate`);
    expect(result.exitCode).toBe(1);
    expect(result.lines.join("\n")).toContain("Duplicate env keys: PLATFORM_MTN_API_USER");
  });
  it("does not disclose secrets and flags a placeholder payer", () => {
    const secret = "actual-secret-must-not-appear";
    const result = audit(base.replace("platform-api-key", secret).replace("256700000001", "123456789012"));
    expect(result.lines.join("\n")).not.toContain(secret);
    expect(result.lines).toContain("PLATFORM_MTN_LIVE_TEST_MSISDN: PLACEHOLDER");
  });
  it("accepts a real-looking Uganda MSISDN without printing it", () => {
    const result = audit();
    expect(result.lines).toContain("PLATFORM_MTN_LIVE_TEST_MSISDN: SET");
    expect(result.lines.join("\n")).not.toContain("256700000001");
  });
  it("rejects an invalid live qualification UUID", () => {
    const result = audit(base.replace("550e8400-e29b-41d4-a716-446655440000", "not-a-uuid"));
    expect(result.lines).toContain("Qualification ID: INVALID");
  });
  it("reports complete live configuration without arming the test", () => {
    const result = audit(liveConfig);
    expect(result.exitCode).toBe(0);
    expect(result.lines).toContain("Platform sandbox readiness: NOT APPLICABLE");
    expect(result.lines).toContain("Live configuration readiness: READY");
    expect(result.lines).toContain("Live test currently armed: NO");
  });
  it("treats an enabled production gate as unsafe", () => {
    const result = audit(base.replace("PLATFORM_MTN_PRODUCTION_ENABLED=false", "PLATFORM_MTN_PRODUCTION_ENABLED=true"));
    expect(result.exitCode).toBe(2);
    expect(result.lines).toContain("General platform production charging: ENABLED");
  });
  it("uses .env by default and reports the selected file", () => {
    const logs: string[] = [];
    const exitCode = run({ readFile: files({ ".env": base, ".env.example": example }), log: (line: string) => logs.push(line) });
    expect(exitCode).toBe(0);
    expect(logs).toContain("Configuration file: .env");
  });
  it("uses --env-file for the live file without falling back to .env", () => {
    const logs: string[] = [];
    const exitCode = run({
      envPath: parseCliArguments(["--env-file=.env.platform-live"]).envPath,
      readFile: files({ ".env": `${base}\nPLATFORM_MTN_API_USER=duplicate`, ".env.platform-live": liveConfig, ".env.example": example }),
      log: (line: string) => logs.push(line),
    });
    expect(exitCode).toBe(0);
    expect(logs).toContain("Configuration file: .env.platform-live");
    expect(logs).toContain("Platform sandbox readiness: NOT APPLICABLE");
    expect(logs).toContain("Duplicate env keys: NONE");
  });
  it("detects duplicate keys in the selected file", () => {
    const logs: string[] = [];
    const exitCode = run({
      envPath: ".env.platform-live",
      readFile: files({ ".env": base, ".env.platform-live": `${liveConfig}\nPLATFORM_MTN_API_USER=duplicate`, ".env.example": example }),
      log: (line: string) => logs.push(line),
    });
    expect(exitCode).toBe(1);
    expect(logs.join("\n")).toContain("Duplicate env keys: PLATFORM_MTN_API_USER");
  });
});
