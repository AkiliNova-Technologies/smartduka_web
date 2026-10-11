const base = process.env.MTN_MOMO_BASE_URL?.replace(/\/$/, "");
const subscriptionKey =
  process.env.MTN_MOMO_COLLECTION_SUBSCRIPTION_KEY;
const user = process.env.MTN_MOMO_API_USER;
const apiKey = process.env.MTN_MOMO_API_KEY;

if (process.env.MTN_MOMO_ENVIRONMENT !== "sandbox") {
  throw new Error(
    "This command only runs with MTN_MOMO_ENVIRONMENT=sandbox.",
  );
}

if (!base || !subscriptionKey || !user || !apiKey) {
  throw new Error("MTN sandbox configuration is incomplete.");
}

const auth =
  "Basic " +
  Buffer.from(`${user}:${apiKey}`).toString("base64");

const response = await fetch(`${base}/collection/token/`, {
  method: "POST",
  headers: {
    Authorization: auth,
    "Ocp-Apim-Subscription-Key": subscriptionKey,
  },
});

if (!response.ok) {
  const errorBody = await response.text();

  throw new Error(
    `MTN OAuth failed (${response.status}): ${errorBody}`,
  );
}

const body = await response.json();

if (typeof body?.access_token !== "string") {
  throw new Error("MTN OAuth response was malformed.");
}

console.log(
  "MTN sandbox OAuth: PASS\n" +
    "Callback configured: " +
    Boolean(process.env.MTN_MOMO_CALLBACK_URL) +
    "\nDirect vendor routing: UNVERIFIED\n" +
    "No payment was initiated.",
);