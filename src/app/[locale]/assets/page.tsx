import AssetsPageContent from "@/app/assets/AssetsPage";
import {
  createLocalizedPageAdapter,
  type LocalizedPageProps,
} from "@/i18n/page-route";

const routeId = "assets";
const pageRoute = createLocalizedPageAdapter(routeId);

export const dynamicParams = false;

export function generateStaticParams() {
  return pageRoute.generateStaticParams();
}

export function generateMetadata(props: LocalizedPageProps) {
  return pageRoute.generateMetadata(props);
}

export default async function AssetsRoute({ params }: LocalizedPageProps) {
  const { locale } = await pageRoute.resolve(params);
  return <AssetsPageContent locale={locale} />;
}
