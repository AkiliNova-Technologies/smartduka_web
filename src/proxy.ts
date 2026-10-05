import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { MarketplaceJWTPayload, verifyToken } from "@/lib/auth/jwt";

const AUTH_ROUTES = ["/login", "/register", "/forgot-password"];
const ADMIN_PREFIX = "/admin";
const VENDOR_PREFIX = "/vendor";
const CHECKOUT_PREFIX = "/checkout";

// API routes that authenticate via userId in request body
const BODY_AUTH_API_PREFIXES = ["/api/vendors"];

// Legacy API routes that are fully public — no auth required.
// Keep these routes while their clients are still supported.
const LEGACY_PUBLIC_API_PREFIXES = [
  "/api/categories",
  "/api/products",
  "/api/vendors/public",
];
const PUBLIC_WEBHOOK_PATH = "/api/webhooks/pesapal";

function normalizePathname(pathname: string): string {
  return pathname === "/" ? pathname : pathname.replace(/\/+$/, "");
}

function hasPathPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isLegacyPublicApiRequest(method: string, pathname: string): boolean {
  return method === "GET" && LEGACY_PUBLIC_API_PREFIXES.some((prefix) => hasPathPrefix(pathname, prefix));
}

/**
 * Returns true only for guest-readable marketplace catalogue endpoints.
 * Visibility filtering remains the responsibility of each route/service.
 */
export function isPublicMarketplaceRead(method: string, pathname: string): boolean {
  if (method !== "GET") return false;

  const normalizedPathname = normalizePathname(pathname);
  return (
    hasPathPrefix(normalizedPathname, "/api/v1/products") ||
    normalizedPathname === "/api/v1/categories" ||
    normalizedPathname === "/api/v1/marketplace/home"
  );
}

function isPublicApiRequest(method: string, pathname: string): boolean {
  const normalizedPathname = normalizePathname(pathname);
  return (
    normalizedPathname === PUBLIC_WEBHOOK_PATH ||
    isLegacyPublicApiRequest(method, normalizedPathname) ||
    isPublicMarketplaceRead(method, normalizedPathname)
  );
}

function getSanitizedRequestHeaders(request: NextRequest): Headers {
  const headers = new Headers(request.headers);
  headers.delete("x-marketplace-user-id");
  headers.delete("x-marketplace-email");
  headers.delete("x-marketplace-platform-role");
  headers.delete("x-marketplace-vendor-role");
  headers.delete("x-marketplace-vendor-id");
  return headers;
}

export async function proxy(request: NextRequest) {
  const pathname = normalizePathname(request.nextUrl.pathname);
  const origin = request.nextUrl.origin;

  // 1. Bypass asset streams, compiler frames, and auth endpoints early
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.includes(".")
  ) {
    return NextResponse.next({ request: { headers: getSanitizedRequestHeaders(request) } });
  }

  // 1.5 Body-based auth routes — pass through, route handles its own validation
  if (BODY_AUTH_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next({ request: { headers: getSanitizedRequestHeaders(request) } });
  }

  // 1.6 Fully public API routes
  if (isPublicApiRequest(request.method, pathname)) {
    return NextResponse.next({ request: { headers: getSanitizedRequestHeaders(request) } });
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
    ["/about", "/contact", "/products", "/cart", "/shop", "/shops"].some(
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
    return NextResponse.next({ request: { headers: getSanitizedRequestHeaders(request) } });
  }

  // 6. Define protected spaces
  const isProtectedArea =
    pathname.startsWith(ADMIN_PREFIX) ||
    pathname.startsWith(VENDOR_PREFIX) ||
    pathname.startsWith(CHECKOUT_PREFIX) ||
    (pathname.startsWith("/api") &&
      !pathname.startsWith("/api/public") &&
      !isPublicApiRequest(request.method, pathname) &&
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

  // Never forward browser-supplied marketplace identity headers. Server code
  // derives browser identity from the verified session cookie instead.
  const modifiedHeaders = getSanitizedRequestHeaders(request);

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
