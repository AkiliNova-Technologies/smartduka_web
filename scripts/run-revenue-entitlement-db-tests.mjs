import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { createServer } from "node:net";

const postgresBin = process.env.POSTGRES_BIN ?? "/usr/lib/postgresql/17/bin";
const cluster = mkdtempSync(join(tmpdir(), "mwezora-revenue-entitlement-postgres-"));
const database = "mwezora_revenue_entitlement_tests";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited with status ${result.status}.`);
}

function port() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") return reject(new Error("Could not allocate a local PostgreSQL port."));
      server.close((error) => (error ? reject(error) : resolve(address.port)));
    });
  });
}

const selectedPort = await port();
const databaseUrl = `postgresql://postgres@127.0.0.1:${selectedPort}/${database}`;
const environment = {
  ...process.env,
  DATABASE_URL: databaseUrl,
  DIRECT_URL: databaseUrl,
  RUN_REVENUE_ENTITLEMENT_DB_TESTS: "1",
  REVENUE_ENTITLEMENT_TEST_DATABASE: "isolated-local",
};
let started = false;

try {
  run(`${postgresBin}/initdb`, ["-D", cluster, "--username=postgres", "--auth=trust", "--no-locale", "--encoding=UTF8"]);
  run(`${postgresBin}/pg_ctl`, ["-D", cluster, "-o", `-h 127.0.0.1 -k ${cluster} -p ${selectedPort}`, "-w", "start"]);
  started = true;
  run(`${postgresBin}/createdb`, ["-h", "127.0.0.1", "-p", String(selectedPort), "-U", "postgres", database]);
  run(`${postgresBin}/psql`, ["-h", "127.0.0.1", "-p", String(selectedPort), "-U", "postgres", "-d", database, "-v", "ON_ERROR_STOP=1", "-c", "CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE SCHEMA storage; CREATE TABLE storage.buckets (id text PRIMARY KEY, name text NOT NULL, public boolean NOT NULL DEFAULT false, file_size_limit bigint, allowed_mime_types text[]);"]);
  run("npx", ["prisma", "migrate", "deploy"], { env: environment });
  run("npx", ["prisma", "migrate", "status"], { env: environment });
  run(`${postgresBin}/psql`, ["-h", "127.0.0.1", "-p", String(selectedPort), "-U", "postgres", "-d", database, "-v", "ON_ERROR_STOP=1", "-f", "scripts/validate-r3b-migration-integrity.sql"]);
  run("npx", ["vitest", "run", "--no-file-parallelism", "tests/revenue-entitlement-db.integration.test.ts", "tests/revenue-lifecycle-db.integration.test.ts", "tests/revenue-billing-db.integration.test.ts"], { env: environment });
} finally {
  if (started) spawnSync(`${postgresBin}/pg_ctl`, ["-D", cluster, "-m", "fast", "-w", "stop"], { stdio: "inherit" });
  rmSync(cluster, { recursive: true, force: true });
}
