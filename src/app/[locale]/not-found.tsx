import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";

import NotFoundContent from "@/app/components/NotFoundContent";
import { isLocale } from "@/i18n/config";
import { defaultLocale } from "@/i18n/locale-registry";

async function resolveLocale() {
  const requestLocale = await getLocale();
  return isLocale(requestLocale) ? requestLocale : defaultLocale;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveLocale();
  const t = await getTranslations({ locale, namespace: "errors" });
  return {
    title: t("metadata.title"),
    description: t("metadata.description"),
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
      locale={locale}
      // Next serializes this segment boundary into every localized route.
      // Keep the launcher on global-not-found without leaking its catalog here.
      aiAvailable={false}
      messages={{
        code: t("page.code"),
        heading: t("page.heading"),
        body: t("page.body"),
        home: t("page.home"),
      }}
    />
  );
}
