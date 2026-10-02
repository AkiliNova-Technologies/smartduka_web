import React, { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { MobileCommerceNav, MobileCommerceNavFallback } from "@/components/layout/MobileCommerceNav";
import { CookieConsentRuntime } from "@/components/legal/CookieConsentRuntime";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen w-full flex-col overflow-x-hidden bg-background antialiased selection:bg-emerald-500/10 selection:text-emerald-700"><Suspense fallback={<div className="mt-2 h-20 w-full animate-pulse rounded-full bg-muted/20" />}><Header /></Suspense><main className="min-w-0 flex-1">{children}</main><Suspense fallback={null}><CookieConsentRuntime /></Suspense><Suspense fallback={<MobileCommerceNavFallback />}><MobileCommerceNav /></Suspense></div>;
}
