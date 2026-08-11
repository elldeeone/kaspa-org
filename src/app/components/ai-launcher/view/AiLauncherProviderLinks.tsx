import { useTranslations } from "next-intl";

import type { ProviderLink } from "../types";
import { LaunchProviderLink } from "./LaunchProviderLink";

type AiLauncherProviderLinksProps = {
  providerLinks: readonly ProviderLink[];
};

export function AiLauncherProviderLinks({
  providerLinks,
}: AiLauncherProviderLinksProps): React.JSX.Element {
  const t = useTranslations("shared.ai.launcher");

  return (
    <div className="border-subtle shrink-0 border-t px-5 py-2 md:px-8 lg:px-10">
      <div className="mx-auto flex max-w-3xl items-center gap-4 overflow-x-auto">
        <span
          className="shrink-0 text-[11px]"
          style={{ color: "var(--text-muted)" }}
        >
          {t("ownAiLabel")}
        </span>
        <div className="flex items-center gap-3">
          {providerLinks.map((link) => (
            <div key={link.label} className="flex shrink-0 items-center gap-1">
              <LaunchProviderLink compact link={link} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
