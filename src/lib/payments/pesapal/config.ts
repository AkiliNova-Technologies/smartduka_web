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

function urlValue(environment: PesapalEnvironmentValues, name: string, production: boolean): string {
  const value = required(environment, name);
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new PesapalConfigError(`${name} must be an absolute URL.`);
  }
  if (production && parsed.protocol !== "https:") {
    throw new PesapalConfigError(`${name} must use HTTPS in production.`);
  }
  return parsed.toString();
}

/** Lazily reads configuration so unrelated static pages do not require gateway credentials. */
export function getPesapalConfig(environment: PesapalEnvironmentValues = process.env): PesapalConfig {
  const selected = environment.PESAPAL_ENV?.trim();
  if (selected !== "sandbox" && selected !== "production") {
    throw new PesapalConfigError("PESAPAL_ENV must be exactly sandbox or production.");
  }

  const production = selected === "production";
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
    ipnUrl: urlValue(environment, "PESAPAL_IPN_URL", production),
    callbackUrl: urlValue(environment, "PESAPAL_CALLBACK_URL", production),
    cancellationUrl: cancellation ? urlValue({ ...environment, PESAPAL_CANCELLATION_URL: cancellation }, "PESAPAL_CANCELLATION_URL", production) : undefined,
  };
}
