import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { NextIntlClientProvider } from "next-intl";

import { serializeJsonLd } from "@/i18n/document";
import type { Locale } from "@/i18n/locale-registry";
import type { getSharedClientMessages } from "@/i18n/messages";

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

export const siteDocumentBodyClassName = `${geistSans.variable} ${geistMono.variable} antialiased`;

export function StructuredDataScript({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}

export function SiteDocumentContent({
  children,
  locale,
  messages,
}: {
  children: React.ReactNode;
  locale: Locale;
  messages: ReturnType<typeof getSharedClientMessages>;
}) {
  return (
    <>
      <NextIntlClientProvider locale={locale} messages={null}>
        <Providers>
          <NextIntlClientProvider locale={locale} messages={messages}>
            {children}
          </NextIntlClientProvider>
        </Providers>
      </NextIntlClientProvider>
      <Script
        src="https://webanalytics.kasmedia.com/api/script.js"
        data-site-id="90480f07a2f6"
        strategy="afterInteractive"
      />
    </>
  );
}
