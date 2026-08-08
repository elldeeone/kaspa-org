import { Link } from "@/i18n/link";
import type { Locale } from "@/i18n/locale-registry";
import { localizedDestinationInventory } from "@/i18n/manifest";

import LocalizedAiLauncherEntry from "./LocalizedAiLauncherEntry";
import { ArrowUpRightIcon } from "./icons";
import MarketingPageShell from "./MarketingPageShell";

export type NotFoundMessages = {
  code: string;
  heading: string;
  body: string;
  home: string;
};

export default function NotFoundContent({
  messages,
  aiAvailable,
  locale,
  global = false,
}: {
  messages: NotFoundMessages;
  aiAvailable: boolean;
  locale: Locale;
  global?: boolean;
}) {
  return (
    <div data-kaspa-global-not-found={global ? "true" : undefined}>
      <MarketingPageShell
        afterFooter={
          aiAvailable ? <LocalizedAiLauncherEntry locale={locale} /> : null
        }
      >
        <section className="relative overflow-hidden px-6 pt-28 pb-20 md:px-12 lg:px-20 lg:pt-36">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px]">
            <div
              className="absolute top-14 left-[8%] h-[220px] w-[220px] rounded-full blur-3xl"
              style={{ background: "rgba(26, 26, 30, 0.05)" }}
            />
            <div
              className="absolute top-10 right-[6%] h-[280px] w-[280px] rounded-full blur-3xl"
              style={{ background: "rgba(26, 26, 30, 0.035)" }}
            />
          </div>

          <div className="relative mx-auto max-w-4xl">
            <p className="text-muted text-[13px] font-medium tracking-[0.14em] uppercase">
              {messages.code}
            </p>
            <h1 className="mt-4 max-w-3xl text-[42px] leading-[0.94] font-bold tracking-[-0.04em] sm:text-[56px] md:text-[72px]">
              {messages.heading}
            </h1>
            <p className="text-secondary mt-5 max-w-2xl text-[17px] leading-[1.72] sm:text-[18px] md:text-[20px]">
              {messages.body}
            </p>

            <div className="mt-12">
              <Link
                href={localizedDestinationInventory.notFoundHome.pathname}
                className="group inline-flex w-fit items-center gap-3 rounded-full px-6 py-3 text-[15px] font-medium transition-transform hover:-translate-y-0.5"
                style={{
                  background: "var(--text-primary)",
                  color: "var(--bg)",
                  boxShadow: "0 18px 48px rgba(26, 26, 30, 0.12)",
                }}
              >
                {messages.home}
                <span className="transition-transform group-hover:translate-x-0.5">
                  <ArrowUpRightIcon />
                </span>
              </Link>
            </div>
          </div>
        </section>
      </MarketingPageShell>
    </div>
  );
}
