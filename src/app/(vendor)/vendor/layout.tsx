import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import {
  requireVendorContext,
  VendorAuthorizationError,
} from "@/lib/auth/vendor-context";
import { AuthenticationRequiredError } from "@/lib/auth/session";
import {
  VendorDashboardShell,
  VendorDashboardShellFallback,
} from "./vendor-dashboard-shell";

export default function VendorDashboardLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <Suspense fallback={<VendorDashboardShellFallback />}>
      <AuthorizedVendorDashboard>{children}</AuthorizedVendorDashboard>
    </Suspense>
  );
}

async function AuthorizedVendorDashboard({
  children,
}: Readonly<{ children: ReactNode }>) {
  let context: Awaited<ReturnType<typeof requireVendorContext>>;
  try {
    // JWT expiry validation reads the current time, so authentication must
    // begin only after this subtree has entered request-time rendering.
    await connection();
    // Resolve the current database membership on the server. Inactive shops
    // retain access to history, settings, and verification recovery; each
    // operation still enforces its own permission and moderation rules.
    context = await requireVendorContext(undefined, {
      allowInactiveShop: true,
    });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      redirect("/login?callbackUrl=/vendor");
    }
    if (error instanceof VendorAuthorizationError) {
      redirect("/");
    }
    throw error;
  }

  return (
    <VendorDashboardShell vendorId={context.vendorId}>
      {children}
    </VendorDashboardShell>
  );
}
