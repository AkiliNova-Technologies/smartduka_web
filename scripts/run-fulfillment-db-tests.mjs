import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { createServer } from "node:net";

const postgresBin = process.env.POSTGRES_BIN ?? "/usr/lib/postgresql/17/bin";
const cluster = mkdtempSync(join(tmpdir(), "mwezora-fulfillment-postgres-"));
const database = "mwezora_fulfillment_tests";
const buildOnly = process.argv.includes("--build");
function run(command, args, options = {}) { const result = spawnSync(command, args, { stdio: "inherit", ...options }); if (result.error) throw result.error; if (result.status !== 0) throw new Error(`${command} exited with status ${result.status}.`); }
function availablePort() { return new Promise((resolve, reject) => { const server = createServer(); server.once("error", reject); server.listen(0, "127.0.0.1", () => { const address = server.address(); if (!address || typeof address === "string") return reject(new Error("Could not allocate a local PostgreSQL port.")); server.close((error) => error ? reject(error) : resolve(address.port)); }); }); }
const port = await availablePort();
const databaseUrl = `postgresql://postgres@127.0.0.1:${port}/${database}`;
const environment = { ...process.env, DATABASE_URL: databaseUrl, DIRECT_URL: databaseUrl, RUN_FULFILLMENT_DB_TESTS: "1", FULFILLMENT_TEST_DATABASE: "isolated-local" };
let started = false;
try {
  run(`${postgresBin}/initdb`, ["-D", cluster, "--username=postgres", "--auth=trust", "--no-locale", "--encoding=UTF8"]);
  run(`${postgresBin}/pg_ctl`, ["-D", cluster, "-o", `-h 127.0.0.1 -k ${cluster} -p ${port}`, "-w", "start"]); started = true;
  run(`${postgresBin}/createdb`, ["-h", "127.0.0.1", "-p", String(port), "-U", "postgres", database]);
  run(`${postgresBin}/psql`, ["-h", "127.0.0.1", "-p", String(port), "-U", "postgres", "-d", database, "-v", "ON_ERROR_STOP=1", "-c", "CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE SCHEMA storage; CREATE TABLE storage.buckets (id text PRIMARY KEY, name text NOT NULL, public boolean NOT NULL DEFAULT false, file_size_limit bigint, allowed_mime_types text[]);"]);
  run("npx", ["prisma", "migrate", "deploy"], { env: environment });
  if (buildOnly) run("npm", ["run", "build"], { env: environment });
  else run("npx", ["vitest", "run", "tests/multi-branch-db.integration.test.ts"], { env: environment });
} finally {
  if (started) spawnSync(`${postgresBin}/pg_ctl`, ["-D", cluster, "-m", "fast", "-w", "stop"], { stdio: "inherit" });
  rmSync(cluster, { recursive: true, force: true });
}
