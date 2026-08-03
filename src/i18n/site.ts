import type { Metadata } from "next";

import {
  defaultLocale,
  getLocaleDefinition,
  isAiDeploymentEnabled,
  isLocale,
  listEnabledLocales as getEnabledLocaleCodes,
  type Locale,
  type LocaleDefinition,
} from "./config.ts";
import {
  getRouteIdForPathname,
  isRoutePublished,
  routeIds,
  routeManifest,
  type RouteId,
  type StablePathname,
} from "./manifest.ts";

export { routeIds, stablePathnames } from "./manifest.ts";
export type { RouteId, StablePathname } from "./manifest.ts";

export const siteUrl = "https://kaspa.org";
export const NEXT_INTL_LOCALE_HEADER = "x-next-intl-locale";
export type SiteSurfaceId = RouteId | "not-found";

type MessageNamespace = "errors";

type RouteDefinition = {
  id: RouteId;
  pathname: StablePathname;
  namespaces: readonly MessageNamespace[];
  metadata: {
    title: string;
    description: string;
  };
  sitemap: {
    changeFrequency: "weekly" | "monthly";
    priority: number;
  };
};

const routeDefinitions: Record<RouteId, RouteDefinition> = {
  home: {
    ...routeManifest.home,
    namespaces: [],
    metadata: {
      title: "Kaspa | Proof-of-Work blockDAG for Real-Time Decentralization",
      description:
        "Kaspa is a fair-launched proof-of-work blockDAG cryptocurrency running at 10 blocks per second, built for real-time decentralization.",
    },
    sitemap: { changeFrequency: "weekly", priority: 1 },
  },
  lore: {
    ...routeManifest.lore,
    namespaces: [],
    metadata: {
      title: "LORE | Kaspa",
      description:
        "Kaspa is a fair-launched proof-of-work blockDAG focused on real-time decentralization, with no premine, no insider allocation, and 10 BPS mainnet performance.",
    },
    sitemap: { changeFrequency: "monthly", priority: 0.8 },
  },
  build: {
    ...routeManifest.build,
    namespaces: [],
    metadata: {
      title: "Kaspa Developer Docs, SDKs, APIs, and Node Access | Kaspa",
      description:
        "Everything you need to start building on Kaspa. WASM SDK, Rust libraries, live API playground, node access, and developer tooling.",
    },
    sitemap: { changeFrequency: "weekly", priority: 0.9 },
  },
  assets: {
    ...routeManifest.assets,
    namespaces: [],
    metadata: {
      title: "Kaspa Logos & Assets | Kaspa",
      description:
        "Download the official Kaspa logo set — horizontal and stacked lockups, the icon, and brand colors. SVG and high-resolution PNG.",
    },
    sitemap: { changeFrequency: "monthly", priority: 0.7 },
  },
  hodl: {
    ...routeManifest.hodl,
    namespaces: [],
    metadata: {
      title: "Buy KAS, Set Up a Wallet, and Self-Custody | Kaspa",
      description: "Get a wallet, buy KAS, and transfer to self-custody.",
    },
    sitemap: { changeFrequency: "weekly", priority: 0.9 },
  },
};

const aiLocaleContracts: Record<SiteSurfaceId, Record<Locale, boolean>> = {
  home: { en: true },
  lore: { en: true },
  build: { en: true },
  assets: { en: false },
  hodl: { en: true },
  "not-found": { en: true },
};

export type RouteContext = {
  routeId: RouteId;
  pathname: StablePathname;
  locale: Locale;
  localeDefinition: LocaleDefinition;
  namespaces: readonly MessageNamespace[];
  canonicalPathname: string;
  canonicalUrl: string;
  languageAlternatives: Readonly<Record<string, string>>;
  availableInBuild: true;
};

export type RouteRequest = {
  routeId: RouteId;
  locale: Locale;
  stablePathname: StablePathname;
  hadLocalePrefix: boolean;
};

function normalizePathname(pathname: string): string | null {
  let decodedPathname: string;
  try {
    decodedPathname = decodeURI(pathname);
  } catch {
    return null;
  }

  if (/[\\\u0000-\u001f\u007f]/u.test(decodedPathname)) return null;

  const withLeadingSlash = decodedPathname.startsWith("/")
    ? decodedPathname
    : `/${decodedPathname}`;
  const normalized = withLeadingSlash.replace(/\/{2,}/gu, "/");

  if (normalized.length > 1 && normalized.endsWith("/")) {
    return normalized.slice(0, -1);
  }
  return normalized;
}

function localizePathname(pathname: StablePathname, locale: Locale): string {
  if (locale === defaultLocale) return pathname;
  return pathname === "/" ? `/${locale}` : `/${locale}${pathname}`;
}

export function getRouteDefinition(routeId: RouteId): RouteDefinition {
  return routeDefinitions[routeId];
}

export function resolveRouteRequest(pathname: string): RouteRequest | null {
  const normalized = normalizePathname(pathname);
  if (!normalized) return null;

  const segments = normalized.split("/").filter(Boolean);
  const candidateLocale = segments[0]?.toLowerCase();
  const hadLocalePrefix = isLocale(candidateLocale);
  const locale = hadLocalePrefix ? candidateLocale : defaultLocale;
  const routePathname = hadLocalePrefix
    ? segments.length === 1
      ? "/"
      : `/${segments.slice(1).join("/")}`
    : normalized;
  const routeId = getRouteIdForPathname(routePathname);

  return routeId
    ? {
        routeId,
        locale,
        stablePathname: routeDefinitions[routeId].pathname,
        hadLocalePrefix,
      }
    : null;
}

export function resolvePublishedRoute(
  routeId: RouteId,
  locale: Locale,
): RouteContext | null {
  if (!isRoutePublished(routeId, locale)) return null;

  const definition = routeDefinitions[routeId];
  const canonicalPathname = localizePathname(definition.pathname, locale);
  const languageAlternatives = Object.fromEntries(
    listPublishedLocales(routeId).map((publishedLocale) => {
      const localeDefinition = getLocaleDefinition(publishedLocale);
      return [
        localeDefinition.hrefLang,
        `${siteUrl}${localizePathname(definition.pathname, publishedLocale)}`,
      ];
    }),
  );

  return {
    routeId,
    pathname: definition.pathname,
    locale,
    localeDefinition: getLocaleDefinition(locale),
    namespaces: definition.namespaces,
    canonicalPathname,
    canonicalUrl: `${siteUrl}${canonicalPathname === "/" ? "" : canonicalPathname}`,
    languageAlternatives,
    availableInBuild: true,
  };
}

export function listPublishedLocales(routeId: RouteId): readonly Locale[] {
  return getEnabledLocaleCodes().filter((locale) =>
    isRoutePublished(routeId, locale),
  );
}

export function listEnabledLocales(): readonly Locale[] {
  return getEnabledLocaleCodes();
}

export function listPublishedRoutes(): readonly RouteContext[] {
  return routeIds.flatMap((routeId) =>
    listPublishedLocales(routeId).map((locale) => {
      const route = resolvePublishedRoute(routeId, locale);
      if (!route) {
        throw new Error(
          `Publication invariant failed for ${routeId}:${locale}`,
        );
      }
      return route;
    }),
  );
}

export async function loadMessages(locale: Locale) {
  switch (locale) {
    case "en":
      return {
        errors: (await import("../../messages/en/errors.json")).default,
      };
  }
}

const socialImage = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Kaspa — Real-time Decentralization",
} as const;

export function createRouteMetadata(
  routeId: RouteId,
  locale: Locale,
): Metadata | null {
  const route = resolvePublishedRoute(routeId, locale);
  if (!route) return null;

  const definition = routeDefinitions[routeId];
  const publishedLocales = listPublishedLocales(routeId);
  const languages =
    publishedLocales.length > 1
      ? {
          ...route.languageAlternatives,
          "x-default": resolvePublishedRoute(routeId, defaultLocale)
            ?.canonicalUrl,
        }
      : undefined;
  const imagePathname =
    locale === defaultLocale
      ? "/opengraph-image"
      : `/${locale}/opengraph-image`;
  const image = { ...socialImage, url: imagePathname };
  const openGraphImage =
    routeId === "home" ? { ...image, type: "image/png" as const } : image;

  return {
    metadataBase: new URL(siteUrl),
    title: definition.metadata.title,
    description: definition.metadata.description,
    applicationName: "Kaspa",
    alternates: {
      canonical: route.canonicalPathname,
      languages,
    },
    openGraph: {
      title: definition.metadata.title,
      description: definition.metadata.description,
      type: "website",
      url: route.canonicalPathname,
      siteName: "Kaspa",
      images: [openGraphImage],
    },
    twitter: {
      card: "summary_large_image",
      title: definition.metadata.title,
      description: definition.metadata.description,
      images:
        routeId === "home"
          ? [{ ...image, type: "image/png" }]
          : [imagePathname],
    },
  };
}

export function isAiAvailable(
  surfaceId: SiteSurfaceId,
  locale: Locale,
): boolean {
  return isAiDeploymentEnabled && aiLocaleContracts[surfaceId][locale];
}

const organizationId = `${siteUrl}#organization`;
const websiteId = `${siteUrl}#website`;

export const structuredDataSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": organizationId,
      name: "Kaspa",
      url: siteUrl,
      logo: `${siteUrl}/kaspa-logo.svg`,
      description:
        "Kaspa is a fair-launched proof-of-work blockDAG cryptocurrency running at 10 blocks per second, built for real-time decentralization.",
      sameAs: [
        "https://github.com/kaspanet/rusty-kaspa/",
        "https://t.me/kasparnd",
      ],
    },
    {
      "@type": "WebSite",
      "@id": websiteId,
      name: "Kaspa",
      url: siteUrl,
      alternateName: ["kaspa.org"],
      publisher: { "@id": organizationId },
    },
  ],
} as const;
