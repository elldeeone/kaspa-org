import { defaultLocale, isLocale } from "@/i18n/config";
import { renderOpenGraphImage } from "@/i18n/opengraph";
import { listEnabledLocales, listPublishedRoutes } from "@/i18n/site";

export const dynamic = "force-static";
export const dynamicParams = false;

function listLocalizedOpenGraphLocales() {
  const publishedLocales = new Set(
    listPublishedRoutes().map((route) => route.locale),
  );
  return listEnabledLocales().filter(
    (locale) => locale !== defaultLocale && publishedLocales.has(locale),
  );
}

export function generateStaticParams() {
  return listLocalizedOpenGraphLocales().map((locale) => ({ locale }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  if (
    !isLocale(locale) ||
    locale === defaultLocale ||
    !listLocalizedOpenGraphLocales().includes(locale)
  ) {
    return new Response(null, { status: 404 });
  }

  return renderOpenGraphImage(locale);
}
