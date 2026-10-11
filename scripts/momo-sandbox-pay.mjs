import { randomUUID } from "node:crypto";
import {
  sandboxConfig,
  token,
  normalizedMsisdn,
  mask,
} from "./momo-sandbox-client.mjs";
const redact = (text) =>
  text
    .slice(0, 500)
    .replace(
      /(access_?token|api_?key|subscription[_-]?key|authorization)\s*["=:]\s*[^,\s"}]+/gi,
      "$1=[redacted]",
    )
    .replace(/\+?\d[\d -]{7,}\d/g, "[redacted-phone]");
const config = sandboxConfig(),
  accessToken = await token(config),
  reference = randomUUID(),
  externalId = "SMARTDUKA-SANDBOX-" + Date.now(),
  payer = normalizedMsisdn(config.msisdn);
const headers = {
  Authorization: "Bearer " + accessToken,
  "X-Reference-Id": reference,
  "X-Target-Environment": config.target,
  "Ocp-Apim-Subscription-Key": config.subscriptionKey,
  "Content-Type": "application/json",
  ...(process.env.MTN_SANDBOX_TEST_USE_CALLBACK === "true" && config.callbackUrl
    ? { "X-Callback-Url": config.callbackUrl }
    : {}),
};
let submission;
try {
  const response = await fetch(config.base + "/collection/v1_0/requesttopay", {
    method: "POST",
    headers,
    body: JSON.stringify({
      amount: config.amount,
      currency: config.currency,
      externalId,
      payer: { partyIdType: "MSISDN", partyId: payer },
      payerMessage: "SmartDuka sandbox payment test",
      payeeNote: "SmartDuka sandbox payment test",
    }),
    signal: AbortSignal.timeout(12_000),
  });
  const body =
    response.status === 202 ? "" : await response.text().catch(() => "");
  submission =
    response.status === 202
      ? { kind: "ACCEPTED", httpStatus: 202 }
      : { kind: "REJECTED", httpStatus: response.status, body: redact(body) };
} catch {
  submission = { kind: "AMBIGUOUS" };
}
console.log(
  "MTN MoMo Sandbox Qualification\nOAuth: PASS\nReference ID created: YES",
);
if (submission.kind === "REJECTED") {
  console.log(
    "RequestToPay HTTP: " +
      submission.httpStatus +
      "\nRequestToPay: REJECTED" +
      (submission.body ? "\nProvider response: " + submission.body : "") +
      "\nStatus lookup: SKIPPED\nFinal provider status: NOT CREATED\nDirect vendor routing: UNVERIFIED\nProduction marketplace ready: NO",
  );
  process.exitCode = 1;
} else {
  const ambiguous = submission.kind === "AMBIGUOUS";
  console.log(
    "RequestToPay HTTP: " +
      (ambiguous ? "NO RESPONSE" : "202") +
      "\nRequestToPay: " +
      (ambiguous ? "AMBIGUOUS" : "ACCEPTED") +
      "\n" +
      (ambiguous
        ? "No HTTP response was received. Checking transaction status before retrying..."
        : "Initial payment status: PENDING") +
      "\nReference: " +
      reference +
      "\nPayer: " +
      mask(payer),
  );
  const waits = ambiguous
    ? [2000, 3000, 5000]
    : [2000, 3000, 5000, 5000, 10000, 10000];
  let final,
    notFound = 0,
    lookup = false;
  for (const wait of waits) {
    await new Promise((resolve) => setTimeout(resolve, wait));
    let response;
    try {
      response = await fetch(
        config.base +
          "/collection/v1_0/requesttopay/" +
          encodeURIComponent(reference),
        {
          headers: {
            Authorization: "Bearer " + accessToken,
            "X-Target-Environment": config.target,
            "Ocp-Apim-Subscription-Key": config.subscriptionKey,
          },
          signal: AbortSignal.timeout(10_000),
        },
      );
    } catch {
      console.log(
        "MTN status lookup: provider check failed; retrying if polling window remains.",
      );
      continue;
    }
    if (response.status === 404 && ambiguous) {
      notFound++;
      continue;
    }
    if (!response.ok) {
      console.log("MTN status lookup failed (" + response.status + ").");
      continue;
    }
    lookup = true;
    const body = await response.json().catch(() => null),
      status = body?.status;
    if (!["PENDING", "SUCCESSFUL", "FAILED"].includes(status)) {
      final = "UNKNOWN";
      console.log("MTN sandbox payment status: UNRECOGNIZED_PROVIDER_STATUS");
      break;
    }
    console.log("MTN sandbox payment status: " + status);
    if (status !== "PENDING") {
      final = status;
      console.log(
        "Provider transaction: " +
          (typeof body.financialTransactionId === "string"
            ? "••••" + body.financialTransactionId.slice(-4)
            : "not supplied") +
          "\nAmount: " +
          body.amount +
          " " +
          body.currency,
      );
      break;
    }
  }
  if (ambiguous && notFound === waits.length)
    console.log(
      "MTN could not find the transaction reference after the ambiguity recovery window. The original RequestToPay was likely not accepted.",
    );
  console.log(
    "Status lookup: " +
      (lookup ? "PASS" : ambiguous ? "RECOVERY ATTEMPTED" : "NO RESPONSE") +
      "\nFinal provider status: " +
      (final || "PENDING") +
      "\nDirect vendor routing: UNVERIFIED\nProduction marketplace ready: NO",
  );
}
