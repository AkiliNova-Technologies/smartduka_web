import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { randomBytes } from "node:crypto";
import webpush from "web-push";

const postgresBin = process.env.POSTGRES_BIN ?? "/usr/lib/postgresql/17/bin";
const cluster = mkdtempSync(join(tmpdir(), "mwezora-customer-orders-postgres-"));
const database = "mwezora_customer_orders_tests";
const browserAcceptance = process.argv.includes("--browser");
const vendorEntitlementAcceptance = process.argv.includes("--vendor-entitlements");
const firebaseProject = "demo-mwezora-acceptance";
const browserPassword = "Acceptance-only-password-2026";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited with status ${result.status}.`);
}

function availablePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") return reject(new Error("Could not allocate a local PostgreSQL port."));
      server.close((error) => error ? reject(error) : resolve(address.port));
    });
  });
}

const port = await availablePort();
const firebasePort = await availablePort();
const appPort = await availablePort();
const firebaseHost = `127.0.0.1:${firebasePort}`;
const appOrigin = `http://127.0.0.1:${appPort}`;
const firebaseConfigPath = join(cluster, "firebase.acceptance.json");
const nextDistDir = ".next-acceptance";
const databaseUrl = `postgresql://postgres@127.0.0.1:${port}/${database}`;
const resolved = new URL(databaseUrl);
const vapid = webpush.generateVAPIDKeys();
if (resolved.hostname !== "127.0.0.1" || resolved.pathname !== `/${database}`) {
  throw new Error("Refusing to run customer-order acceptance outside its disposable loopback database.");
}
const environment = {
  ...process.env,
  DATABASE_URL: databaseUrl,
  DIRECT_URL: databaseUrl,
  CUSTOMER_ORDERS_TEST_DATABASE: "isolated-local",
  RUN_CUSTOMER_ORDERS_DB_TESTS: "1",
  PAYMENTS_MTN_ENABLED: "true",
  PAYMENTS_AIRTEL_ENABLED: "false",
  PAYMENTS_PESAPAL_ENABLED: "false",
  WEB_PUSH_ENABLED: "true",
  WEB_PUSH_VAPID_PUBLIC_KEY: vapid.publicKey,
  WEB_PUSH_VAPID_PRIVATE_KEY: vapid.privateKey,
  WEB_PUSH_VAPID_SUBJECT: "mailto:acceptance@mwezora.test",
  WEB_PUSH_SUBSCRIPTION_ENCRYPTION_KEY: randomBytes(32).toString("base64"),
};

async function waitFor(url, label, attempts = 120) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try { if ((await fetch(url)).status < 500) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`${label} did not become ready.`);
}

function start(command, args, env) {
  return spawn(command, args, { env, stdio: "inherit", detached: true });
}

function stop(child) {
  if (!child?.pid || child.exitCode !== null) return;
  try { process.kill(-child.pid, "SIGTERM"); } catch {}
}

let started = false;
let firebaseProcess;
let appProcess;
try {
  console.log(`Customer-order acceptance target: host=${resolved.hostname} port=${port} database=${database} environment=isolated-local`);
  run(`${postgresBin}/initdb`, ["-D", cluster, "--username=postgres", "--auth=trust", "--no-locale", "--encoding=UTF8"]);
  run(`${postgresBin}/pg_ctl`, ["-D", cluster, "-o", `-h 127.0.0.1 -k ${cluster} -p ${port}`, "-w", "start"]);
  started = true;
  run(`${postgresBin}/createdb`, ["-h", "127.0.0.1", "-p", String(port), "-U", "postgres", database]);
  run(`${postgresBin}/psql`, ["-h", "127.0.0.1", "-p", String(port), "-U", "postgres", "-d", database, "-v", "ON_ERROR_STOP=1", "-c", "CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE SCHEMA storage; CREATE TABLE storage.buckets (id text PRIMARY KEY, name text NOT NULL, public boolean NOT NULL DEFAULT false, file_size_limit bigint, allowed_mime_types text[]);"]);
  run("npx", ["prisma", "migrate", "deploy"], { env: environment });
  run("npx", ["vitest", "run", "tests/customer-orders-db.integration.test.ts", "tests/announcement-push-db.integration.test.ts"], { env: environment });
  if (vendorEntitlementAcceptance) run("npx", ["vitest", "run", "tests/vendor-entitlement-browser-fixture.integration.test.ts"], { env: { ...environment, RUN_VENDOR_ENTITLEMENT_BROWSER_ACCEPTANCE: "1" } });
  run("npx", ["vitest", "run", "tests/marketing-push-db.integration.test.ts"], { env: environment });
  if (browserAcceptance) {
    rmSync(join(process.cwd(), nextDistDir), { recursive: true, force: true });
    if (!process.env.CUSTOMER_ORDERS_PLAYWRIGHT_GREP) {
      rmSync(join(process.cwd(), "artifacts", "customer-orders-acceptance"), { recursive: true, force: true });
    }
    const browserEnvironment = {
      ...environment,
      NODE_ENV: "development",
      NEXT_DIST_DIR: nextDistDir,
      JWT_SECRET: "isolated-browser-acceptance-secret-at-least-32-characters",
      NEXT_PUBLIC_APP_URL: appOrigin,
      FIREBASE_PROJECT_ID: firebaseProject,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: firebaseProject,
      FIREBASE_AUTH_EMULATOR_HOST: firebaseHost,
      NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: firebaseHost,
      FIREBASE_CLIENT_EMAIL: "",
      FIREBASE_PRIVATE_KEY: "",
      NEXT_PUBLIC_FIREBASE_API_KEY: "demo-api-key",
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: `${firebaseProject}.firebaseapp.com`,
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: `${firebaseProject}.firebasestorage.app`,
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "000000000000",
      NEXT_PUBLIC_FIREBASE_APP_ID: "1:000000000000:web:acceptance",
      RUN_CUSTOMER_ORDERS_BROWSER_ACCEPTANCE: "1",
      RUN_VENDOR_ENTITLEMENT_BROWSER_ACCEPTANCE: vendorEntitlementAcceptance ? "1" : "0",
      VENDOR_QUOTA_ENFORCEMENT_ENABLED: vendorEntitlementAcceptance ? "true" : "false",
      CUSTOMER_ORDERS_BROWSER_BASE_URL: appOrigin,
      CUSTOMER_ORDERS_BROWSER_PASSWORD: browserPassword,
      FIREBASE_CLI_DISABLE_UPDATE_CHECK: "true",
    };
    writeFileSync(firebaseConfigPath, JSON.stringify({ emulators: { auth: { host: "127.0.0.1", port: firebasePort }, ui: { enabled: false } } }));
    firebaseProcess = start("firebase", ["emulators:start", "--only", "auth", "--project", firebaseProject, "--config", firebaseConfigPath, "--log-verbosity", "QUIET"], browserEnvironment);
    await waitFor(`http://${firebaseHost}/emulator/v1/projects/${firebaseProject}/config`, "Firebase Auth Emulator");
    process.env.FIREBASE_AUTH_EMULATOR_HOST = firebaseHost;
    process.env.GCLOUD_PROJECT = firebaseProject;
    const { initializeApp, deleteApp } = await import("firebase-admin/app");
    const { getAuth } = await import("firebase-admin/auth");
    const seederApp = initializeApp({ projectId: firebaseProject }, "acceptance-identity-seeder");
    const emulatorAuth = getAuth(seederApp);
    const existingUsers = await emulatorAuth.listUsers();
    if (existingUsers.users.length) await emulatorAuth.deleteUsers(existingUsers.users.map((user) => user.uid));
    for (const [uid, email, displayName] of [["firebase-customer-a", "customer-a@orders.test", "Acceptance Customer A"], ["firebase-customer-b", "customer-b@orders.test", "Acceptance Customer B"], ["firebase-marketing-admin", "marketing-admin@orders.test", "Marketing Acceptance Admin"], ["vendor-owner-a", "vendor-1@orders.test", "Fixture Vendor 1"], ["vendor-owner-b", "vendor-2@orders.test", "Fixture Vendor 2"]]) {
      await emulatorAuth.createUser({ uid, email, displayName, password: browserPassword, emailVerified: true });
    }
    await deleteApp(seederApp);
    appProcess = start("npm", ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", String(appPort)], browserEnvironment);
    await waitFor(`${appOrigin}/login`, "isolated Next.js application", 180);
    const playwrightArgs = ["playwright", "test", "tests/browser/customer-orders.acceptance.spec.ts", "tests/browser/marketing-push.acceptance.spec.ts"];
    if (vendorEntitlementAcceptance) playwrightArgs.push("tests/browser/vendor-entitlements.acceptance.spec.ts");
    if (process.env.CUSTOMER_ORDERS_PLAYWRIGHT_GREP) playwrightArgs.push("--grep", process.env.CUSTOMER_ORDERS_PLAYWRIGHT_GREP);
    if (process.env.CUSTOMER_ORDERS_PLAYWRIGHT_PROJECT) playwrightArgs.push("--project", process.env.CUSTOMER_ORDERS_PLAYWRIGHT_PROJECT);
    run("npx", playwrightArgs, { env: browserEnvironment });
  }
} finally {
  stop(appProcess);
  stop(firebaseProcess);
  if (started) spawnSync(`${postgresBin}/pg_ctl`, ["-D", cluster, "-m", "fast", "-w", "stop"], { stdio: "inherit" });
  rmSync(join(process.cwd(), nextDistDir), { recursive: true, force: true });
  rmSync(cluster, { recursive: true, force: true });
}
