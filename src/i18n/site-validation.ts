import { supportedLocaleCodes, type Locale } from "./locale-registry.ts";
import {
  getRouteIdForPathname,
  localizedDestinationInventory,
  routeIds,
  routeManifest,
} from "./manifest.ts";
import { getMessages, getRouteMessages } from "./messages.ts";
import { hasAiLocaleDecision } from "./site-capabilities.ts";

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

export function assertLocaleComplete(locale: Locale): void {
  if (!supportedLocaleCodes.includes(locale)) {
    throw new Error(`${locale} is not registered`);
  }

  for (const [surface, destination] of Object.entries(
    localizedDestinationInventory,
  )) {
    const destinationRouteId = getRouteIdForPathname(destination.pathname);
    if (!destinationRouteId) {
      throw new Error(
        `${surface}:${locale} requires known destination ${destination.pathname}`,
      );
    }
  }

  for (const routeId of routeIds) {
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
