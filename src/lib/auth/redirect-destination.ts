export type RedirectSession = {
  platformRole?: string | null;
};

const AUTH_PATHS = new Set(["/login", "/register", "/forgot-password"]);

/** Accepts only same-origin application paths and rejects ambiguous URL forms. */
export function safeRedirectPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return null;

  try {
    const parsed = new URL(value, "https://mwezora.invalid");
    if (parsed.origin !== "https://mwezora.invalid") return null;
    const decodedPathname = decodeURIComponent(parsed.pathname);
    if (decodedPathname.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(decodedPathname)) return null;
    if (AUTH_PATHS.has(parsed.pathname)) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

export function authorizedRedirectPath(
  value: string | null | undefined,
  session: RedirectSession,
): string | null {
  const path = safeRedirectPath(value);
  if (!path) return null;
  const pathname = new URL(path, "https://mwezora.invalid").pathname;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return session.platformRole === "ADMIN" || session.platformRole === "SUPER_ADMIN" ? path : null;
  }
  if (pathname === "/vendor" || pathname.startsWith("/vendor/")) {
    return session.platformRole === "VENDOR" ? path : null;
  }
  return path;
}
