import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/providers/AuthProvider";
import { PublicCatalogProvider } from "@/providers/PublicCatalogProvider";
import { UserDataProvider } from "@/providers/UserDataProvider";
import { WorkspaceAccessProvider } from "@/providers/WorkspaceAccessProvider";
import { AppearanceProvider } from "@/providers/AppearanceProvider";
import { brand } from "@/config/brand";
import { PwaManager } from "@/components/pwa/PwaManager";

const configuredProductionUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL;
const canonicalProductionUrl = configuredProductionUrl
  ? new URL(configuredProductionUrl.startsWith("http") ? configuredProductionUrl : `https://${configuredProductionUrl}`)
  : undefined;

export const metadata: Metadata = {
  metadataBase: canonicalProductionUrl,
  title: {
    default: `${brand.name} | ${brand.tagline}`,
    template: `%s | ${brand.name}`,
  },
  description: brand.description,
  applicationName: brand.name,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: brand.logo.symbol, type: "image/svg+xml" },
      { url: brand.appIcons.classic, type: "image/png", sizes: "1024x1024" },
    ],
    apple: [{ url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    title: brand.name,
    statusBarStyle: "default",
  },
  openGraph: {
    type: "website",
    siteName: brand.name,
    title: `${brand.name} | ${brand.tagline}`,
    description: brand.description,
    images: canonicalProductionUrl ? [{ url: brand.appIcons.classic, width: 1024, height: 1024, alt: `${brand.name} symbol` }] : undefined,
  },
  twitter: {
    card: "summary",
    title: `${brand.name} | ${brand.tagline}`,
    description: brand.description,
    images: canonicalProductionUrl ? [brand.appIcons.classic] : undefined,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF7F2" },
    { media: "(prefers-color-scheme: dark)", color: "#18181B" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full font-sans antialiased selection:bg-primary/10">
      <body className="min-h-full bg-background text-foreground flex flex-col">
        <AuthProvider>
          <AppearanceProvider>
          <WorkspaceAccessProvider>
          <UserDataProvider>
            <PublicCatalogProvider>
              <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
              <Suspense fallback={null}><PwaManager /></Suspense>
              <Toaster position="top-right" closeButton={false} />
            </PublicCatalogProvider>
          </UserDataProvider>
          </WorkspaceAccessProvider>
          </AppearanceProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
