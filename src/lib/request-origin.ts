import { AuthenticationRequiredError } from "@/lib/auth/session";

/** Browser mutations using the session cookie must originate from this Mwezora origin. */
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  let expected: string;
  try { expected = new URL(request.url).origin; } catch { throw new AuthenticationRequiredError("Unable to validate request origin."); }
  if (origin !== expected) {
    const error = new Error("This request must originate from Mwezora.");
    Object.assign(error, { code: "FORBIDDEN" });
    throw error;
  }
}
