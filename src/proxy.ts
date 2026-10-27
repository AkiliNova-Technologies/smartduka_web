import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { MarketplaceJWTPayload, verifyToken } from "@/lib/auth/jwt";
import { authorizedRedirectPath } from "@/lib/auth/redirect-destination";

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
const NATIVE_BEARER_ROUTES = new Set([
  "GET /api/v1/me",
  "GET /api/v1/wishlist",
  "POST /api/v1/wishlist",
]);

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
    hasPathPrefix(normalizedPathname, "/api/v1/shops") ||
    normalizedPathname === "/api/v1/categories" ||
    normalizedPathname === "/api/v1/search" ||
    normalizedPathname === "/api/v1/marketplace/home" ||
    /^\/api\/marketing\/(HOMEPAGE|PRODUCTS|SHOPS)$/.test(normalizedPathname)
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

/**
 * Allows an explicitly audited native API request to reach its route-level
 * authentication guard. This only recognizes the transport scheme; the route
 * remains responsible for verifying the token and authorizing the account.
 */
export function isNativeBearerPassThrough(
  method: string,
  pathname: string,
  authorization: string | null,
): boolean {
  const normalizedPathname = normalizePathname(pathname);
  const normalizedMethod = method.toUpperCase();
  const wishlistDelete =
    normalizedMethod === "DELETE" &&
    /^\/api\/v1\/wishlist\/[^/]+$/.test(normalizedPathname);
  if (
    !wishlistDelete &&
    !NATIVE_BEARER_ROUTES.has(`${normalizedMethod} ${normalizedPathname}`)
  ) {
    return false;
  }
  return /^Bearer\s+\S+$/i.test(authorization ?? "");
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

  // Native Firebase tokens are verified by the explicitly audited route's
  // existing server-side authentication guard. Header presence is not treated
  // as authentication here.
  if (
    isNativeBearerPassThrough(
      request.method,
      pathname,
      request.headers.get("authorization"),
    )
  ) {
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
      const destination = authorizedRedirectPath(
        request.nextUrl.searchParams.get("callbackUrl"),
        session,
      );
      return NextResponse.redirect(new URL(destination ?? "/", origin));
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
    loginUrl.searchParams.set("callbackUrl", `${pathname}${request.nextUrl.search}`);
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
      return handleUnauthorizedRedirect(request, origin);
    }

    if (
      pathname.startsWith(VENDOR_PREFIX) &&
      session.platformRole !== "VENDOR"
    ) {
      return handleUnauthorizedRedirect(request, origin);
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
  origin: string,
) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Access Forbidden: Security context mismatch." },
      { status: 403 },
    );
  }
  // An authorization failure must not become implicit privileged navigation.
  return NextResponse.redirect(new URL("/", origin));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
