import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { MarketplaceJWTPayload, verifyToken } from "@/lib/auth/jwt";

// Configuration boundary definitions mapping directly to your Marketplace Route Groups structures
const AUTH_ROUTES = ["/login", "/register", "/forgot-password"];
const ADMIN_PREFIX = "/dashboard/admin";
const VENDOR_PREFIX = "/dashboard/vendor";
const CHECKOUT_PREFIX = "/checkout";

/**
 * Next.js Edge Gateway Proxy Engine (Multi-Vendor Marketplace Edition)
 * Handles structural path shielding, multi-tenant layer context injection, and role isolation bounces.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.nextUrl.origin;

  // 1. Bypass asset streams, compiler frames, and auth endpoints early
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 2. Fetch the marketplace access token cookie value securely from edge runtime memory
  const tokenCookie = request.cookies.get("marketplace_access_token");
  const token = tokenCookie?.value;

  // 3. Define routing scopes
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  // Public marketplace areas where buyers browse without requiring sessions
  const isPublicMarketplaceRoute =
    pathname === "/" ||
    ["/about", "/contact", "/products", "/cart", "/shop"].some((route) =>
      pathname.startsWith(route),
    );

  // 4. Decode session tokens at the edge
  let session: MarketplaceJWTPayload | null = null;
  if (token) {
    session = await verifyToken(token);
  }

  // 5. Handle Redirection logic blocks if authenticated users try to access auth routes
  if (isAuthRoute) {
    if (session) {
      if (session.role === "ADMIN")
        return NextResponse.redirect(new URL(ADMIN_PREFIX, origin));
      if (session.role === "VENDOR")
        return NextResponse.redirect(new URL(VENDOR_PREFIX, origin));
      return NextResponse.redirect(new URL("/", origin)); // Customers go back to global mall storefront
    }
    return NextResponse.next();
  }

  // 6. Define protected spaces (Dashboards, Order Pipelines, and core Backend APIs)
  const isProtectedArea =
    pathname.startsWith(ADMIN_PREFIX) ||
    pathname.startsWith(VENDOR_PREFIX) ||
    pathname.startsWith(CHECKOUT_PREFIX) ||
    (pathname.startsWith("/api") && !pathname.startsWith("/api/public"));

  // 7. Enforce Authentication Guardrails
  if (isProtectedArea && !session && !isPublicMarketplaceRoute) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Authentication session context expired or missing." },
        { status: 401 },
      );
    }

    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 8. Enforce Sub-System URL Access Isolation & Role Guardrails
  if (session) {
    // Block non-admins from the Platform Super Admin Panel
    if (pathname.startsWith(ADMIN_PREFIX) && session.role !== "ADMIN") {
      return handleUnauthorizedRedirect(request, session, origin);
    }

    // Block non-vendors from entering the Vendor Dashboard
    if (pathname.startsWith(VENDOR_PREFIX) && session.role !== "VENDOR") {
      return handleUnauthorizedRedirect(request, session, origin);
    }
  }

  const modifiedHeaders = new Headers(request.headers);
  if (session) {
    modifiedHeaders.set("x-marketplace-user-id", String(session.userId));
    modifiedHeaders.set("x-marketplace-email", String(session.email));

    if (session.platformRole) {
      modifiedHeaders.set(
        "x-marketplace-platform-role",
        session.platformRole as string,
      );
    }
    if (session.vendorRole) {
      modifiedHeaders.set(
        "x-marketplace-vendor-role",
        session.vendorRole as string,
      );
    }
    if (session.vendorId) {
      modifiedHeaders.set(
        "x-marketplace-vendor-id",
        session.vendorId as string,
      );
    }
  }

  return NextResponse.next({
    request: {
      headers: modifiedHeaders,
    },
  });
}

/**
 * Centralized bounce logic for security context mismatches (403 errors / soft-redirects)
 */
function handleUnauthorizedRedirect(
  request: NextRequest,
  session: MarketplaceJWTPayload,
  origin: string,
) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Access Forbidden: Security context mismatch." },
      { status: 403 },
    );
  }

  if (session.role === "ADMIN")
    return NextResponse.redirect(new URL(ADMIN_PREFIX, origin));
  if (session.role === "VENDOR")
    return NextResponse.redirect(new URL(VENDOR_PREFIX, origin));
  return NextResponse.redirect(new URL("/", origin));
}

// Intercept all routes except static framework bundles, images, icons, and vector paths
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
