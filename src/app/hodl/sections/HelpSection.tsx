import ExternalLink from "../../components/ExternalLink";
import ShuffledPromptPills from "../../components/ShuffledPromptPills";
import { type OpenKaspaAiDetail } from "../../components/aiLauncherEvents";
import { GridSurface } from "../../build/ui";
import { helpPrompts } from "../content";
import { ArrowUpRightIcon } from "../../components/icons";
import { SparklesIcon } from "../icons";

const DISCORD_URL = "https://discord.gg/kaspa";
const EXPLORER_URL = "https://explorer.kaspa.org";

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
      className="scroll-mt-32 px-6 pt-20 pb-28 md:scroll-mt-40 md:px-12 lg:px-20 lg:pt-32 lg:pb-36"
      style={{ background: "var(--surface)" }}
    >
      <div className="mx-auto max-w-7xl lg:pl-[72px]">
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
                  ? "Ask Kaspa AI for instant answers on wallets, buying, and safety. For community help join Discord, or check a transaction on the explorer."
                  : "For community help join Discord, or check a transaction on the explorer."}
              </p>
              {kaspaAiEnabled ? (
                <div className="mt-8 flex flex-wrap gap-3">
                  <button onClick={() => onOpenAi()} className="btn-primary">
                    <SparklesIcon size={14} />
                    Open AI
                  </button>
                </div>
              ) : null}

              {kaspaAiEnabled ? (
                <ShuffledPromptPills
                  prompts={helpPrompts}
                  count={4}
                  onSelect={onOpenAi}
                />
              ) : null}
            </div>

            <div className="mt-8 grid grid-cols-1 gap-3 lg:mt-0 lg:self-start">
              <ExternalLink
                href={DISCORD_URL}
                className="group border-subtle flex min-h-[180px] flex-col rounded-[22px] border px-5 py-5 transition-colors hover:border-[var(--btn-ghost-hover-border)]"
                style={{ background: "var(--surface)" }}
              >
                <p className="text-muted text-[12px] font-medium tracking-[0.08em] uppercase">
                  Community
                </p>
                <div className="mt-auto flex items-end justify-between gap-4 pt-10">
                  <span className="text-primary text-[22px] font-medium tracking-[-0.03em]">
                    Discord
                  </span>
                  <span className="text-muted group-hover:text-secondary inline-flex transition-all duration-200 group-hover:translate-x-[2px] group-hover:-translate-y-[2px]">
                    <ArrowUpRightIcon size={13} />
                  </span>
                </div>
              </ExternalLink>

              <ExternalLink
                href={EXPLORER_URL}
                className="group border-subtle flex min-h-[180px] flex-col rounded-[22px] border px-5 py-5 transition-colors hover:border-[var(--btn-ghost-hover-border)]"
                style={{ background: "var(--surface)" }}
              >
                <p className="text-muted text-[12px] font-medium tracking-[0.08em] uppercase">
                  Track a transaction
                </p>
                <div className="mt-auto flex items-end justify-between gap-4 pt-10">
                  <span className="text-primary text-[22px] font-medium tracking-[-0.03em]">
                    Explorer
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
