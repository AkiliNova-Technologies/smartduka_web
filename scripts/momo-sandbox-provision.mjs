import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";

const base = process.env.MTN_MOMO_BASE_URL?.replace(/\/$/, "");
const subscriptionKey =
  process.env.MTN_MOMO_COLLECTION_SUBSCRIPTION_KEY;
const callbackHost = process.env.MTN_MOMO_CALLBACK_HOST;

if (process.env.MTN_MOMO_ENVIRONMENT !== "sandbox") {
  throw new Error(
    "This command only runs with MTN_MOMO_ENVIRONMENT=sandbox.",
  );
}

if (process.env.MTN_SANDBOX_PROVISION_CONFIRM !== "true") {
  throw new Error("Set MTN_SANDBOX_PROVISION_CONFIRM=true to explicitly provision sandbox credentials.");
}

if (!base || !subscriptionKey || !callbackHost) {
  throw new Error(
    "Set MTN_MOMO_BASE_URL, " +
      "MTN_MOMO_COLLECTION_SUBSCRIPTION_KEY, " +
      "and MTN_MOMO_CALLBACK_HOST.",
  );
}

const apiUser = randomUUID();

const createUserResponse = await fetch(
  `${base}/v1_0/apiuser`,
  {
    method: "POST",
    headers: {
      "X-Reference-Id": apiUser,
      "Ocp-Apim-Subscription-Key": subscriptionKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      providerCallbackHost: callbackHost,
    }),
  },
);

if (createUserResponse.status !== 201) {
  throw new Error(`MTN API user creation failed (${createUserResponse.status}).`);
}

const createKeyResponse = await fetch(
  `${base}/v1_0/apiuser/${apiUser}/apikey`,
  {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": subscriptionKey,
    },
  },
);

if (createKeyResponse.status !== 201) {
  throw new Error(`MTN API key creation failed (${createKeyResponse.status}).`);
}

const payload = await createKeyResponse.json();

if (typeof payload?.apiKey !== "string") {
  throw new Error("MTN returned no API key.");
}

const credentialFile = process.env.MTN_SANDBOX_CREDENTIAL_FILE || ".env.mtn-sandbox.generated";
writeFileSync(credentialFile, `MTN_MOMO_API_USER=${apiUser}\nMTN_MOMO_API_KEY=${payload.apiKey}\n`, { flag: "wx", mode: 0o600 });
console.log(`MTN sandbox credentials were written once to ${credentialFile} with owner-only permissions. Do not commit this file.`);
