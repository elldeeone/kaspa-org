import errors from "../../messages/en/errors.json" with { type: "json" };
import home from "../../messages/en/home.json" with { type: "json" };
import shared from "../../messages/en/shared.json" with { type: "json" };

import { isPseudoLocaleEnabled, pseudoLocale, type Locale } from "./config.ts";
import { pseudoLocalizeCatalog } from "./pseudo.ts";

export const englishMessages = { errors, home, shared } as const;
export type AppMessages = typeof englishMessages;
export type MessageNamespace = keyof AppMessages;
export type LocaleMessages = Pick<AppMessages, "errors" | "shared"> &
  Partial<Omit<AppMessages, "errors" | "shared">>;

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

export function getSharedClientMessages(locale: Locale) {
  const { footer, logoMenu, navigation, theme } = getMessages(locale).shared;
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
