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
import germanAssets from "../../messages/de/assets.json" with { type: "json" };
import germanBuild from "../../messages/de/build.json" with { type: "json" };
import germanErrors from "../../messages/de/errors.json" with { type: "json" };
import germanHodl from "../../messages/de/hodl.json" with { type: "json" };
import germanHome from "../../messages/de/home.json" with { type: "json" };
import germanLore from "../../messages/de/lore.json" with { type: "json" };
import germanShared from "../../messages/de/shared.json" with { type: "json" };
import frenchAssets from "../../messages/fr/assets.json" with { type: "json" };
import frenchBuild from "../../messages/fr/build.json" with { type: "json" };
import frenchErrors from "../../messages/fr/errors.json" with { type: "json" };
import frenchHodl from "../../messages/fr/hodl.json" with { type: "json" };
import frenchHome from "../../messages/fr/home.json" with { type: "json" };
import frenchLore from "../../messages/fr/lore.json" with { type: "json" };
import frenchShared from "../../messages/fr/shared.json" with { type: "json" };
import chineseAssets from "../../messages/zh-CN/assets.json" with { type: "json" };
import chineseBuild from "../../messages/zh-CN/build.json" with { type: "json" };
import chineseErrors from "../../messages/zh-CN/errors.json" with { type: "json" };
import chineseHodl from "../../messages/zh-CN/hodl.json" with { type: "json" };
import chineseHome from "../../messages/zh-CN/home.json" with { type: "json" };
import chineseLore from "../../messages/zh-CN/lore.json" with { type: "json" };
import chineseShared from "../../messages/zh-CN/shared.json" with { type: "json" };
import russianAssets from "../../messages/ru/assets.json" with { type: "json" };
import russianBuild from "../../messages/ru/build.json" with { type: "json" };
import russianErrors from "../../messages/ru/errors.json" with { type: "json" };
import russianHodl from "../../messages/ru/hodl.json" with { type: "json" };
import russianHome from "../../messages/ru/home.json" with { type: "json" };
import russianLore from "../../messages/ru/lore.json" with { type: "json" };
import russianShared from "../../messages/ru/shared.json" with { type: "json" };

import {
  isLocaleEnabled,
  isPseudoLocaleEnabled,
  listSelectableLocales,
} from "./config.ts";
import {
  chineseLocale,
  frenchLocale,
  germanLocale,
  pseudoLocale,
  russianLocale,
  spanishLocale,
  type Locale,
} from "./locale-registry.ts";
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

export const germanMessages = {
  assets: germanAssets,
  build: germanBuild,
  errors: germanErrors,
  hodl: germanHodl,
  home: germanHome,
  lore: germanLore,
  shared: germanShared,
} satisfies AppMessages;

export const frenchMessages = {
  assets: frenchAssets,
  build: frenchBuild,
  errors: frenchErrors,
  hodl: frenchHodl,
  home: frenchHome,
  lore: frenchLore,
  shared: frenchShared,
} satisfies AppMessages;

export const chineseMessages = {
  assets: chineseAssets,
  build: chineseBuild,
  errors: chineseErrors,
  hodl: chineseHodl,
  home: chineseHome,
  lore: chineseLore,
  shared: chineseShared,
} satisfies AppMessages;

export const russianMessages = {
  assets: russianAssets,
  build: russianBuild,
  errors: russianErrors,
  hodl: russianHodl,
  home: russianHome,
  lore: russianLore,
  shared: russianShared,
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
    case germanLocale:
      if (!isLocaleEnabled(germanLocale)) {
        throw new Error(
          `${germanLocale} messages are unavailable in this build target`,
        );
      }
      return germanMessages;
    case frenchLocale:
      if (!isLocaleEnabled(frenchLocale)) {
        throw new Error(
          `${frenchLocale} messages are unavailable in this build target`,
        );
      }
      return frenchMessages;
    case chineseLocale:
      if (!isLocaleEnabled(chineseLocale)) {
        throw new Error(
          `${chineseLocale} messages are unavailable in this build target`,
        );
      }
      return chineseMessages;
    case russianLocale:
      if (!isLocaleEnabled(russianLocale)) {
        throw new Error(
          `${russianLocale} messages are unavailable in this build target`,
        );
      }
      return russianMessages;
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
