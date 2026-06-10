import ExternalLink from "../../components/ExternalLink";
import SectionHeading from "../../components/SectionHeading";
import type { BrowserExample } from "../content";
import { browserExamples } from "../content";
import { ArrowUpRightIcon } from "../icons";
import { MetaPill } from "../ui";

export default function TryLiveSection({
  activeExampleId,
  onSelectExample,
}: {
  activeExampleId: BrowserExample["id"];
  onSelectExample: (id: BrowserExample["id"]) => void;
}) {
  const activeExample =
    browserExamples.find((example) => example.id === activeExampleId) ??
    browserExamples[0];

  return (
    <section
      id="try-live"
      className="scroll-mt-32 px-6 pt-12 pb-16 md:scroll-mt-40 md:px-12 md:pt-14 lg:px-20 lg:pt-16 lg:pb-20"
      style={{ background: "var(--surface)" }}
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          label="Try live"
          title="Run the Rusty Kaspa browser examples"
          description="The examples below are served from the Rusty Kaspa v2.0.0 browser SDK release, so you can see the SDK behave without leaving the page."
          className="max-w-2xl lg:max-w-4xl"
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="order-2 hidden gap-3 lg:order-1 lg:grid">
            {browserExamples.map((example) => {
              const isActive = example.id === activeExample.id;

              return (
                <button
                  key={example.id}
                  onClick={() => onSelectExample(example.id)}
                  className={`rounded-[24px] border p-5 text-left transition-colors ${
                    isActive
                      ? ""
                      : "hover:!border-[var(--btn-ghost-hover-border)] hover:!bg-[var(--btn-ghost-hover-bg)]"
                  }`}
                  style={{
                    borderColor: isActive
                      ? "var(--btn-ghost-hover-border)"
                      : "var(--border-subtle)",
                    background: isActive ? "var(--surface)" : "var(--bg)",
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <MetaPill accent={isActive}>{example.runtime}</MetaPill>
                    <span className="text-muted text-[12px] font-medium tracking-[0.08em] uppercase">
                      upstream
                    </span>
                  </div>
                  <h3 className="mt-4 text-[22px] leading-[1.04] font-medium tracking-[-0.03em]">
                    {example.title}
                  </h3>
                  <p className="text-tertiary mt-3 text-[15px] leading-[1.68]">
                    {example.desc}
                  </p>
                </button>
              );
            })}
          </div>

          <div
            className="border-subtle order-1 overflow-hidden rounded-[30px] border lg:order-2"
            style={{ background: "var(--surface)" }}
          >
            <div className="md:border-subtle px-5 pt-5 pb-0 md:border-b md:px-6 md:py-5">
              <div className="max-w-2xl">
                <h3 className="text-[28px] leading-[1.04] font-medium tracking-[-0.03em] md:text-[32px]">
                  {activeExample.title}
                </h3>
                <p className="text-tertiary mt-3 text-[15px] leading-[1.72] md:text-[16px]">
                  {activeExample.desc}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-5 sm:gap-3">
                  <ExternalLink
                    href={activeExample.path}
                    className="group inline-flex h-10 items-center justify-center gap-1.5 rounded-full px-4 text-[13px] font-medium transition-colors hover:bg-[var(--btn-primary-hover)] sm:h-auto sm:gap-2 sm:rounded-[8px] sm:px-6 sm:py-3 sm:text-[15px]"
                    style={{
                      background: "var(--btn-primary-bg)",
                      color: "var(--btn-primary-text)",
                    }}
                  >
                    Open standalone
                    <span className="inline-flex transition-transform duration-200 group-hover:translate-x-[2px] group-hover:-translate-y-[2px]">
                      <ArrowUpRightIcon size={11} />
                    </span>
                  </ExternalLink>
                  <ExternalLink
                    href={activeExample.source}
                    className="group inline-flex h-10 items-center justify-center gap-1.5 rounded-full border px-4 text-[13px] font-medium transition-colors hover:border-[var(--btn-ghost-hover-border)] hover:bg-[var(--btn-ghost-hover-bg)] sm:h-auto sm:gap-2 sm:rounded-[8px] sm:px-6 sm:py-3 sm:text-[15px]"
                    style={{
                      borderColor: "var(--btn-ghost-border)",
                      color: "var(--btn-ghost-text)",
                    }}
                  >
                    View source
                    <span className="inline-flex transition-transform duration-200 group-hover:translate-x-[2px] group-hover:-translate-y-[2px]">
                      <ArrowUpRightIcon size={10} />
                    </span>
                  </ExternalLink>
                </div>
              </div>

              <div className="text-muted mt-4 flex flex-wrap items-center gap-3 text-[12px] leading-[1.6] md:mt-5 md:text-[13px]">
                <span>
                  Runs against the{" "}
                  <ExternalLink
                    href="https://kaspa.aspectron.org/rpc/pnn.html"
                    className="hover:text-secondary underline underline-offset-2"
                  >
                    Public Node Network
                  </ExternalLink>
                  , a decentralized pool of community-operated nodes fronted by
                  the Kaspa Resolver. May take a few seconds to initialize, and
                  is not recommended for large-scale production use.
                </span>
              </div>

              <div className="-mx-5 mt-5 lg:hidden">
                <div className="border-subtle overflow-x-auto border-b [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <div className="flex min-w-max items-end">
                    {browserExamples.map((example, index) => {
                      const isActive = example.id === activeExample.id;

                      return (
                        <button
                          key={example.id}
                          onClick={() => onSelectExample(example.id)}
                          className={`shrink-0 px-3.5 pt-2 pb-2 text-[11px] font-medium tracking-[0.02em] transition-colors ${
                            index === 0 ? "border-r" : "border-r border-l"
                          } ${
                            isActive
                              ? "text-primary relative z-10 -mb-px"
                              : "text-secondary"
                          }`}
                          style={{
                            marginLeft: index === 0 ? 0 : "-1px",
                            background: isActive ? "var(--bg)" : "transparent",
                            borderColor: "var(--border-subtle)",
                            borderBottom: isActive
                              ? "1px solid var(--bg)"
                              : "0 solid transparent",
                          }}
                        >
                          {example.mobileTabLabel}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ background: "var(--bg)" }}>
              <iframe
                key={activeExample.id}
                src={activeExample.path}
                title={activeExample.title}
                className="block h-[280px] w-full border-0 bg-[var(--bg)] sm:h-[360px] md:h-[700px]"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
