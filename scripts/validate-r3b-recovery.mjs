import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { createServer } from "node:net";

const bin = process.env.POSTGRES_BIN ?? "/usr/lib/postgresql/17/bin";
const cluster = mkdtempSync(join(tmpdir(), "mwezora-r3b-recovery-"));
const database = "mwezora_r3b_recovery";
const run = (command, args, options = {}) => { const result = spawnSync(command, args, { stdio: "inherit", ...options }); if (result.error) throw result.error; if (result.status !== 0) throw new Error(`${command} exited with ${result.status}`); };
const allocatePort = () => new Promise((resolve, reject) => { const server = createServer(); server.once("error", reject); server.listen(0, "127.0.0.1", () => { const address = server.address(); if (!address || typeof address === "string") return reject(new Error("Could not allocate port.")); server.close(error => error ? reject(error) : resolve(address.port)); }); });
const port = await allocatePort();
const url = `postgresql://postgres@127.0.0.1:${port}/${database}`;
const env = { ...process.env, DATABASE_URL: url, DIRECT_URL: url };
const psql = (...args) => run(`${bin}/psql`, ["-h", "127.0.0.1", "-p", String(port), "-U", "postgres", "-d", database, "-v", "ON_ERROR_STOP=1", ...args]);
let started = false;

try {
  run(`${bin}/initdb`, ["-D", cluster, "--username=postgres", "--auth=trust", "--no-locale", "--encoding=UTF8"]);
  run(`${bin}/pg_ctl`, ["-D", cluster, "-o", `-h 127.0.0.1 -k ${cluster} -p ${port}`, "-w", "start"]); started = true;
  run(`${bin}/createdb`, ["-h", "127.0.0.1", "-p", String(port), "-U", "postgres", database]);
  psql("-c", "CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE SCHEMA storage; CREATE TABLE storage.buckets (id text PRIMARY KEY, name text NOT NULL, public boolean NOT NULL DEFAULT false, file_size_limit bigint, allowed_mime_types text[]);");
  run("npx", ["prisma", "migrate", "deploy"], { env });
  const foreignKeys = [
    "SubscriptionBillingIntent_vendorId_fkey", "SubscriptionBillingIntent_requestedById_fkey", "SubscriptionBillingIntent_subscriptionId_fkey", "SubscriptionBillingIntent_lifecycleIntentId_fkey", "SubscriptionBillingIntent_planVersionId_fkey", "SubscriptionBillingIntent_revenueOrderId_fkey",
    "SubscriptionPaidPeriod_vendorId_fkey", "SubscriptionPaidPeriod_subscriptionId_fkey", "SubscriptionPaidPeriod_billingIntentId_fkey", "SubscriptionPaidPeriod_paymentIntentId_fkey", "SubscriptionPaidPeriod_planVersionId_fkey",
  ];
  const dropForeignKeys = foreignKeys.map(name => `ALTER TABLE ${name.startsWith("SubscriptionBillingIntent") ? '"SubscriptionBillingIntent"' : '"SubscriptionPaidPeriod"'} DROP CONSTRAINT "${name}";`).join(" ");
  psql("-c", `${dropForeignKeys} DROP INDEX "SubscriptionBillingIntent_lifecycleIntentId_createdAt_idx"; CREATE UNIQUE INDEX "SubscriptionBillingIntent_lifecycleIntentId_key" ON "SubscriptionBillingIntent"("lifecycleIntentId"); ALTER TABLE "SubscriptionBillingIntent" ALTER COLUMN "id" TYPE UUID USING "id"::uuid, ALTER COLUMN "vendorId" TYPE UUID USING "vendorId"::uuid, ALTER COLUMN "requestedById" TYPE UUID USING "requestedById"::uuid, ALTER COLUMN "subscriptionId" TYPE UUID USING "subscriptionId"::uuid, ALTER COLUMN "lifecycleIntentId" TYPE UUID USING "lifecycleIntentId"::uuid, ALTER COLUMN "planVersionId" TYPE UUID USING "planVersionId"::uuid, ALTER COLUMN "revenueOrderId" TYPE UUID USING "revenueOrderId"::uuid; ALTER TABLE "SubscriptionPaidPeriod" ALTER COLUMN "id" TYPE UUID USING "id"::uuid, ALTER COLUMN "vendorId" TYPE UUID USING "vendorId"::uuid, ALTER COLUMN "subscriptionId" TYPE UUID USING "subscriptionId"::uuid, ALTER COLUMN "billingIntentId" TYPE UUID USING "billingIntentId"::uuid, ALTER COLUMN "paymentIntentId" TYPE UUID USING "paymentIntentId"::uuid, ALTER COLUMN "planVersionId" TYPE UUID USING "planVersionId"::uuid; UPDATE "_prisma_migrations" SET finished_at=NULL, applied_steps_count=0, logs='simulated P3018', checksum='54d4b7f42b5002eb961ad111329f17f7919a5e0ce4a1b683e4c5df0834f67cd3' WHERE migration_name='20261018230000_verified_subscription_billing';`);
  psql("-f", "docs/revenue-engine/20261018230000-supabase-recovery.sql");
  run("npx", ["prisma", "migrate", "resolve", "--applied", "20261018230000_verified_subscription_billing"], { env });
  run("npx", ["prisma", "migrate", "status"], { env });
  psql("-c", "SELECT count(*) AS foreign_key_count FROM pg_constraint x JOIN pg_class c ON c.oid=x.conrelid WHERE x.contype='f' AND c.relname IN ('SubscriptionBillingIntent','SubscriptionPaidPeriod'); SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_name IN ('SubscriptionBillingIntent','SubscriptionPaidPeriod') AND column_name IN ('id','vendorId','subscriptionId','billingIntentId','paymentIntentId','planVersionId','requestedById','lifecycleIntentId','revenueOrderId') ORDER BY table_name,column_name;");
} finally {
  if (started) spawnSync(`${bin}/pg_ctl`, ["-D", cluster, "-m", "fast", "-w", "stop"], { stdio: "inherit" });
  rmSync(cluster, { recursive: true, force: true });
}
