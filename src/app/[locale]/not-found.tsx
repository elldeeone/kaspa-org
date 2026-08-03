import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";

import NotFoundContent from "@/app/components/NotFoundContent";
import { defaultLocale, isLocale } from "@/i18n/config";
import { isAiAvailable } from "@/i18n/site";

async function resolveLocale() {
  const requestLocale = await getLocale();
  return isLocale(requestLocale) ? requestLocale : defaultLocale;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveLocale();
  const t = await getTranslations({ locale, namespace: "errors" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: null },
    openGraph: null,
    twitter: null,
    robots: { index: false, follow: false },
  };
}

export default async function LocalizedNotFound() {
  const locale = await resolveLocale();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "errors" });

  return (
    <NotFoundContent
      aiAvailable={isAiAvailable("not-found", locale)}
      messages={{
        code: t("code"),
        heading: t("heading"),
        body: t("body"),
        home: t("home"),
      }}
    />
  );
}
