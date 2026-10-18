import { AuthenticationRequiredError } from "@/lib/auth/session";

/** Browser mutations using the session cookie must originate from this Mwezora origin. */
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  let expected: string;
  try {
    const requestUrl = new URL(request.url);
    const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || request.headers.get("host") || requestUrl.host;
    const protocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || requestUrl.protocol.replace(":", "");
    expected = `${protocol}://${host}`;
  } catch { throw new AuthenticationRequiredError("Unable to validate request origin."); }
  if (new URL(origin).origin !== expected) {
    const error = new Error("This request must originate from Mwezora.");
    Object.assign(error, { code: "FORBIDDEN" });
    throw error;
  }
}
