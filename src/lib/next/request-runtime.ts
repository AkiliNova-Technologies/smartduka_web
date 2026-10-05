import { connection } from "next/server";

/** Keeps Next request-scope enforcement at route boundaries and mockable in tests. */
export async function requireRequestRuntime() {
  await connection();
}
