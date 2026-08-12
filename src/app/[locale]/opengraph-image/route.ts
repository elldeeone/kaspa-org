import { isLocale } from "@/i18n/config";
import { defaultLocale } from "@/i18n/locale-registry";
import { renderOpenGraphImage } from "@/i18n/opengraph";
import { getNonHtmlRobotsHeader } from "@/i18n/publication";
import { listPublishedLocales } from "@/i18n/site";

export const dynamic = "force-static";
export const dynamicParams = false;

function listLocalizedOpenGraphLocales() {
  return listPublishedLocales("home").filter(
    (locale) => locale !== defaultLocale,
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

  const response = await renderOpenGraphImage(locale);
  const robots = getNonHtmlRobotsHeader("home", locale, "image");
  if (robots) response.headers.set("X-Robots-Tag", robots);
  return response;
}
