"use client";

import { useId } from "react";
import { useLocale, useTranslations } from "next-intl";

import { isLocaleRouteSetComplete } from "@/i18n/manifest";
import { usePathname } from "@/i18n/navigation";
import { shouldBypassLocaleRouting } from "@/i18n/proxy-policy";

import {
  buildLanguageHref,
  isLanguageSelectorLocale,
  LANGUAGE_SELECTOR_OPTIONS,
  shouldShowLanguageSelector,
  type LanguageSelectorLocale,
} from "./languageSelector";

const selectorEnabled = shouldShowLanguageSelector(
  LANGUAGE_SELECTOR_OPTIONS,
  isLocaleRouteSetComplete,
);

function EnabledLanguageSelector({
  showLabel = false,
}: {
  showLabel?: boolean;
}): React.JSX.Element | null {
  const id = useId();
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("shared.navigation.language");

  if (
    !selectorEnabled ||
    !isLanguageSelectorLocale(locale) ||
    shouldBypassLocaleRouting(pathname)
  ) {
    return null;
  }

  const navigateToLocale = (nextLocale: LanguageSelectorLocale) => {
    if (nextLocale === locale) return;

    window.location.assign(
      buildLanguageHref(
        pathname,
        nextLocale,
        window.location.search,
        window.location.hash,
      ),
    );
  };

  return (
    <div
      className={
        showLabel
          ? "flex w-full items-center justify-between gap-4"
          : "relative shrink-0"
      }
    >
      <label
        htmlFor={id}
        className={showLabel ? "text-secondary text-[15px]" : "sr-only"}
      >
        {t("label")}
      </label>
      <select
        id={id}
        data-language-selector=""
        value={locale}
        onChange={(event) => {
          const nextLocale = event.currentTarget.value;
          if (isLanguageSelectorLocale(nextLocale)) {
            navigateToLocale(nextLocale);
          }
        }}
        className={`border-subtle text-secondary hover:text-primary focus-visible:ring-primary cursor-pointer rounded-lg border bg-[var(--surface)] px-2 text-[13px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
          showLabel ? "h-11 w-[132px]" : "h-10 w-[108px]"
        }`}
      >
        {LANGUAGE_SELECTOR_OPTIONS.map((option) => (
          <option key={option.code} value={option.code} lang={option.hrefLang}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function LanguageSelector({
  showLabel = false,
}: {
  showLabel?: boolean;
}): React.JSX.Element | null {
  if (!selectorEnabled) return null;
  return <EnabledLanguageSelector showLabel={showLabel} />;
}
