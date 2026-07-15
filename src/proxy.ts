import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { MarketplaceJWTPayload, verifyToken } from "@/lib/auth/jwt";

const AUTH_ROUTES = ["/login", "/register", "/forgot-password"];
const ADMIN_PREFIX = "/admin";
const VENDOR_PREFIX = "/vendor";
const CHECKOUT_PREFIX = "/checkout";

// API routes that authenticate via x-marketplace-user-id header
const HEADER_AUTH_API_PREFIXES = [
  "/api/settings",
  "/api/orders",
  "/api/user-profile",
];

// API routes that authenticate via userId in request body
const BODY_AUTH_API_PREFIXES = ["/api/vendors", "/api/admin/vendors"];

// API routes that are fully public — no auth required
const PUBLIC_API_PREFIXES = [
  "/api/categories",
  "/api/products",
  "/api/vendors/public",
];

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

  // 1.5 Header-based auth routes
  if (HEADER_AUTH_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    const clientUserId = request.headers.get("x-marketplace-user-id");
    if (clientUserId) {
      const modifiedHeaders = new Headers(request.headers);
      return NextResponse.next({
        request: { headers: modifiedHeaders },
      });
    }
    return NextResponse.json(
      { error: "Authentication required. Please sign in." },
      { status: 401 },
    );
  }

  // 1.6 Body-based auth routes — pass through, route handles its own validation
  if (BODY_AUTH_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // 1.7 Fully public API routes
  if (PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // 2. Fetch the marketplace access token cookie
  const tokenCookie =
    request.cookies.get("marketplace_access_token") ||
    request.cookies.get("session");
  const token = tokenCookie?.value;

  // 3. Define routing scopes
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  const isPublicMarketplaceRoute =
    pathname === "/" ||
    ["/about", "/contact", "/products", "/cart", "/shop", "/brands"].some(
      (route) => pathname.startsWith(route),
    );

  // 4. Decode session tokens at the edge
  let session: MarketplaceJWTPayload | null = null;
  if (token) {
    session = await verifyToken(token);
  }

  // 5. Handle Redirection for authenticated users on auth routes
  if (isAuthRoute) {
    if (session) {
      // FIXED: session.role → session.platformRole
      if (
        session.platformRole === "ADMIN" ||
        session.platformRole === "SUPER_ADMIN"
      )
        return NextResponse.redirect(new URL(ADMIN_PREFIX, origin));
      if (session.platformRole === "VENDOR")
        return NextResponse.redirect(new URL(VENDOR_PREFIX, origin));
      return NextResponse.redirect(new URL("/", origin));
    }
    return NextResponse.next();
  }

  // 6. Define protected spaces
  const isProtectedArea =
    pathname.startsWith(ADMIN_PREFIX) ||
    pathname.startsWith(VENDOR_PREFIX) ||
    pathname.startsWith(CHECKOUT_PREFIX) ||
    (pathname.startsWith("/api") &&
      !pathname.startsWith("/api/public") &&
      !PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix)) &&
      !HEADER_AUTH_API_PREFIXES.some((prefix) => pathname.startsWith(prefix)) &&
      !BODY_AUTH_API_PREFIXES.some((prefix) => pathname.startsWith(prefix)));

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
    // FIXED: session.role → session.platformRole
    if (
      pathname.startsWith(ADMIN_PREFIX) &&
      session.platformRole !== "ADMIN" &&
      session.platformRole !== "SUPER_ADMIN"
    ) {
      return handleUnauthorizedRedirect(request, session, origin);
    }

    if (
      pathname.startsWith(VENDOR_PREFIX) &&
      session.platformRole !== "VENDOR"
    ) {
      return handleUnauthorizedRedirect(request, session, origin);
    }
  }

  // 9. Inject headers
  const modifiedHeaders = new Headers(request.headers);
  if (session) {
    modifiedHeaders.set("x-marketplace-user-id", String(session.userId));
    modifiedHeaders.set("x-marketplace-email", String(session.email));
    if (session.platformRole) {
      modifiedHeaders.set("x-marketplace-platform-role", session.platformRole);
    }
    if (session.vendorRole) {
      modifiedHeaders.set("x-marketplace-vendor-role", session.vendorRole);
    }
    if (session.vendorId) {
      modifiedHeaders.set("x-marketplace-vendor-id", session.vendorId);
    }
  }

  return NextResponse.next({
    request: { headers: modifiedHeaders },
  });
}

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
  // FIXED: session.role → session.platformRole
  if (
    session.platformRole === "ADMIN" ||
    session.platformRole === "SUPER_ADMIN"
  )
    return NextResponse.redirect(new URL(ADMIN_PREFIX, origin));
  if (session.platformRole === "VENDOR")
    return NextResponse.redirect(new URL(VENDOR_PREFIX, origin));
  return NextResponse.redirect(new URL("/", origin));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
