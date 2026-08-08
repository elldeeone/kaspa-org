import {
  getLocaleLifecycle,
  isLocaleProductionReady,
  listEnabledLocales,
  listSelectableLocales,
} from "./config.ts";
import type { Locale } from "./locale-registry.ts";
import {
  getRouteIdForPathname,
  localizedDestinationInventory,
  routeIds,
  routeManifest,
} from "./manifest.ts";
import { getMessages, getRouteMessages } from "./messages.ts";
import { getRoutePublication, isRouteDiscoverable } from "./publication.ts";
import type { RoutePublication } from "./publication-profile-contract.ts";
import {
  getAiLocaleDecision,
  hasAiLocaleDecision,
} from "./site-capabilities.ts";

function assertRouteContentComplete(
  routeId: (typeof routeIds)[number],
  locale: Locale,
): void {
  const definition = routeManifest[routeId];
  if (
    definition.namespaces[0] !== "shared" ||
    definition.namespaces[1] !== routeId
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

export function listProductionLocales(): readonly Locale[] {
  return listEnabledLocales().filter((locale) =>
    isLocaleProductionReady(locale),
  );
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
    if (getAiLocaleDecision(routeId, locale) !== false) {
      throw new Error(
        `${routeId}:${locale} must explicitly disable AI while it is private`,
      );
    }
  }
}

export function assertProductionLocaleComplete(
  locale: Locale,
  resolvePublication: (
    routeId: (typeof routeIds)[number],
    locale: Locale,
  ) => RoutePublication | null = getRoutePublication,
): void {
  if (getLocaleLifecycle(locale) !== "production") {
    throw new Error(`${locale} is not marked production-ready`);
  }
  if (!listSelectableLocales().includes(locale)) {
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
    if (!hasAiLocaleDecision(routeId, locale)) {
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
