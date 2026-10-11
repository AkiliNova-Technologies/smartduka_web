export function sandboxConfig(env = process.env) {
  if (
    env.MTN_MOMO_ENVIRONMENT !== "sandbox" ||
    env.MTN_SANDBOX_COLLECTION_TESTING_ENABLED !== "true"
  )
    throw new Error("MTN sandbox testing is not enabled.");
  const keys = [
    "MTN_MOMO_BASE_URL",
    "MTN_MOMO_COLLECTION_SUBSCRIPTION_KEY",
    "MTN_MOMO_API_USER",
    "MTN_MOMO_API_KEY",
    "MTN_MOMO_TARGET_ENVIRONMENT",
    "MTN_SANDBOX_TEST_MSISDN",
    "MTN_SANDBOX_TEST_CURRENCY",
  ];
  for (const key of keys)
    if (!env[key]?.trim())
      throw new Error(
        "MTN sandbox configuration is incomplete: " + key + " is required.",
      );
  return {
    base: env.MTN_MOMO_BASE_URL.replace(/\/$/, ""),
    subscriptionKey: env.MTN_MOMO_COLLECTION_SUBSCRIPTION_KEY,
    user: env.MTN_MOMO_API_USER,
    apiKey: env.MTN_MOMO_API_KEY,
    target: env.MTN_MOMO_TARGET_ENVIRONMENT,
    msisdn: env.MTN_SANDBOX_TEST_MSISDN,
    currency: env.MTN_SANDBOX_TEST_CURRENCY,
    callbackUrl: env.MTN_MOMO_CALLBACK_URL,
    amount: env.MTN_SANDBOX_TEST_AMOUNT || "100",
  };
}
export async function token(config) {
  const response = await fetch(config.base + "/collection/token/", {
    method: "POST",
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(config.user + ":" + config.apiKey).toString("base64"),
      "Ocp-Apim-Subscription-Key": config.subscriptionKey,
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok)
    throw new Error("MTN OAuth failed (" + response.status + ").");
  const body = await response.json().catch(() => null);
  if (typeof body?.access_token !== "string")
    throw new Error("MTN OAuth response was malformed.");
  return body.access_token;
}
export const normalizedMsisdn = (value) => {
  const n = value.replace(/[\s()-]/g, "");
  const result = n.startsWith("+256")
    ? "256" + n.slice(4)
    : n.startsWith("0")
      ? "256" + n.slice(1)
      : n;
  // MTN sandbox identities are provider-defined and may not look like a
  // production Ugandan MSISDN. Production application flows keep their
  // stricter Uganda normalization separately.
  if (!/^\d{6,18}$/.test(result))
    throw new Error("MTN_SANDBOX_TEST_MSISDN must be a numeric sandbox test identity.");
  return result;
};
export const mask = (value) =>
  value.length < 4 ? "****" : "******" + value.slice(-4);
