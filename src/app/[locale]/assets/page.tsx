import { setRequestLocale } from "next-intl/server";

import AssetsPageContent from "@/app/assets/AssetsPage";
import { isLocale } from "@/i18n/config";
import {
  createRouteMetadata,
  listPublishedLocales,
  resolvePublishedRoute,
} from "@/i18n/site";

const routeId = "assets";

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

export default async function AssetsRoute({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = resolvePageRoute((await params).locale);
  setRequestLocale(locale);
  return <AssetsPageContent locale={locale} />;
}
