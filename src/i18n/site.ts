import type { Metadata } from "next";

import {
  defaultLocale,
  getLocaleDefinition,
  isAiDeploymentEnabled,
  isLocaleProductionReady,
  listEnabledLocales as getEnabledLocaleCodes,
  listSelectableLocales as getSelectableLocaleCodes,
  type Locale,
  type LocaleDefinition,
} from "./config.ts";
import {
  getRoutePublication,
  getRouteIdForPathname,
  isRouteDiscoverable,
  isRoutePublished,
  localizedDestinationInventory,
  routeIds,
  routeManifest,
  type RoutePublication,
  type RouteId,
  type StablePathname,
} from "./manifest.ts";
import {
  getMessages,
  getRouteMessages,
  loadMessages,
  type MessageNamespace,
} from "./messages.ts";
import { createOpenGraphImageDescriptor } from "./opengraph-contract.ts";

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
  sitemap: {
    changeFrequency: "weekly" | "monthly";
    priority: number;
  };
};

const routeDefinitions: Record<RouteId, RouteDefinition> = {
  home: {
    ...routeManifest.home,
    namespaces: ["shared", "home"],
    sitemap: { changeFrequency: "weekly", priority: 1 },
  },
  lore: {
    ...routeManifest.lore,
    namespaces: ["shared", "lore"],
    sitemap: { changeFrequency: "monthly", priority: 0.8 },
  },
  build: {
    ...routeManifest.build,
    namespaces: ["shared", "build"],
    sitemap: { changeFrequency: "weekly", priority: 0.9 },
  },
  assets: {
    ...routeManifest.assets,
    namespaces: ["shared", "assets"],
    sitemap: { changeFrequency: "monthly", priority: 0.7 },
  },
  hodl: {
    ...routeManifest.hodl,
    namespaces: ["shared", "hodl"],
    sitemap: { changeFrequency: "weekly", priority: 0.9 },
  },
};

const aiLocaleContracts: Record<SiteSurfaceId, Record<Locale, boolean>> = {
  home: { en: true, "en-XA": false, es: false },
  lore: { en: true, "en-XA": false, es: false },
  build: { en: true, "en-XA": false, es: false },
  assets: { en: false, "en-XA": false, es: false },
  hodl: { en: true, "en-XA": false, es: false },
  "not-found": { en: true, "en-XA": false, es: false },
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

export function listSelectableLocales(): readonly Locale[] {
  return getSelectableLocaleCodes();
}

export function listDiscoverableLocales(routeId: RouteId): readonly Locale[] {
  return getEnabledLocaleCodes().filter((locale) =>
    isRouteDiscoverable(routeId, locale),
  );
}

export function listProductionLocales(): readonly Locale[] {
  return getEnabledLocaleCodes().filter(isLocaleProductionReady);
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

  const routeMessages = getRouteMessages(locale, routeId);
  const metadata = routeMessages.metadata;
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
  const image = createOpenGraphImageDescriptor(routeId, locale);

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
          images: [image],
        },
    twitter: isPrivate
      ? undefined
      : {
          card: "summary_large_image",
          title: metadata.title,
          description: metadata.description,
          images: routeId === "home" ? [image] : [image.url],
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

function assertRouteContentComplete(routeId: RouteId, locale: Locale): void {
  const definition = getRouteDefinition(routeId);
  if (
    !definition.namespaces.includes("shared") ||
    !definition.namespaces.includes(routeId)
  ) {
    throw new Error(
      `${routeId}:${locale} is missing its shared or route message namespace`,
    );
  }

  const routeMessages = getRouteMessages(locale, routeId);
  if (
    !routeMessages.metadata.title ||
    !routeMessages.metadata.description ||
    !routeMessages.openGraph.imageAlt
  ) {
    throw new Error(
      `${routeId}:${locale} is missing metadata or Open Graph copy`,
    );
  }
}

export function assertPreviewLocaleComplete(locale: Locale): void {
  if (isLocaleProductionReady(locale)) {
    throw new Error(`${locale} is production-ready rather than preview-only`);
  }
  for (const routeId of routeIds) {
    if (getRoutePublication(routeId, locale) !== "preview") {
      throw new Error(
        `${locale} is not preview-published for the complete route set: ${routeId}`,
      );
    }
    if (isRouteDiscoverable(routeId, locale)) {
      throw new Error(`${routeId}:${locale} must remain private`);
    }

    assertRouteContentComplete(routeId, locale);
    if (aiLocaleContracts[routeId][locale] !== false) {
      throw new Error(
        `${routeId}:${locale} must explicitly disable AI while it is private`,
      );
    }
  }
}

export function assertProductionLocaleComplete(
  locale: Locale,
  resolvePublication: typeof getRoutePublication = getRoutePublication,
): void {
  if (!isLocaleProductionReady(locale)) {
    throw new Error(`${locale} is not marked production-ready`);
  }
  if (!getSelectableLocaleCodes().includes(locale)) {
    throw new Error(
      `${locale} is production-ready but missing from the selector`,
    );
  }

  for (const [surface, destination] of Object.entries(
    localizedDestinationInventory,
  )) {
    const destinationRouteId = getRouteIdForPathname(destination.pathname);
    if (
      !destinationRouteId ||
      resolvePublication(destinationRouteId, locale) !== "public"
    ) {
      throw new Error(
        `${surface}:${locale} requires public destination ${destination.pathname}`,
      );
    }
  }

  for (const routeId of routeIds) {
    if (resolvePublication(routeId, locale) !== "public") {
      throw new Error(
        `${locale} is not publicly available for the complete route set: ${routeId}`,
      );
    }
    if (!isRouteDiscoverable(routeId, locale)) {
      throw new Error(`${routeId}:${locale} is not discoverable`);
    }

    assertRouteContentComplete(routeId, locale);
    if (typeof aiLocaleContracts[routeId][locale] !== "boolean") {
      throw new Error(
        `${routeId}:${locale} is missing an explicit AI capability decision`,
      );
    }
  }

  const messages = getMessages(locale);
  if (!messages.shared || !messages.errors) {
    throw new Error(`${locale} is missing its shared or error catalog`);
  }
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
