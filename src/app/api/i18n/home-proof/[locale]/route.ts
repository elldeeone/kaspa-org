import { isLocale } from "@/i18n/config";
import { getHomeProofClientMessages } from "@/i18n/messages";
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

  return Response.json(getHomeProofClientMessages(locale), {
    headers: { "Cache-Control": "public, max-age=0, must-revalidate" },
  });
}
