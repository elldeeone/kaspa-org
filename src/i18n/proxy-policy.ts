import { RESERVED_NOT_FOUND_PATHNAME, ROUTE_MISS_HEADER } from "./manifest.ts";
import type { Locale } from "./locale-registry.ts";
import type { RouteId } from "./manifest.ts";
import {
  NEXT_INTL_LOCALE_HEADER,
  resolveRouteRequest,
} from "./route-request.ts";
import { normalizePathname } from "./pathname.ts";

export function sanitizeRoutingHeaders(headers: HeadersInit): Headers {
  const sanitized = new Headers(headers);
  sanitized.delete(ROUTE_MISS_HEADER);
  sanitized.delete(NEXT_INTL_LOCALE_HEADER);
  return sanitized;
}

export function isOpenGraphImage(pathname: string): boolean {
  return (
    pathname === "/opengraph-image" ||
    /^\/[^/]+\/opengraph-image\/?$/u.test(pathname)
  );
}

export function isNextAsset(pathname: string): boolean {
  return (
    pathname === "/_next/image" ||
    pathname.startsWith("/_next/image/") ||
    pathname === "/_next/static" ||
    pathname.startsWith("/_next/static/")
  );
}

export function isRouteMiss(
  pathname: string,
  isRouteAvailable: (routeId: RouteId, locale: Locale) => boolean = () => true,
): boolean {
  if (
    pathname === RESERVED_NOT_FOUND_PATHNAME ||
    isOpenGraphImage(pathname) ||
    isNextAsset(pathname)
  ) {
    return false;
  }

  const route = resolveRouteRequest(pathname);
  return !route || !isRouteAvailable(route.routeId, route.locale);
}

export function isStaticStylePathname(pathname: string): boolean {
  const normalizedPathname = normalizePathname(pathname);
  return normalizedPathname === null || normalizedPathname.includes(".");
}

export function shouldBypassLocaleRouting(pathname: string): boolean {
  const normalizedPathname = normalizePathname(pathname);
  if (!normalizedPathname) return true;

  return (
    normalizedPathname === "/api" ||
    normalizedPathname.startsWith("/api/") ||
    normalizedPathname === "/_next" ||
    normalizedPathname.startsWith("/_next/") ||
    normalizedPathname === "/_vercel" ||
    normalizedPathname.startsWith("/_vercel/") ||
    isOpenGraphImage(normalizedPathname) ||
    normalizedPathname.includes(".")
  );
}
