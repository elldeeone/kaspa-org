import { useTranslations } from "next-intl";

import { SparklesIcon } from "../../icons";
import { ChevronUpIcon } from "../icons";

type AiLauncherCollapsedBarProps = {
  onOpen: () => void;
};

export function AiLauncherCollapsedBar({
  onOpen,
}: AiLauncherCollapsedBarProps): React.JSX.Element {
  const t = useTranslations("shared.ai.launcher");

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-expanded={false}
      className="border-subtle group w-full border-t transition-colors"
      style={{ background: "var(--surface)" }}
    >
      <div
        className="flex items-center justify-center gap-2.5 px-5 py-4 sm:h-16 sm:px-8 sm:py-0 lg:px-10"
        style={{
          paddingBottom: "calc(10px + var(--safe-bottom))",
          animation: "gentleNudge 5s ease-in-out infinite",
          animationDelay: "2s",
        }}
      >
        <span className="text-[var(--text-muted)] transition-colors group-hover:text-[var(--text-secondary)]">
          <SparklesIcon size={15} />
        </span>
        <span className="silver-sweep-text text-[13px] font-medium">
          {t("askAnything")}
        </span>
        <span className="text-[var(--text-muted)] transition-colors group-hover:text-[var(--text-secondary)]">
          <ChevronUpIcon size={14} />
        </span>
      </div>
    </button>
  );
}
