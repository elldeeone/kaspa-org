import HomePage from "@/app/HomePage";
import {
  createLocalizedPageAdapter,
  type LocalizedPageProps,
} from "@/i18n/page-route";
import { isAiAvailable } from "@/i18n/site-capabilities";

const routeId = "home";
const pageRoute = createLocalizedPageAdapter(routeId);

export const dynamicParams = false;

export function generateStaticParams() {
  return pageRoute.generateStaticParams();
}

export function generateMetadata(props: LocalizedPageProps) {
  return pageRoute.generateMetadata(props);
}

export default async function HomeRoute({ params }: LocalizedPageProps) {
  const { locale } = await pageRoute.resolve(params);
  return (
    <HomePage locale={locale} aiAvailable={isAiAvailable(routeId, locale)} />
  );
}
