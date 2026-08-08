import { defaultLocale } from "@/i18n/locale-registry";
import { renderOpenGraphImage } from "@/i18n/opengraph";

export const dynamic = "force-static";

export async function GET() {
  return renderOpenGraphImage(defaultLocale);
}
