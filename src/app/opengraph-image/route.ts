import { defaultLocale } from "@/i18n/config";
import { renderOpenGraphImage } from "@/i18n/opengraph";

export const dynamic = "force-static";

export async function GET() {
  return renderOpenGraphImage(defaultLocale);
}
