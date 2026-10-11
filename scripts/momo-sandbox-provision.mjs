import { randomUUID } from "node:crypto";

const base = process.env.MTN_MOMO_BASE_URL?.replace(/\/$/, "");
const subscriptionKey =
  process.env.MTN_MOMO_COLLECTION_SUBSCRIPTION_KEY;
const callbackHost = process.env.MTN_MOMO_CALLBACK_HOST;

if (process.env.MTN_MOMO_ENVIRONMENT !== "sandbox") {
  throw new Error(
    "This command only runs with MTN_MOMO_ENVIRONMENT=sandbox.",
  );
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
  const errorBody = await createUserResponse.text();

  throw new Error(
    `MTN API user creation failed (${createUserResponse.status}): ${errorBody}`,
  );
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
  const errorBody = await createKeyResponse.text();

  throw new Error(
    `MTN API key creation failed (${createKeyResponse.status}): ${errorBody}`,
  );
}

const payload = await createKeyResponse.json();

if (typeof payload?.apiKey !== "string") {
  throw new Error("MTN returned no API key.");
}

console.log(
  [
    `MTN_MOMO_API_USER=${apiUser}`,
    `MTN_MOMO_API_KEY=${payload.apiKey}`,
    "",
    "Do not commit these values.",
  ].join("\n"),
);