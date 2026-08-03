import { defaultLocale, type Locale } from "./config.ts";
import type { RouteId } from "./manifest.ts";
import { getHomeMessages, getRouteMessages } from "./messages.ts";

export const openGraphSize = { width: 1200, height: 630 } as const;
export const openGraphContentType = "image/png" as const;

export function createOpenGraphRenderContract(locale: Locale) {
  const copy = getHomeMessages(locale).openGraph;
  return {
    headingLines: copy.heading.split("\n"),
    tagline: copy.tagline,
    layout: locale === defaultLocale ? "default" : "localized",
  } as const;
}

export function createOpenGraphImageDescriptor(
  routeId: RouteId,
  locale: Locale,
) {
  const image = {
    url:
      locale === defaultLocale
        ? "/opengraph-image"
        : `/${locale}/opengraph-image`,
    ...openGraphSize,
    alt: getRouteMessages(locale, routeId).openGraph.imageAlt,
  } as const;

  return routeId === "home" ? { ...image, type: openGraphContentType } : image;
}
