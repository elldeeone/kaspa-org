import { Fragment, type ComponentProps, type ReactNode } from "react";
import { getTranslations } from "next-intl/server";

import type { Locale } from "@/i18n/config";
import { Link } from "@/i18n/link";
import { getHomeClientLabels } from "@/i18n/messages";

import Nav from "./components/Nav";
import Footer from "./components/Footer";
import LocalizedAiLauncherEntry from "./components/LocalizedAiLauncherEntry";
import LiveDagBackground from "./components/LiveDagBackground";
import MobileDagLive from "./components/MobileDagLive";
import TypeWriter from "./components/TypeWriter";
import ProofTrigger from "./components/ProofTrigger";
import { ArrowUpRightIcon, ChevronRightIcon } from "./components/icons";

function HeroCta({
  children,
  className,
  href,
}: {
  children: ReactNode;
  className: string;
  href: ComponentProps<typeof Link>["href"];
}) {
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export default async function HomePage({
  aiAvailable,
  locale,
}: {
  aiAvailable: boolean;
  locale: Locale;
}) {
  const t = await getTranslations({ locale, namespace: "home" });
  const heroLines = t("hero.heading").split("\n");
  const clientLabels = getHomeClientLabels(locale);

  return (
    <div className="relative flex min-h-screen flex-col">
      <Nav />

      {/* ─── DAG Visualization — Desktop (Fixed Right) ─── */}
      <LiveDagBackground annotation={clientLabels.dagAnnotation} />

      {/* ─── Main Content ─── */}
      <main className="relative z-10 flex-1">
        {/* ── Hero ── */}
        <section className="flex min-h-screen flex-col items-center pt-[2vh] sm:justify-center sm:pt-0 xl:flex-row xl:justify-start">
          {/* ─── DAG Visualization — Mobile ─── */}
          <MobileDagLive />

          <div className="relative z-10 mx-auto -mt-[20vh] w-full px-6 text-center sm:mt-0 sm:pt-8 md:px-12 md:pt-10 xl:mx-0 xl:max-w-[55vw] xl:px-20 xl:pt-20 xl:text-left">
            <h1
              className={`text-[clamp(2.6rem,13vw,3.25rem)] leading-[0.9] font-bold tracking-[-0.03em] max-[399px]:text-[clamp(2.35rem,11.5vw,2.75rem)] sm:text-[56px] md:text-[80px] md:tracking-[-0.04em] lg:text-[96px] ${locale === "en-XA" ? "break-all" : ""}`}
            >
              {heroLines.map((line, index) => (
                <Fragment key={`${line}-${index}`}>
                  {index > 0 ? <br /> : null}
                  {line}
                </Fragment>
              ))}
            </h1>
            <p className="text-secondary mx-auto mt-5 max-w-[20rem] text-[20px] leading-[1.3] tracking-[-0.01em] md:text-[24px] xl:mx-0 xl:ml-1.25 xl:max-w-none xl:text-[28px]">
              {t("hero.tagline")}
            </p>

            <div className="mt-10 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:justify-center sm:gap-4 xl:justify-start">
              <HeroCta
                href="/lore"
                className="btn-primary w-full justify-center py-5 text-[18px] sm:w-auto sm:justify-start sm:py-3 sm:text-[15px]"
              >
                {t("hero.getStarted")} <ChevronRightIcon />
              </HeroCta>
              <HeroCta
                href={{ pathname: "/hodl", hash: "wallet" }}
                className="btn-ghost w-full justify-center py-5 text-[18px] sm:w-auto sm:justify-start sm:py-3 sm:text-[15px]"
              >
                {t("hero.getWallet")} <ChevronRightIcon />
              </HeroCta>
              <HeroCta
                href={{ pathname: "/hodl", hash: "buy" }}
                className="btn-ghost w-full justify-center py-5 text-[18px] sm:w-auto sm:justify-start sm:py-3 sm:text-[15px]"
              >
                {t("hero.buyKaspa")} <ChevronRightIcon />
              </HeroCta>
            </div>
          </div>
        </section>

        {/* ── Verify Section ── */}
        <section id="verify" className="py-24 lg:py-40">
          <div className="px-6 md:px-12 lg:max-w-[55vw] lg:px-20">
            <h2 className="text-[32px] leading-[0.98] font-medium tracking-[-0.02em] md:text-[40px] lg:text-[44px]">
              <TypeWriter text={t("verify.heading")} speed={55} />
            </h2>

            <p className="text-tertiary mt-10 max-w-md text-[16px] leading-[1.7]">
              {t("verify.history")}
              <br />
              <br />
              {t("verify.fairLaunch")}
            </p>

            <p className="text-tertiary mt-6 max-w-md text-[16px] leading-[1.7]">
              {t("verify.explanation")}
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <ProofTrigger labels={clientLabels.proof} />
              <a
                href="https://github.com/kaspagang/kaspad-py-explorer/blob/main/src/genesis_proof.ipynb"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost"
              >
                {t("verify.runProof")} <ArrowUpRightIcon size={14} />
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer reserveLauncherSpace={aiAvailable} />
      {aiAvailable ? <LocalizedAiLauncherEntry locale={locale} /> : null}
    </div>
  );
}
