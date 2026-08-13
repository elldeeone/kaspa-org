import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { isLocale } from "@/i18n/config";
import { siteViewport } from "@/i18n/document";
import { defaultLocale, getLocaleDefinition } from "@/i18n/locale-registry";
import { getSharedClientMessages } from "@/i18n/messages";
import { createStructuredData, siteUrl } from "@/i18n/site";
import { isAiAvailable } from "@/i18n/site-capabilities";

import NotFoundContent from "./components/NotFoundContent";
import {
  SiteDocumentContent,
  getSiteDocumentBodyClassName,
  StructuredDataScript,
} from "./document-shell";
import "./globals.css";

export const viewport = siteViewport;

async function resolveNotFoundLocale() {
  const requestLocale = await getLocale();
  return isLocale(requestLocale) ? requestLocale : defaultLocale;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveNotFoundLocale();
  const t = await getTranslations({ locale, namespace: "errors" });

  return {
    metadataBase: new URL(siteUrl),
    title: t("metadata.title"),
    description: t("metadata.description"),
    applicationName: "Kaspa",
    alternates: { canonical: null },
    openGraph: null,
    twitter: null,
    robots: { index: false, follow: false },
  };
}

export default async function GlobalNotFound() {
  const localeCode = await resolveNotFoundLocale();
  const locale = getLocaleDefinition(localeCode);
  const t = await getTranslations({ locale: localeCode, namespace: "errors" });
  const sharedMessages = getSharedClientMessages(localeCode);
  const structuredData = createStructuredData(localeCode);

  return (
    <html
      lang={locale.code}
      dir={locale.dir}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <head>
        <StructuredDataScript data={structuredData} />
      </head>
      <body className={getSiteDocumentBodyClassName(locale.code)}>
        <SiteDocumentContent locale={locale.code} messages={sharedMessages}>
          <NotFoundContent
            global
            locale={locale.code}
            aiAvailable={isAiAvailable("not-found", locale.code)}
            messages={{
              code: t("page.code"),
              heading: t("page.heading"),
              body: t("page.body"),
              home: t("page.home"),
            }}
          />
        </SiteDocumentContent>
      </body>
    </html>
  );
}
