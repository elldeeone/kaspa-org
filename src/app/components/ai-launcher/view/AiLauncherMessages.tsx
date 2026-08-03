import type { RefObject } from "react";
import { useTranslations } from "next-intl";
import ReactMarkdown from "react-markdown";

import type { Message } from "../types";

type AiLauncherMessagesProps = {
  copiedMessageId: number | null;
  isTyping: boolean;
  loadingMessage: string;
  messages: Message[];
  messagesEndRef: RefObject<HTMLDivElement | null>;
  onCopy: (messageId: number, text: string) => Promise<void>;
};

type ParsedAnswer = {
  body: string;
  sourceCount: number;
  sources: string | null;
};

const SOURCE_HEADING_PATTERN = /^#{1,6}\s*Sources\s*$/im;
const MARKDOWN_LINK_PATTERN = /\[[^\]]+\]\(https?:\/\/[^)]+\)/g;

function normalizeMarkdownLinks(markdown: string): string {
  return markdown.replace(/\]\s*\n\s*\(/g, "](");
}

function parseAnswer(markdown: string): ParsedAnswer {
  const normalized = normalizeMarkdownLinks(markdown);
  const sourceHeading = SOURCE_HEADING_PATTERN.exec(normalized);

  if (!sourceHeading || sourceHeading.index === undefined) {
    return {
      body: normalized,
      sourceCount: 0,
      sources: null,
    };
  }

  const sources = normalized
    .slice(sourceHeading.index + sourceHeading[0].length)
    .trim();

  if (!sources) {
    return {
      body: normalized,
      sourceCount: 0,
      sources: null,
    };
  }

  return {
    body: normalized.slice(0, sourceHeading.index).trimEnd(),
    sourceCount: sources.match(MARKDOWN_LINK_PATTERN)?.length ?? 0,
    sources,
  };
}

function MarkdownContent({
  markdown,
}: {
  markdown: string;
}): React.JSX.Element {
  return (
    <ReactMarkdown
      components={{
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        ),
      }}
    >
      {markdown}
    </ReactMarkdown>
  );
}

export function AiLauncherMessages({
  copiedMessageId,
  isTyping,
  loadingMessage,
  messages,
  messagesEndRef,
  onCopy,
}: AiLauncherMessagesProps): React.JSX.Element {
  const t = useTranslations("shared.ai.launcher");

  return (
    <div className="mx-auto max-w-3xl space-y-5 py-6">
      {messages.map((message) => {
        const parsedAnswer =
          message.role === "ai" && message.text
            ? parseAnswer(message.text)
            : null;

        return message.role === "ai" && !message.text ? null : (
          <div
            key={message.id}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[90%] rounded-xl px-4 py-3 text-[14px] leading-[1.65] sm:max-w-[75%] ${
                message.role === "user" ? "rounded-br-sm" : "rounded-bl-sm"
              }`}
              style={
                message.role === "user"
                  ? {
                      background: "var(--btn-primary-bg)",
                      color: "var(--btn-primary-text)",
                    }
                  : {
                      background: "var(--btn-ghost-hover-bg)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border-subtle)",
                    }
              }
            >
              {message.role === "ai" ? (
                <>
                  <div className="ai-prose">
                    <MarkdownContent markdown={parsedAnswer?.body ?? ""} />
                  </div>
                  {parsedAnswer?.sources ? (
                    <details className="ai-sources">
                      <summary>
                        {t("sources", { count: parsedAnswer.sourceCount })}
                      </summary>
                      <div className="ai-prose ai-sources-content">
                        <MarkdownContent markdown={parsedAnswer.sources} />
                      </div>
                    </details>
                  ) : null}
                  <div
                    className="mt-3 flex items-center gap-2 border-t pt-3"
                    style={{ borderColor: "var(--border-subtle)" }}
                  >
                    <button
                      type="button"
                      onClick={() => onCopy(message.id, message.text)}
                      className="rounded-md border px-2.5 py-1 text-[12px] text-[var(--text-secondary)] transition-colors"
                      style={{ borderColor: "var(--border-subtle)" }}
                    >
                      {copiedMessageId === message.id ? t("copied") : t("copy")}
                    </button>
                  </div>
                </>
              ) : (
                message.text
              )}
            </div>
          </div>
        );
      })}

      {isTyping && !messages[messages.length - 1]?.text ? (
        <div className="flex justify-start">
          <div
            className="flex max-w-[90%] items-start gap-2.5 rounded-xl rounded-bl-sm px-4 py-3 sm:max-w-[75%]"
            style={{
              background: "var(--btn-ghost-hover-bg)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div className="flex shrink-0 items-center gap-1 pt-0.5">
              <span
                className="h-1.5 w-1.5 animate-[typingDot_1.4s_ease-in-out_infinite] rounded-full"
                style={{
                  background: "var(--text-muted)",
                  animationDelay: "0ms",
                }}
              />
              <span
                className="h-1.5 w-1.5 animate-[typingDot_1.4s_ease-in-out_infinite] rounded-full"
                style={{
                  background: "var(--text-muted)",
                  animationDelay: "200ms",
                }}
              />
              <span
                className="h-1.5 w-1.5 animate-[typingDot_1.4s_ease-in-out_infinite] rounded-full"
                style={{
                  background: "var(--text-muted)",
                  animationDelay: "400ms",
                }}
              />
            </div>
            <span className="text-[12px] leading-[1.4] wrap-break-word whitespace-normal text-[var(--text-muted)]">
              {loadingMessage}
            </span>
          </div>
        </div>
      ) : null}

      <div ref={messagesEndRef} />
    </div>
  );
}
