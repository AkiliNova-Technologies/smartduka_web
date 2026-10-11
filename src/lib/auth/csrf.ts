export class CsrfValidationError extends Error {}

/** Cookie-authenticated mutations must originate from this deployment. */
export function assertSameOrigin(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && !["same-origin", "same-site", "none"].includes(fetchSite)) throw new CsrfValidationError("Cross-site request rejected.");
  const origin = request.headers.get("origin");
  if (!origin) {
    if (process.env.NODE_ENV === "production") throw new CsrfValidationError("A trusted request origin is required.");
    return;
  }
  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost ?? request.headers.get("host") ?? requestUrl.host;
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProto ?? requestUrl.protocol.replace(":", "");
  if (new URL(origin).origin !== `${protocol}://${host}`) throw new CsrfValidationError("Request origin did not match this deployment.");
}
