import type { FormEvent, RefObject } from "react";
import { useTranslations } from "next-intl";

import { SendIcon } from "../icons";

type AiLauncherInputBarProps = {
  input: string;
  inputRef: RefObject<HTMLInputElement | null>;
  isTyping: boolean;
  onChangeInput: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function AiLauncherInputBar({
  input,
  inputRef,
  isTyping,
  onChangeInput,
  onSubmit,
}: AiLauncherInputBarProps): React.JSX.Element {
  const t = useTranslations("shared.ai.launcher");
  const canSend = input.trim().length > 0 && !isTyping;

  return (
    <form
      onSubmit={onSubmit}
      className="border-subtle shrink-0 border-t px-5 py-3 md:px-8 lg:px-10"
      style={{ paddingBottom: "calc(12px + var(--safe-bottom))" }}
    >
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(event) => onChangeInput(event.target.value)}
          placeholder={t("placeholder")}
          className="flex-1 bg-transparent text-[16px] text-foreground outline-none placeholder:text-(--text-muted)"
          disabled={isTyping}
        />
        <button
          type="submit"
          disabled={!canSend}
          aria-label={t("sendMessage")}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-all"
          style={{
            background: canSend ? "var(--btn-primary-bg)" : "transparent",
            color: canSend ? "var(--btn-primary-text)" : "var(--text-muted)",
          }}
        >
          <SendIcon size={14} />
        </button>
      </div>
    </form>
  );
}
