import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";

import { defaultLocale, getLocaleDefinition, isLocale } from "@/i18n/config";
import { siteViewport } from "@/i18n/document";
import { isAiAvailable, siteUrl, structuredDataSchema } from "@/i18n/site";

import NotFoundContent from "./components/NotFoundContent";
import "./globals.css";
import Providers from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  preload: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

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
    title: t("title"),
    description: t("description"),
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

  return (
    <html
      lang={locale.code}
      dir={locale.dir}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredDataSchema),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextIntlClientProvider locale={locale.code} messages={null}>
          <Providers>
            <NotFoundContent
              global
              aiAvailable={isAiAvailable("not-found", locale.code)}
              messages={{
                code: t("code"),
                heading: t("heading"),
                body: t("body"),
                home: t("home"),
              }}
            />
          </Providers>
        </NextIntlClientProvider>
        <Script
          src="https://rybbit.kasmedia.com/api/script.js"
          data-site-id="1"
          strategy="afterInteractive"
          integrity="sha384-H0pPS5ok8JJU1gmvnWE/8MDghtGFYeyfM5WjL8LYxEOh6lNozzFWp4AXrlPeUbJo"
          crossOrigin="anonymous"
        />
      </body>
    </html>
  );
}
