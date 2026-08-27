import { isLocale } from "@/i18n/config";
import { defaultLocale, supportedLocaleCodes } from "@/i18n/locale-registry";
import { renderOpenGraphImage } from "@/i18n/opengraph";

export const dynamic = "force-static";
export const dynamicParams = false;

function listLocalizedOpenGraphLocales() {
  return supportedLocaleCodes.filter((locale) => locale !== defaultLocale);
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
