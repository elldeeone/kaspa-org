import { useTranslations } from "next-intl";

import { SUGGESTED_QUESTION_KEYS } from "../constants";
import type { ProviderLink } from "../types";
import { LaunchProviderLink } from "./LaunchProviderLink";

type AiLauncherWelcomeProps = {
  onSendMessage: (text: string) => void;
  providerLinks: readonly ProviderLink[];
};

export function AiLauncherWelcome({
  onSendMessage,
  providerLinks,
}: AiLauncherWelcomeProps): React.JSX.Element {
  const launcherT = useTranslations("shared.ai.launcher");
  const suggestionsT = useTranslations("shared.ai.suggestions");

  return (
    <div className="mx-auto max-w-3xl py-8 text-center md:py-12">
      <h3
        className="text-[18px] font-medium tracking-[-0.01em] md:text-[20px]"
        style={{ color: "var(--text-primary)" }}
      >
        {launcherT("welcomeHeading")}
      </h3>
      <p
        className="mt-2 text-[14px] leading-[1.6]"
        style={{ color: "var(--text-secondary)" }}
      >
        {launcherT("welcomeBody")}
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {SUGGESTED_QUESTION_KEYS.map((key) => {
          const question = suggestionsT(key);

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSendMessage(question)}
              className="rounded-lg border border-[var(--border-subtle)] bg-transparent px-3.5 py-2 text-[13px] font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--btn-ghost-hover-border)] hover:bg-[var(--btn-ghost-hover-bg)] hover:text-[var(--text-primary)]"
            >
              {question}
            </button>
          );
        })}
      </div>

      <div className="mt-8 mb-6 flex items-center gap-4">
        <div className="h-px flex-1 bg-[var(--border-subtle)]" />
        <span
          className="text-[12px] font-medium tracking-wide uppercase"
          style={{ color: "var(--text-muted)" }}
        >
          {launcherT("ownAiDivider")}
        </span>
        <div className="h-px flex-1 bg-[var(--border-subtle)]" />
      </div>

      <div className="grid grid-cols-3 gap-2">
        {providerLinks.map((link) => (
          <LaunchProviderLink key={link.label} link={link} />
        ))}
      </div>
    </div>
  );
}
