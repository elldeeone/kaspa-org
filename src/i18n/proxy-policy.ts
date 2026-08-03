import {
  RESERVED_NOT_FOUND_PATHNAME,
  ROUTE_MISS_HEADER,
  isRoutePublished,
} from "./manifest.ts";
import {
  NEXT_INTL_LOCALE_HEADER,
  resolveRouteRequest,
} from "./route-request.ts";

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
  resolvePublication: typeof isRoutePublished = isRoutePublished,
): boolean {
  if (
    pathname === RESERVED_NOT_FOUND_PATHNAME ||
    isOpenGraphImage(pathname) ||
    isNextAsset(pathname)
  ) {
    return false;
  }

  const route = resolveRouteRequest(pathname);
  return !route || !resolvePublication(route.routeId, route.locale);
}

export function shouldBypassLocaleRouting(pathname: string): boolean {
  return (
    pathname === "/api" ||
    pathname.startsWith("/api/") ||
    pathname === "/_next" ||
    pathname.startsWith("/_next/") ||
    pathname === "/_vercel" ||
    pathname.startsWith("/_vercel/") ||
    isOpenGraphImage(pathname) ||
    pathname.includes(".")
  );
}
