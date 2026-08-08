import type { Metadata } from "next";

import {
  listEnabledLocales as getEnabledLocaleCodes,
  listSelectableLocales as getSelectableLocaleCodes,
} from "./config.ts";
import {
  defaultLocale,
  getLocaleDefinition,
  type Locale,
  type LocaleDefinition,
} from "./locale-registry.ts";
import {
  routeIds,
  routeManifest,
  type RouteId,
  type StablePathname,
} from "./manifest.ts";
import {
  getMessages,
  getRouteMessages,
  type MessageNamespace,
} from "./messages.ts";
import { createOpenGraphImageDescriptor } from "./opengraph-contract.ts";
import { localizePathname } from "./pathname.ts";
import {
  getRoutePublication,
  isRouteDiscoverable,
  isRoutePublished,
} from "./publication.ts";
import type { RoutePublication } from "./publication-profile-contract.ts";
export const siteUrl = "https://kaspa.org";

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

export function getRouteDefinition(routeId: RouteId) {
  return routeManifest[routeId];
}

export function resolvePublishedRoute(
  routeId: RouteId,
  locale: Locale,
): RouteContext | null {
  const publication = getRoutePublication(routeId, locale);
  if (!publication) return null;

  const definition = getRouteDefinition(routeId);
  const canonicalPathname = localizePathname(definition.pathname, locale);
  if (!canonicalPathname) {
    throw new Error(`Unable to localize ${definition.pathname} for ${locale}`);
  }
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
