import { defaultLocale, type Locale } from "./locale-registry.ts";
import type { RouteId } from "./manifest.ts";
import { getHomeMessages, getRouteMessages } from "./messages.ts";

export const openGraphSize = { width: 1200, height: 630 } as const;
export const openGraphContentType = "image/png" as const;

const MAX_HEADING_FONT_SIZE = 140;
const MIN_HEADING_FONT_SIZE = 68;
// Keep a small width reserve for glyph and script differences that a character
// count cannot predict. Longer lines scale smoothly instead of switching on locale.
const REFERENCE_HEADING_LENGTH = 15;

export function createOpenGraphHeadingStyle(headingLines: readonly string[]) {
  const longestLineLength = Math.max(
    1,
    ...headingLines.map((line) => Array.from(line).length),
  );
  const fontSize = Math.max(
    MIN_HEADING_FONT_SIZE,
    Math.min(
      MAX_HEADING_FONT_SIZE,
      Math.floor(
        (MAX_HEADING_FONT_SIZE * REFERENCE_HEADING_LENGTH) / longestLineLength,
      ),
    ),
  );

  return {
    fontSize,
    letterSpacing: "-0.02em",
    lineHeight: 1,
    overflowWrap: "anywhere",
    wordBreak: "normal",
  } as const;
}

export function createOpenGraphRenderContract(locale: Locale) {
  const copy = getHomeMessages(locale).openGraph;
  const headingLines = copy.heading.split("\n");
  return {
    headingLines,
    headingStyle: createOpenGraphHeadingStyle(headingLines),
    tagline: copy.tagline,
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
