import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";

import { ROUTE_MISS_HEADER } from "@/i18n/manifest";
import {
  isRouteMiss,
  sanitizeRoutingHeaders,
  shouldBypassLocaleRouting,
} from "@/i18n/proxy-policy";
import { routing } from "@/i18n/routing";

const handleI18nRouting = createMiddleware(routing);

export default function proxy(request: NextRequest): NextResponse {
  const requestHeaders = sanitizeRoutingHeaders(request.headers);
  const pathname = request.nextUrl.pathname;
  if (isRouteMiss(pathname)) {
    requestHeaders.set(ROUTE_MISS_HEADER, "1");
  }

  if (shouldBypassLocaleRouting(pathname)) {
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  const sanitizedRequest = new NextRequest(request, {
    headers: requestHeaders,
  });
  return handleI18nRouting(sanitizedRequest);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image).*)",
    {
      source: "/:path*",
      has: [{ type: "header", key: "x-kaspa-i18n-route-miss" }],
    },
    {
      source: "/:path*",
      has: [{ type: "header", key: "x-next-intl-locale" }],
    },
  ],
};
