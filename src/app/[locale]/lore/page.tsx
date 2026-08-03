import { setRequestLocale } from "next-intl/server";

import LorePage from "@/app/lore/LorePage";
import { isLocale } from "@/i18n/config";
import {
  createRouteMetadata,
  isAiAvailable,
  listPublishedLocales,
  resolvePublishedRoute,
} from "@/i18n/site";

const routeId = "lore";

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

export default async function LoreRoute({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = resolvePageRoute((await params).locale);
  setRequestLocale(locale);
  return <LorePage aiAvailable={isAiAvailable(routeId, locale)} />;
}
