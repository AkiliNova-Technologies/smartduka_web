import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) are required.");
const client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const expected = new Map([["marketplace-media", true], ["kyc-documents", false]]);
const { data, error } = await client.storage.listBuckets();
if (error) throw error;
let failed = false;
for (const [name, isPublic] of expected) {
  const bucket = data.find((candidate) => candidate.id === name);
  const ok = Boolean(bucket && bucket.public === isPublic);
  console.log(`${ok ? "✓" : "✗"} ${name}${bucket ? "" : " missing"}`);
  failed ||= !ok;
}
if (failed) process.exitCode = 1;
