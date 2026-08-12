import { isLocale } from "@/i18n/config";
import { getHomeProofClientMessages } from "@/i18n/messages";
import { getNonHtmlRobotsHeader } from "@/i18n/publication";
import { listPublishedLocales } from "@/i18n/site";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return listPublishedLocales("home").map((locale) => ({ locale }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  if (!isLocale(locale) || !listPublishedLocales("home").includes(locale)) {
    return new Response(null, { status: 404 });
  }

  const headers = new Headers({
    "Cache-Control": "public, max-age=0, must-revalidate",
  });
  const robots = getNonHtmlRobotsHeader("home", locale, "data");
  if (robots) headers.set("X-Robots-Tag", robots);
  return Response.json(getHomeProofClientMessages(locale), { headers });
}
