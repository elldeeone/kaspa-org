import { Geist, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import Script from "next/script";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { getLocaleDefinition, isLocale } from "@/i18n/config";
import { siteViewport } from "@/i18n/document";
import { structuredDataSchema } from "@/i18n/site";

import "../globals.css";
import Providers from "../providers";

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

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale: requestedLocale } = await params;
  if (!isLocale(requestedLocale)) notFound();

  setRequestLocale(requestedLocale);
  const locale = getLocaleDefinition(requestedLocale);

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
          <Providers>{children}</Providers>
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
