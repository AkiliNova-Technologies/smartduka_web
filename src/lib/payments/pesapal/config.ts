export type PesapalEnvironment = "sandbox" | "production";

export interface PesapalConfig {
  environment: PesapalEnvironment;
  baseUrl: string;
  consumerKey: string;
  consumerSecret: string;
  ipnId: string;
  ipnUrl: string;
  callbackUrl: string;
  cancellationUrl?: string;
}

export class PesapalConfigError extends Error {
  readonly code = "PESAPAL_CONFIG_ERROR";

  constructor(message: string) {
    super(message);
    this.name = "PesapalConfigError";
  }
}

const BASE_URLS: Record<PesapalEnvironment, string> = {
  sandbox: "https://cybqa.pesapal.com/pesapalv3",
  production: "https://pay.pesapal.com/v3",
};

const IPN_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PesapalEnvironmentValues = Readonly<Record<string, string | undefined>>;
function required(environment: PesapalEnvironmentValues, name: string): string {
  const value = environment[name]?.trim();
  if (!value) throw new PesapalConfigError(`${name} must be configured before Pesapal can be used.`);
  return value;
}

function isLocalOrPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host === "::1" || host === "0.0.0.0") return true;
  const octets = host.split(".").map(Number);
  return octets.length === 4 && octets.every(Number.isInteger) && (
    octets[0] === 10 || octets[0] === 127 ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168)
  );
}

function urlValue(environment: PesapalEnvironmentValues, name: string): string {
  const value = required(environment, name);
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new PesapalConfigError(`${name} must be an absolute URL.`);
  }
  if (parsed.protocol !== "https:") {
    throw new PesapalConfigError(`${name} must use HTTPS.`);
  }
  if (isLocalOrPrivateHost(parsed.hostname)) {
    throw new PesapalConfigError(`${name} must use a publicly reachable host.`);
  }
  return parsed.toString();
}

/** Lazily reads configuration so unrelated static pages do not require gateway credentials. */
export function getPesapalConfig(environment: PesapalEnvironmentValues = process.env): PesapalConfig {
  const selected = environment.PESAPAL_ENV?.trim();
  if (selected !== "sandbox" && selected !== "production") {
    throw new PesapalConfigError("PESAPAL_ENV must be exactly sandbox or production.");
  }

  const ipnId = required(environment, "PESAPAL_IPN_ID");
  if (!IPN_ID_PATTERN.test(ipnId)) {
    throw new PesapalConfigError("PESAPAL_IPN_ID must be a GUID issued by Pesapal.");
  }

  const cancellation = environment.PESAPAL_CANCELLATION_URL?.trim();
  return {
    environment: selected,
    baseUrl: BASE_URLS[selected],
    consumerKey: required(environment, "PESAPAL_CONSUMER_KEY"),
    consumerSecret: required(environment, "PESAPAL_CONSUMER_SECRET"),
    ipnId,
    ipnUrl: urlValue(environment, "PESAPAL_IPN_URL"),
    callbackUrl: urlValue(environment, "PESAPAL_CALLBACK_URL"),
    cancellationUrl: cancellation ? urlValue({ ...environment, PESAPAL_CANCELLATION_URL: cancellation }, "PESAPAL_CANCELLATION_URL") : undefined,
  };
}
