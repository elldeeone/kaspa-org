import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { isLocale } from "@/i18n/config";
import { siteViewport } from "@/i18n/document";
import { getLocaleDefinition } from "@/i18n/locale-registry";
import { getSharedClientMessages } from "@/i18n/messages";
import { createStructuredData } from "@/i18n/site";

import "../globals.css";
import {
  SiteDocumentContent,
  siteDocumentBodyClassName,
  StructuredDataScript,
} from "../document-shell";

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
  const sharedMessages = getSharedClientMessages(requestedLocale);
  const structuredData = createStructuredData(requestedLocale);

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
      <body className={siteDocumentBodyClassName}>
        <SiteDocumentContent locale={locale.code} messages={sharedMessages}>
          {children}
        </SiteDocumentContent>
      </body>
    </html>
  );
}
