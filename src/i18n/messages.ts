import assets from "../../messages/en/assets.json" with { type: "json" };
import build from "../../messages/en/build.json" with { type: "json" };
import errors from "../../messages/en/errors.json" with { type: "json" };
import hodl from "../../messages/en/hodl.json" with { type: "json" };
import home from "../../messages/en/home.json" with { type: "json" };
import lore from "../../messages/en/lore.json" with { type: "json" };
import shared from "../../messages/en/shared.json" with { type: "json" };
import spanishAssets from "../../messages/es/assets.json" with { type: "json" };
import spanishBuild from "../../messages/es/build.json" with { type: "json" };
import spanishErrors from "../../messages/es/errors.json" with { type: "json" };
import spanishHodl from "../../messages/es/hodl.json" with { type: "json" };
import spanishHome from "../../messages/es/home.json" with { type: "json" };
import spanishLore from "../../messages/es/lore.json" with { type: "json" };
import spanishShared from "../../messages/es/shared.json" with { type: "json" };

import {
  isLocaleEnabled,
  isPseudoLocaleEnabled,
  listSelectableLocales,
  pseudoLocale,
  spanishLocale,
  type Locale,
} from "./config.ts";
import type { RouteId } from "./manifest.ts";
import { pseudoLocalizeCatalog } from "./pseudo.ts";

export const englishMessages = {
  assets,
  build,
  errors,
  hodl,
  home,
  lore,
  shared,
} as const;
export type AppMessages = typeof englishMessages;
export type MessageNamespace = keyof AppMessages;
export type LocaleMessages = Pick<AppMessages, "errors" | "shared"> &
  Partial<Omit<AppMessages, "errors" | "shared">>;

export const spanishMessages = {
  assets: spanishAssets,
  build: spanishBuild,
  errors: spanishErrors,
  hodl: spanishHodl,
  home: spanishHome,
  lore: spanishLore,
  shared: spanishShared,
} satisfies AppMessages;

let generatedPseudoMessages: AppMessages | null = null;

function assertNever(value: never): never {
  throw new Error(`Unsupported locale: ${String(value)}`);
}

export function getMessages(locale: Locale): LocaleMessages {
  switch (locale) {
    case "en":
      return englishMessages;
    case pseudoLocale:
      if (!isPseudoLocaleEnabled) {
        throw new Error(
          `${pseudoLocale} messages are unavailable in production builds`,
        );
      }
      generatedPseudoMessages ??= pseudoLocalizeCatalog(englishMessages);
      return generatedPseudoMessages;
    case spanishLocale:
      if (!isLocaleEnabled(spanishLocale)) {
        throw new Error(
          `${spanishLocale} messages are unavailable in this build target`,
        );
      }
      return spanishMessages;
    default:
      return assertNever(locale);
  }
}

export async function loadMessages(locale: Locale): Promise<LocaleMessages> {
  return getMessages(locale);
}

export function getHomeMessages(locale: Locale): AppMessages["home"] {
  const messages = getMessages(locale).home;
  if (!messages) {
    throw new Error(`The home catalog is unavailable for locale ${locale}`);
  }
  return messages;
}

export function getRouteMessages<Route extends RouteId>(
  locale: Locale,
  routeId: Route,
): AppMessages[Route] {
  const messages = getMessages(locale)[routeId];
  if (!messages) {
    throw new Error(
      `The ${routeId} catalog is unavailable for locale ${locale}`,
    );
  }
  return messages as AppMessages[Route];
}

export function getSharedClientMessages(locale: Locale) {
  const { footer, logoMenu, navigation, theme } = getMessages(locale).shared;
  if (listSelectableLocales().length <= 1) {
    return {
      shared: {
        footer,
        logoMenu,
        navigation: {
          homeAria: navigation.homeAria,
          toggleMenu: navigation.toggleMenu,
          menu: navigation.menu,
          links: navigation.links,
        },
        theme,
      },
    };
  }
  return {
    shared: { footer, logoMenu, navigation, theme },
  };
}

export function getAiClientMessages(locale: Locale) {
  const { ai } = getMessages(locale).shared;
  return {
    shared: { ai },
  };
}

export function getBuildClientMessages(locale: Locale) {
  const {
    access,
    developments,
    help,
    navigation,
    paths,
    runNode,
    start,
    terms,
    tooling,
    tryLive,
  } = getRouteMessages(locale, "build");
  const { pageSections } = getMessages(locale).shared;
  return {
    build: {
      access,
      developments,
      help,
      navigation,
      paths,
      runNode,
      start,
      terms,
      tooling,
      tryLive,
    },
    shared: { pageSections },
  };
}

export function getHodlClientMessages(locale: Locale) {
  const {
    buy,
    help,
    media,
    navigation,
    start,
    transfer,
    wallet,
    walletFinder,
  } = getRouteMessages(locale, "hodl");
  const { pageSections } = getMessages(locale).shared;
  return {
    hodl: {
      buy,
      help,
      media,
      navigation,
      start,
      transfer,
      wallet,
      walletFinder,
    },
    shared: { pageSections },
  };
}

export function getHomeClientLabels(locale: Locale) {
  const { hero, proof } = getHomeMessages(locale);
  return {
    dagAnnotation: hero.dagAnnotation,
    proof: {
      trigger: proof.trigger,
      loading: proof.loader.loading,
      error: proof.loader.error,
      retry: proof.loader.retry,
      back: proof.chrome.back,
      title: proof.chrome.title,
    },
  };
}

export function getHomeProofClientMessages(locale: Locale) {
  const { proof } = getHomeMessages(locale);
  return { home: { proof } };
}
