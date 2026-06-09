import ExternalLink from "../../components/ExternalLink";
import ShuffledPromptPills from "../../components/ShuffledPromptPills";
import { type OpenKaspaAiDetail } from "../../components/aiLauncherEvents";
import { DOCS_URL, TELEGRAM_RND_URL, aiPrompts } from "../content";
import { ArrowUpRightIcon, ChevronRightIcon, SparklesIcon } from "../icons";
import { GridSurface, MetaPill } from "../ui";

export default function HelpSection({
  kaspaAiEnabled,
  onOpenAi,
}: {
  kaspaAiEnabled: boolean;
  onOpenAi: (prompt?: OpenKaspaAiDetail["prompt"]) => void;
}) {
  return (
    <section
      id="help"
      className="scroll-mt-32 px-6 pt-16 pb-28 md:scroll-mt-40 md:px-12 lg:px-20 lg:pt-24 lg:pb-36"
      style={{ background: "var(--surface)" }}
    >
      <div className="mx-auto max-w-6xl">
        <div className="border-subtle relative overflow-hidden rounded-[32px] border px-6 py-8 md:px-8 md:py-9">
          <GridSurface />
          <div className="relative lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
            <div className="max-w-2xl">
              <p className="text-muted text-[13px] font-medium tracking-[0.08em] uppercase">
                Help
              </p>
              <h2 className="mt-3 text-[32px] leading-[1.02] font-medium tracking-[-0.03em] md:text-[40px]">
                Keep moving
              </h2>
              <p className="text-tertiary mt-4 text-[16px] leading-[1.75]">
                {kaspaAiEnabled
                  ? "Start with the docs or Kaspa AI. For deeper help, try GitHub, Discord, or the R&D Telegram."
                  : "Start with the docs. For deeper help, try GitHub, Discord, or the R&D Telegram."}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ExternalLink href={DOCS_URL} className="btn-primary">
                  Open docs <ChevronRightIcon />
                </ExternalLink>
                {kaspaAiEnabled ? (
                  <button onClick={() => onOpenAi()} className="btn-ghost">
                    <SparklesIcon size={14} />
                    Open AI
                  </button>
                ) : null}
              </div>

              {kaspaAiEnabled ? (
                <ShuffledPromptPills
                  prompts={aiPrompts}
                  count={4}
                  onSelect={onOpenAi}
                />
              ) : null}
            </div>

            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:mt-0 lg:self-start">
              <ExternalLink
                href="https://github.com/kaspanet/rusty-kaspa"
                className="group border-subtle flex min-h-[132px] flex-col rounded-[22px] border px-5 py-5 transition-colors hover:border-[var(--btn-ghost-hover-border)] sm:min-h-[148px]"
                style={{ background: "var(--surface)" }}
              >
                <p className="text-muted text-[12px] font-medium tracking-[0.08em] uppercase">
                  Code
                </p>
                <div className="mt-auto flex items-end justify-between gap-4 pt-8">
                  <span className="text-primary text-[22px] font-medium tracking-[-0.03em]">
                    GitHub
                  </span>
                  <span className="text-muted group-hover:text-secondary inline-flex transition-all duration-200 group-hover:translate-x-[2px] group-hover:-translate-y-[2px]">
                    <ArrowUpRightIcon size={13} />
                  </span>
                </div>
              </ExternalLink>

              <ExternalLink
                href="https://discord.gg/kaspa"
                className="group border-subtle flex min-h-[132px] flex-col rounded-[22px] border px-5 py-5 transition-colors hover:border-[var(--btn-ghost-hover-border)] sm:min-h-[148px]"
                style={{ background: "var(--surface)" }}
              >
                <p className="text-muted text-[12px] font-medium tracking-[0.08em] uppercase">
                  Chat
                </p>
                <div className="mt-auto flex items-end justify-between gap-4 pt-8">
                  <span className="text-primary text-[22px] font-medium tracking-[-0.03em]">
                    Discord
                  </span>
                  <span className="text-muted group-hover:text-secondary inline-flex transition-all duration-200 group-hover:translate-x-[2px] group-hover:-translate-y-[2px]">
                    <ArrowUpRightIcon size={13} />
                  </span>
                </div>
              </ExternalLink>

              <ExternalLink
                href={TELEGRAM_RND_URL}
                className="group border-subtle flex min-h-[148px] flex-col rounded-[22px] border px-5 py-5 transition-colors hover:border-[var(--btn-ghost-hover-border)] sm:col-span-2 sm:min-h-[164px]"
                style={{ background: "var(--surface)" }}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-muted text-[12px] font-medium tracking-[0.08em] uppercase">
                    Latest development
                  </p>
                  <MetaPill accent>Public channel</MetaPill>
                </div>
                <div className="mt-auto flex items-end justify-between gap-4 pt-10">
                  <span className="text-primary text-[24px] font-medium tracking-[-0.03em]">
                    Telegram R&amp;D
                  </span>
                  <span className="text-muted group-hover:text-secondary inline-flex transition-all duration-200 group-hover:translate-x-[2px] group-hover:-translate-y-[2px]">
                    <ArrowUpRightIcon size={13} />
                  </span>
                </div>
              </ExternalLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
