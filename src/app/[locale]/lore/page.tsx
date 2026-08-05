import LorePage from "@/app/lore/LorePage";
import {
  createLocalizedPageAdapter,
  type LocalizedPageProps,
} from "@/i18n/page-route";
import { isAiAvailable } from "@/i18n/site";

const routeId = "lore";
const pageRoute = createLocalizedPageAdapter(routeId);

export const dynamicParams = false;

export function generateStaticParams() {
  return pageRoute.generateStaticParams();
}

export function generateMetadata(props: LocalizedPageProps) {
  return pageRoute.generateMetadata(props);
}

export default async function LoreRoute({ params }: LocalizedPageProps) {
  const { locale } = await pageRoute.resolve(params);
  return (
    <LorePage locale={locale} aiAvailable={isAiAvailable(routeId, locale)} />
  );
}
