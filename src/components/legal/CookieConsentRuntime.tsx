import { cookies } from "next/headers";
import { MarketplaceFooter } from "@/components/layout/MarketplaceFooter";
import {
  COOKIE_CONSENT_COOKIE,
  CookieConsentProvider,
} from "@/components/legal/cookie-consent";

/** Streams the request-specific consent state without making customer pages dynamic. */
export async function CookieConsentRuntime() {
  const consent = (await cookies()).get(COOKIE_CONSENT_COOKIE)?.value ?? null;

  return (
    <CookieConsentProvider initialConsentValue={consent}>
      <MarketplaceFooter />
    </CookieConsentProvider>
  );
}
