import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import BuildPage from "@/app/build/BuildPage";
import LocalizedAiLauncherEntry from "@/app/components/LocalizedAiLauncherEntry";
import MarketingPageShell from "@/app/components/MarketingPageShell";
import { isLocale } from "@/i18n/config";
import { getBuildClientMessages } from "@/i18n/messages";
import {
  createRouteMetadata,
  isAiAvailable,
  listPublishedLocales,
  resolvePublishedRoute,
} from "@/i18n/site";

const routeId = "build";

export const dynamicParams = false;

export function generateStaticParams() {
  return listPublishedLocales(routeId).map((locale) => ({ locale }));
}

function resolvePageRoute(locale: string) {
  if (!isLocale(locale)) {
    throw new Error(
      `Unexpected locale static parameter for ${routeId}: ${locale}`,
    );
  }
  const route = resolvePublishedRoute(routeId, locale);
  if (!route) {
    throw new Error(`Publication invariant failed for ${routeId}:${locale}`);
  }
  return route;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = resolvePageRoute((await params).locale);
  setRequestLocale(locale);
  const metadata = createRouteMetadata(routeId, locale);
  if (!metadata)
    throw new Error(`Metadata invariant failed for ${routeId}:${locale}`);
  return metadata;
}

export default async function BuildRoute({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = resolvePageRoute((await params).locale);
  setRequestLocale(locale);
  const aiAvailable = isAiAvailable(routeId, locale);
  return (
    <MarketingPageShell
      afterFooter={
        aiAvailable ? <LocalizedAiLauncherEntry locale={locale} /> : null
      }
    >
      <NextIntlClientProvider
        locale={locale}
        messages={getBuildClientMessages(locale)}
      >
        <BuildPage aiAvailable={aiAvailable} />
      </NextIntlClientProvider>
    </MarketingPageShell>
  );
}
