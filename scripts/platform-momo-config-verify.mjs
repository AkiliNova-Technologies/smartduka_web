/**
 * Read-only MTN configuration audit. This script deliberately makes no network
 * requests and does not import Prisma or any payment service.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// These names are derived from the marketplace MTN provider, platform payment
// service, and the sandbox/live qualification scripts.
const marketplaceFields = [
  "PAYMENTS_MTN_ENABLED",
  "MTN_MOMO_ENABLED",
  "MTN_MOMO_ENVIRONMENT",
  "MTN_MOMO_BASE_URL",
  "MTN_MOMO_COLLECTION_SUBSCRIPTION_KEY",
  "MTN_MOMO_API_USER",
  "MTN_MOMO_API_KEY",
  "MTN_MOMO_TARGET_ENVIRONMENT",
  "MTN_MOMO_CALLBACK_URL",
  "MTN_MOMO_CALLBACK_HOST",
  "MTN_MOMO_DIRECT_VENDOR_ROUTING_VERIFIED",
  "MTN_DIRECT_VENDOR_ROUTING_VERIFIED",
  "MTN_SANDBOX_COLLECTION_TESTING_ENABLED",
  "MTN_SANDBOX_RECONCILIATION_QUALIFICATION_ENABLED",
  "MTN_SANDBOX_TEST_MSISDN",
  "MTN_SANDBOX_TEST_CURRENCY",
  "MTN_SANDBOX_TEST_AMOUNT",
  "MTN_SANDBOX_TEST_USE_CALLBACK",
  "MTN_MOMO_REAL_CALLBACK_DELIVERY_VERIFIED",
];
const platformFields = [
  "PLATFORM_PAYMENTS_MTN_ENABLED",
  "PLATFORM_MTN_ENVIRONMENT",
  "PLATFORM_MTN_BASE_URL",
  "PLATFORM_MTN_COLLECTION_SUBSCRIPTION_KEY",
  "PLATFORM_MTN_API_USER",
  "PLATFORM_MTN_API_KEY",
  "PLATFORM_MTN_TARGET_ENVIRONMENT",
  "PLATFORM_MTN_MERCHANT_ID",
  "PLATFORM_MTN_MERCHANT_CODE",
  "PLATFORM_MTN_SANDBOX_TESTING_ENABLED",
  "PLATFORM_MTN_SANDBOX_TEST_VENDOR_ID",
  "PLATFORM_MTN_SANDBOX_TEST_MSISDN",
  "PLATFORM_MTN_SANDBOX_TEST_CURRENCY",
  "PLATFORM_MTN_SANDBOX_TEST_AMOUNT",
  "PLATFORM_MTN_LIVE_TEST_ENABLED",
  "PLATFORM_MTN_LIVE_TEST_CONFIRM_REAL_MONEY",
  "PLATFORM_MTN_LIVE_TEST_VENDOR_ID",
  "PLATFORM_MTN_LIVE_TEST_QUALIFICATION_ID",
  "PLATFORM_MTN_LIVE_TEST_MSISDN",
  "PLATFORM_MTN_LIVE_TEST_CURRENCY",
  "PLATFORM_MTN_LIVE_TEST_AMOUNT",
  "PLATFORM_MTN_LIVE_TEST_CALLBACK_VERIFIED",
  "PLATFORM_MTN_PRODUCTION_ENABLED",
];
const contractFields = [...marketplaceFields, ...platformFields];
const secretFields = new Set([
  "MTN_MOMO_COLLECTION_SUBSCRIPTION_KEY",
  "MTN_MOMO_API_KEY",
  "PLATFORM_MTN_COLLECTION_SUBSCRIPTION_KEY",
  "PLATFORM_MTN_API_KEY",
]);
const liveFields = [
  "PLATFORM_MTN_BASE_URL",
  "PLATFORM_MTN_COLLECTION_SUBSCRIPTION_KEY",
  "PLATFORM_MTN_API_USER",
  "PLATFORM_MTN_API_KEY",
  "PLATFORM_MTN_MERCHANT_CODE",
  "PLATFORM_MTN_LIVE_TEST_VENDOR_ID",
  "PLATFORM_MTN_LIVE_TEST_QUALIFICATION_ID",
  "PLATFORM_MTN_LIVE_TEST_MSISDN",
  "PLATFORM_MTN_LIVE_TEST_CURRENCY",
  "PLATFORM_MTN_LIVE_TEST_AMOUNT",
];
const sandboxFields = [
  "PLATFORM_MTN_BASE_URL",
  "PLATFORM_MTN_COLLECTION_SUBSCRIPTION_KEY",
  "PLATFORM_MTN_API_USER",
  "PLATFORM_MTN_API_KEY",
  "PLATFORM_MTN_MERCHANT_CODE",
  "PLATFORM_MTN_SANDBOX_TEST_VENDOR_ID",
  "PLATFORM_MTN_SANDBOX_TEST_MSISDN",
  "PLATFORM_MTN_SANDBOX_TEST_CURRENCY",
  "PLATFORM_MTN_SANDBOX_TEST_AMOUNT",
];

export function parseEnv(text) {
  const values = new Map();
  const duplicates = new Set();
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (values.has(key)) duplicates.add(key);
    const value = rawValue
      .replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/, "$1$2")
      .trim();
    values.set(key, value);
  }
  return { values, duplicates: [...duplicates].sort() };
}

const isSet = (values, key) => Boolean(values.get(key)?.trim());
const isTrue = (values, key) => values.get(key)?.toLowerCase() === "true";
const state = (values, key) =>
  !values.has(key) ? "MISSING" : isSet(values, key) ? "SET" : "EMPTY";
const placeholder = (value) =>
  /(?:^|[-_\s])(test|example)(?:$|[-_\s])|changeme|your[-_]?key|123456789012/i.test(
    value ?? "",
  );
const urlKind = (value) =>
  /sandbox\.momodeveloper\.mtn\.com/i.test(value ?? "")
    ? "sandbox"
    : /momodeveloper\.mtn\.com/i.test(value ?? "")
      ? "production"
      : "unknown";
const uuidV4 = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value ?? "",
  );

export function auditPlatformMomoConfig({
  envText,
  exampleText,
  configurationFile = ".env",
}) {
  const env = parseEnv(envText);
  const example = parseEnv(exampleText);
  const lines = [
    "SmartDuka MTN Configuration Audit",
    `Configuration file: ${configurationFile}`,
    "",
    "Environment Contract",
  ];
  const errors = [];
  const unsafe = [];
  const missingExample = contractFields.filter(
    (key) => !example.values.has(key),
  );
  lines.push(
    `.env.example coverage: ${missingExample.length ? "FAIL" : "PASS"}`,
  );
  if (missingExample.length)
    errors.push(`Missing from .env.example: ${missingExample.join(", ")}`);
  lines.push(
    `Duplicate env keys: ${env.duplicates.length ? env.duplicates.join(", ") : "NONE"}`,
  );
  if (env.duplicates.length) errors.push("Duplicate environment keys found.");

  lines.push("", "Marketplace MTN");
  for (const key of marketplaceFields)
    lines.push(`${key}: ${state(env.values, key)}`);
  const marketplaceRouting =
    isTrue(env.values, "MTN_MOMO_DIRECT_VENDOR_ROUTING_VERIFIED") ||
    isTrue(env.values, "MTN_DIRECT_VENDOR_ROUTING_VERIFIED");
  lines.push(
    `Marketplace direct vendor routing: ${marketplaceRouting ? "VERIFIED" : "UNVERIFIED"}`,
  );

  const platformEnvironment = env.values.get("PLATFORM_MTN_ENVIRONMENT") ?? "";
  const platformUrl = env.values.get("PLATFORM_MTN_BASE_URL") ?? "";
  const target = env.values.get("PLATFORM_MTN_TARGET_ENVIRONMENT") ?? "";
  const liveEnabled = isTrue(env.values, "PLATFORM_MTN_LIVE_TEST_ENABLED");
  const productionEnabled = isTrue(
    env.values,
    "PLATFORM_MTN_PRODUCTION_ENABLED",
  );
  const sandboxEnabled = isTrue(
    env.values,
    "PLATFORM_MTN_SANDBOX_TESTING_ENABLED",
  );
  const realMoneyConfirmed = isTrue(
    env.values,
    "PLATFORM_MTN_LIVE_TEST_CONFIRM_REAL_MONEY",
  );
  const mixed =
    (platformEnvironment === "production" &&
      (urlKind(platformUrl) === "sandbox" || target === "sandbox")) ||
    (platformEnvironment === "sandbox" &&
      (liveEnabled ||
        target === "production" ||
        urlKind(platformUrl) === "production"));
  lines.push("", `Environment consistency: ${mixed ? "FAIL" : "PASS"}`);
  if (mixed) unsafe.push("Mixed sandbox/production platform configuration.");
  if (productionEnabled)
    unsafe.push("PLATFORM_MTN_PRODUCTION_ENABLED is true.");

  lines.push("", "Platform Sandbox");
  if (platformEnvironment === "production") {
    lines.push("Platform sandbox readiness: NOT APPLICABLE");
  } else {
    for (const key of sandboxFields)
      lines.push(
        `${key}: ${secretFields.has(key) ? (isSet(env.values, key) ? "SET" : "MISSING") : state(env.values, key)}`,
      );
    lines.push(`Sandbox gate: ${sandboxEnabled ? "ENABLED" : "DISABLED"}`);
    const sandboxBlockers = [
      ...(platformEnvironment === "sandbox"
        ? []
        : ["PLATFORM_MTN_ENVIRONMENT must be sandbox"]),
      ...(urlKind(platformUrl) === "sandbox" ? [] : ["sandbox base URL"]),
      ...(target === "sandbox"
        ? []
        : ["PLATFORM_MTN_TARGET_ENVIRONMENT=sandbox"]),
      ...sandboxFields.filter((key) => !isSet(env.values, key)),
      ...(env.values.get("PLATFORM_MTN_SANDBOX_TEST_CURRENCY") === "EUR"
        ? []
        : ["PLATFORM_MTN_SANDBOX_TEST_CURRENCY=EUR"]),
      ...(sandboxEnabled ? [] : ["PLATFORM_MTN_SANDBOX_TESTING_ENABLED=true"]),
    ];
    lines.push(
      `Platform sandbox readiness: ${sandboxBlockers.length ? "NOT READY" : "READY"}`,
    );
    if (sandboxBlockers.length)
      lines.push(`Sandbox blockers: ${sandboxBlockers.join(", ")}`);
    if (sandboxEnabled && sandboxBlockers.length)
      errors.push("Enabled sandbox qualification is incomplete.");
  }

  lines.push("", "Controlled Live Test");
  for (const key of liveFields)
    lines.push(
      `${key}: ${secretFields.has(key) ? (isSet(env.values, key) ? "SET" : "MISSING") : state(env.values, key)}`,
    );
  const qualificationId =
    env.values.get("PLATFORM_MTN_LIVE_TEST_QUALIFICATION_ID") ?? "";
  lines.push(
    `Qualification ID: ${!qualificationId ? "MISSING" : uuidV4(qualificationId) ? "VALID" : "INVALID"}`,
  );
  const msisdn = env.values.get("PLATFORM_MTN_LIVE_TEST_MSISDN") ?? "";
  if (msisdn)
    lines.push(
      `PLATFORM_MTN_LIVE_TEST_MSISDN: ${placeholder(msisdn) ? "PLACEHOLDER" : "SET"}`,
    );
  const liveBlockers = [
    ...(platformEnvironment === "production" && platformUrl && urlKind(platformUrl) !== "sandbox"
      ? []
      : ["production platform base URL"]),
    ...liveFields.filter((key) => !isSet(env.values, key)),
    ...(env.values.get("PLATFORM_MTN_LIVE_TEST_CURRENCY") === "UGX"
      ? []
      : ["PLATFORM_MTN_LIVE_TEST_CURRENCY=UGX"]),
    ...(uuidV4(qualificationId) ? [] : ["valid UUID v4 qualification ID"]),
    ...(placeholder(msisdn) ? ["non-placeholder live MSISDN"] : []),
  ];
  lines.push(
    `Live configuration readiness: ${liveBlockers.length ? "NOT READY" : "READY"}`,
  );
  if (liveBlockers.length)
    lines.push(`Live blockers: ${liveBlockers.join(", ")}`);
  lines.push(
    `Live test currently armed: ${liveEnabled && realMoneyConfirmed && !productionEnabled ? "YES" : "NO"}`,
  );
  lines.push(`Live-test gate: ${liveEnabled ? "ENABLED" : "DISABLED"}`);
  lines.push(
    `Real-money confirmation: ${realMoneyConfirmed ? "ENABLED" : "DISABLED"}`,
  );
  if (liveEnabled && realMoneyConfirmed && liveBlockers.length)
    errors.push("Armed controlled live test is incomplete.");

  lines.push("", "Merchant Field Audit");
  lines.push(
    "PLATFORM_MTN_MERCHANT_ID: referenced by platform payment service",
  );
  lines.push(
    "PLATFORM_MTN_MERCHANT_CODE: required by platform sandbox/live qualification scripts",
  );

  lines.push("", "Production Safety");
  lines.push(
    `General platform production charging: ${productionEnabled ? "ENABLED" : "DISABLED"}`,
  );
  lines.push(
    `Overall configuration state: ${unsafe.length ? "UNSAFE" : errors.length ? "INVALID" : "SAFE"}`,
  );
  return {
    lines,
    errors,
    unsafe,
    exitCode: unsafe.length ? 2 : errors.length ? 1 : 0,
  };
}

export function run({
  envPath = ".env",
  examplePath = ".env.example",
  readFile = readFileSync,
  log = console.log,
} = {}) {
  let envText;
  let exampleText;
  try {
    envText = readFile(envPath, "utf8");
  } catch {
    envText = "";
  }
  try {
    exampleText = readFile(examplePath, "utf8");
  } catch {
    exampleText = "";
  }
  const result = auditPlatformMomoConfig({
    envText,
    exampleText,
    configurationFile: envPath,
  });
  for (const line of result.lines) log(line);
  for (const error of [...result.errors, ...result.unsafe])
    log(`WARNING: ${error}`);
  return result.exitCode;
}

export function parseCliArguments(args) {
  if (args.length === 0) return { envPath: ".env" };
  if (args.length === 1 && args[0].startsWith("--env-file=")) {
    const envPath = args[0].slice("--env-file=".length);
    if (envPath) return { envPath };
  }
  if (args.length === 2 && args[0] === "--env-file" && args[1]) {
    return { envPath: args[1] };
  }
  throw new Error("Usage: node scripts/platform-momo-config-verify.mjs [--env-file=.env]");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    process.exitCode = run(parseCliArguments(process.argv.slice(2)));
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Invalid arguments.");
    process.exitCode = 1;
  }
}
