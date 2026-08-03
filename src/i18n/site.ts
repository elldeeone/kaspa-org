import type { Metadata } from "next";

import {
  defaultLocale,
  getLocaleDefinition,
  isAiDeploymentEnabled,
  listEnabledLocales as getEnabledLocaleCodes,
  type Locale,
  type LocaleDefinition,
} from "./config.ts";
import {
  getRoutePublication,
  isRouteDiscoverable,
  isRoutePublished,
  routeIds,
  routeManifest,
  type RoutePublication,
  type RouteId,
  type StablePathname,
} from "./manifest.ts";
import {
  getHomeMessages,
  getMessages,
  loadMessages,
  type MessageNamespace,
} from "./messages.ts";

export { routeIds, stablePathnames } from "./manifest.ts";
export type { RouteId, StablePathname } from "./manifest.ts";
export {
  NEXT_INTL_LOCALE_HEADER,
  resolveRouteRequest,
} from "./route-request.ts";
export type { RouteRequest } from "./route-request.ts";

export const siteUrl = "https://kaspa.org";
export type SiteSurfaceId = RouteId | "not-found";

type RouteDefinition = {
  id: RouteId;
  pathname: StablePathname;
  namespaces: readonly MessageNamespace[];
  metadata: { title: string; description: string } | null;
  sitemap: {
    changeFrequency: "weekly" | "monthly";
    priority: number;
  };
};

const routeDefinitions: Record<RouteId, RouteDefinition> = {
  home: {
    ...routeManifest.home,
    namespaces: ["shared", "home"],
    metadata: null,
    sitemap: { changeFrequency: "weekly", priority: 1 },
  },
  lore: {
    ...routeManifest.lore,
    namespaces: ["shared"],
    metadata: {
      title: "LORE | Kaspa",
      description:
        "Kaspa is a fair-launched proof-of-work blockDAG focused on real-time decentralization, with no premine, no insider allocation, and 10 BPS mainnet performance.",
    },
    sitemap: { changeFrequency: "monthly", priority: 0.8 },
  },
  build: {
    ...routeManifest.build,
    namespaces: ["shared"],
    metadata: {
      title: "Kaspa Developer Docs, SDKs, APIs, and Node Access | Kaspa",
      description:
        "Everything you need to start building on Kaspa. WASM SDK, Rust libraries, live API playground, node access, and developer tooling.",
    },
    sitemap: { changeFrequency: "weekly", priority: 0.9 },
  },
  assets: {
    ...routeManifest.assets,
    namespaces: ["shared"],
    metadata: {
      title: "Kaspa Logos & Assets | Kaspa",
      description:
        "Download the official Kaspa logo set — horizontal and stacked lockups, the icon, and brand colors. SVG and high-resolution PNG.",
    },
    sitemap: { changeFrequency: "monthly", priority: 0.7 },
  },
  hodl: {
    ...routeManifest.hodl,
    namespaces: ["shared"],
    metadata: {
      title: "Buy KAS, Set Up a Wallet, and Self-Custody | Kaspa",
      description: "Get a wallet, buy KAS, and transfer to self-custody.",
    },
    sitemap: { changeFrequency: "weekly", priority: 0.9 },
  },
};

const aiLocaleContracts: Record<SiteSurfaceId, Record<Locale, boolean>> = {
  home: { en: true, "en-XA": false },
  lore: { en: true, "en-XA": false },
  build: { en: true, "en-XA": false },
  assets: { en: false, "en-XA": false },
  hodl: { en: true, "en-XA": false },
  "not-found": { en: true, "en-XA": false },
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
  publication: RoutePublication;
  availableInBuild: true;
};

function localizePathname(pathname: StablePathname, locale: Locale): string {
  if (locale === defaultLocale) return pathname;
  return pathname === "/" ? `/${locale}` : `/${locale}${pathname}`;
}

export function getRouteDefinition(routeId: RouteId): RouteDefinition {
  return routeDefinitions[routeId];
}

export function resolvePublishedRoute(
  routeId: RouteId,
  locale: Locale,
): RouteContext | null {
  const publication = getRoutePublication(routeId, locale);
  if (!publication) return null;

  const definition = routeDefinitions[routeId];
  const canonicalPathname = localizePathname(definition.pathname, locale);
  const languageAlternatives = Object.fromEntries(
    listDiscoverableLocales(routeId).map((publishedLocale) => {
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
    publication,
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

export function listDiscoverableLocales(routeId: RouteId): readonly Locale[] {
  return getEnabledLocaleCodes().filter((locale) =>
    isRouteDiscoverable(routeId, locale),
  );
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

export function listDiscoverableRoutes(): readonly RouteContext[] {
  return listPublishedRoutes().filter(
    (route) => route.publication === "public",
  );
}

export { loadMessages };

export function createRouteMetadata(
  routeId: RouteId,
  locale: Locale,
): Metadata | null {
  const route = resolvePublishedRoute(routeId, locale);
  if (!route) return null;

  const definition = routeDefinitions[routeId];
  const localizedHome = routeId === "home" ? getHomeMessages(locale) : null;
  const metadata = localizedHome?.metadata ?? definition.metadata;
  if (!metadata) {
    throw new Error(`Metadata is not configured for ${routeId}:${locale}`);
  }
  const publishedLocales = listDiscoverableLocales(routeId);
  const languages =
    publishedLocales.length > 1
      ? {
          ...route.languageAlternatives,
          "x-default": resolvePublishedRoute(routeId, defaultLocale)
            ?.canonicalUrl,
        }
      : undefined;
  const isPrivate = route.publication === "preview";
  const imagePathname =
    routeId !== "home" || locale === defaultLocale
      ? "/opengraph-image"
      : `/${locale}/opengraph-image`;
  const imageCopy =
    localizedHome?.openGraph ?? getHomeMessages(defaultLocale).openGraph;
  const image = {
    url: imagePathname,
    width: 1200,
    height: 630,
    alt: imageCopy.imageAlt,
  } as const;
  const openGraphImage =
    routeId === "home" ? { ...image, type: "image/png" as const } : image;

  return {
    metadataBase: new URL(siteUrl),
    title: metadata.title,
    description: metadata.description,
    applicationName: "Kaspa",
    alternates: {
      canonical: isPrivate ? null : route.canonicalPathname,
      languages: isPrivate ? undefined : languages,
    },
    openGraph: isPrivate
      ? undefined
      : {
          title: metadata.title,
          description: metadata.description,
          type: "website",
          url: route.canonicalPathname,
          siteName: "Kaspa",
          images: [openGraphImage],
        },
    twitter: isPrivate
      ? undefined
      : {
          card: "summary_large_image",
          title: metadata.title,
          description: metadata.description,
          images:
            routeId === "home"
              ? [{ ...image, type: "image/png" }]
              : [imagePathname],
        },
    robots: isPrivate ? { index: false, follow: false } : undefined,
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

export function createStructuredData(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: "Kaspa",
        url: siteUrl,
        logo: `${siteUrl}/kaspa-logo.svg`,
        description:
          getMessages(locale).shared.structuredData.organizationDescription,
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
}
