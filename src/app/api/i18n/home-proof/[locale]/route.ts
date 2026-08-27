import { isLocale } from "@/i18n/config";
import { supportedLocaleCodes } from "@/i18n/locale-registry";
import { getHomeProofClientMessages } from "@/i18n/messages";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return supportedLocaleCodes.map((locale) => ({ locale }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  if (!isLocale(locale) || !supportedLocaleCodes.includes(locale)) {
    return new Response(null, { status: 404 });
  }

  return Response.json(getHomeProofClientMessages(locale), {
    headers: { "Cache-Control": "public, max-age=0, must-revalidate" },
  });
}
