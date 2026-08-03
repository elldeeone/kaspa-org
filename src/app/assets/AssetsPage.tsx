import type { Locale } from "@/i18n/config";

import MarketingPageShell from "../components/MarketingPageShell";
import LogoLibrary from "./LogoLibrary";

export default function AssetsPageContent({
  locale,
}: {
  locale: Locale;
}): React.JSX.Element {
  return (
    <MarketingPageShell>
      <LogoLibrary locale={locale} />
    </MarketingPageShell>
  );
}
