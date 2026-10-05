"use client";

import * as React from "react";
import { Cookie, Settings2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export const COOKIE_CONSENT_COOKIE = "smartduka_cookie_consent";
export const COOKIE_CONSENT_VERSION = 1;
const ONE_YEAR = 60 * 60 * 24 * 365;

export type CookieConsent = {
  version: typeof COOKIE_CONSENT_VERSION;
  essential: true;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
  updatedAt: string;
};

type CookieConsentContextValue = {
  openPreferences: () => void;
  consent: CookieConsent | null;
};

const CookieConsentContext = React.createContext<CookieConsentContextValue | null>(null);

export function parseCookieConsent(value: string | null | undefined): CookieConsent | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Partial<CookieConsent>;
    return parsed.version === COOKIE_CONSENT_VERSION && parsed.essential === true && typeof parsed.updatedAt === "string"
      ? { version: COOKIE_CONSENT_VERSION, essential: true, analytics: parsed.analytics === true, marketing: parsed.marketing === true, preferences: parsed.preferences === true, updatedAt: parsed.updatedAt }
      : null;
  } catch {
    return null;
  }
}

export function useCookieConsent() {
  const context = React.useContext(CookieConsentContext);
  if (!context) throw new Error("useCookieConsent must be used within CookieConsentProvider.");
  return context;
}

export function CookieConsentProvider({
  children,
  initialConsentValue,
}: {
  children: React.ReactNode;
  initialConsentValue: string | null;
}) {
  const [consent, setConsent] = React.useState(() => parseCookieConsent(initialConsentValue));
  const [preferencesOpen, setPreferencesOpen] = React.useState(false);
  const [preferences, setPreferences] = React.useState({ analytics: false, marketing: false, preferences: false });

  const saveConsent = React.useCallback((selection = preferences) => {
    const next: CookieConsent = {
      version: COOKIE_CONSENT_VERSION,
      essential: true,
      analytics: selection.analytics,
      marketing: selection.marketing,
      preferences: selection.preferences,
      updatedAt: new Date().toISOString(),
    };
    document.cookie = `${COOKIE_CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(next))}; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    setConsent(next);
    setPreferencesOpen(false);
  }, [preferences]);

  const value = React.useMemo(
    () => ({ openPreferences: () => setPreferencesOpen(true), consent }),
    [consent],
  );

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
      {!consent && (
        <aside
          aria-label="Cookie preferences"
          aria-live="polite"
          className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-lg rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-xl shadow-black/10 sm:bottom-6 sm:right-6 sm:left-auto sm:mx-0">
          <div className="flex gap-3">
            <Cookie className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold">Your privacy choices</h2>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                SmartDuka uses essential cookies to keep the marketplace secure and working. We do not currently use optional analytics or marketing cookies.
              </p>
              <Link href="/cookie-policy" className="mt-2 inline-flex text-xs font-medium text-primary underline-offset-4 hover:underline">Cookie Policy</Link>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <Button type="button" variant="outline" className="h-10 rounded-full" onClick={() => saveConsent({ analytics: false, marketing: false, preferences: false })}>Reject Optional</Button>
            <Button type="button" variant="outline" className="h-10 rounded-full" onClick={() => setPreferencesOpen(true)}>
              <Settings2 aria-hidden="true" /> Preferences
            </Button>
            <Button type="button" className="h-10 rounded-full" onClick={() => saveConsent({ analytics: true, marketing: true, preferences: true })}>Accept All</Button>
          </div>
        </aside>
      )}
      <Sheet open={preferencesOpen} onOpenChange={setPreferencesOpen}>
        <SheetContent side="bottom" className="mx-auto max-h-[85dvh] w-full overflow-y-auto rounded-t-2xl sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Cookie preferences</SheetTitle>
            <SheetDescription>Manage the cookies SmartDuka uses on this device.</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 px-4 pb-2 text-sm">
            <section className="rounded-xl border border-border bg-muted/30 p-4" aria-labelledby="essential-cookies">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 id="essential-cookies" className="font-semibold">Essential cookies</h3>
                  <p className="mt-1 leading-5 text-muted-foreground">Required for authentication, security, saved sessions, and core marketplace functionality.</p>
                </div>
                <span className="shrink-0 rounded-full border bg-background px-2.5 py-1 text-xs font-medium">Always on</span>
              </div>
            </section>
            {([["analytics", "Analytics cookies", "Help us understand marketplace usage."], ["marketing", "Marketing cookies", "Support relevant SmartDuka promotions."], ["preferences", "Preference cookies", "Remember non-essential display choices."]] as const).map(([key, title, description]) => <label key={key} className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border p-4"><span><span className="block font-semibold">{title}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span></span><input type="checkbox" checked={preferences[key]} onChange={(event) => setPreferences(current => ({ ...current, [key]: event.target.checked }))} className="mt-1 size-4 accent-primary" /></label>)}
            <p className="text-xs leading-5 text-muted-foreground">SmartDuka has no optional analytics or marketing tracking enabled today. Your choices are saved before any future optional category is used.</p>
            <Link href="/cookie-policy" className="inline-flex text-xs font-medium text-primary underline-offset-4 hover:underline">Read our Cookie Policy</Link>
          </div>
          <SheetFooter className="border-t sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="rounded-full" onClick={() => setPreferencesOpen(false)}>Cancel</Button>
            <Button type="button" className="rounded-full" onClick={() => saveConsent()}>Save preferences</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </CookieConsentContext.Provider>
  );
}

export function CookieSettingsButton() {
  const { openPreferences } = useCookieConsent();
  return <button type="button" onClick={openPreferences} className="text-sm text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Cookie settings</button>;
}
