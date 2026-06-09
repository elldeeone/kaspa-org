import Link from "next/link";
import type { ReactNode } from "react";

import { isKaspaAiEnabled } from "./aiFeature";
import Nav from "./components/Nav";
import Footer from "./components/Footer";
import AiLauncherEntry from "./components/AiLauncherEntry";
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
  href: string;
}) {
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col">
      <Nav />

      {/* ─── DAG Visualization — Desktop (Fixed Right) ─── */}
      <LiveDagBackground />

      {/* ─── Main Content ─── */}
      <main className="relative z-10 flex-1">
        {/* ── Hero ── */}
        <section className="flex min-h-screen flex-col items-center pt-[2vh] sm:justify-center sm:pt-0 xl:flex-row xl:items-center xl:justify-start xl:pt-0">
          {/* ─── DAG Visualization — Mobile ─── */}
          <MobileDagLive />

          <div className="relative z-10 mx-auto -mt-[20vh] w-full px-6 text-center sm:mt-0 sm:pt-8 md:px-12 md:pt-10 xl:mx-0 xl:max-w-[55vw] xl:px-20 xl:pt-20 xl:text-left">
            <h1 className="text-[clamp(2.6rem,13vw,3.25rem)] leading-[0.9] font-bold tracking-[-0.03em] max-[399px]:text-[clamp(2.35rem,11.5vw,2.75rem)] sm:text-[56px] md:text-[80px] md:tracking-[-0.04em] lg:text-[96px]">
              Real-time
              <br />
              Decentralization
            </h1>
            <p className="text-secondary mx-auto mt-5 max-w-[20rem] text-[20px] leading-[1.3] font-normal tracking-[-0.01em] md:text-[24px] xl:mx-0 xl:ml-1.25 xl:max-w-none xl:text-[28px]">
              bitcoin&apos;s proof-of-work without the wait.
            </p>

            <div className="mt-10 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:justify-center sm:gap-4 xl:justify-start">
              <HeroCta
                href="/lore"
                className="btn-primary w-full justify-center py-5 text-[18px] sm:w-auto sm:justify-start sm:py-3 sm:text-[15px]"
              >
                Get started <ChevronRightIcon />
              </HeroCta>
              <HeroCta
                href="/hodl#wallet"
                className="btn-ghost w-full justify-center py-5 text-[18px] sm:w-auto sm:justify-start sm:py-3 sm:text-[15px]"
              >
                Get a wallet <ChevronRightIcon />
              </HeroCta>
              <HeroCta
                href="/hodl#buy"
                className="btn-ghost w-full justify-center py-5 text-[18px] sm:w-auto sm:justify-start sm:py-3 sm:text-[15px]"
              >
                Buy Kaspa <ChevronRightIcon />
              </HeroCta>
            </div>
          </div>
        </section>

        {/* ── Verify Section ── */}
        <section id="verify" className="py-24 lg:py-40">
          <div className="px-6 md:px-12 lg:max-w-[55vw] lg:px-20">
            <div>
              <h2 className="text-[32px] leading-[0.98] font-medium tracking-[-0.02em] md:text-[40px] lg:text-[44px]">
                <TypeWriter text="don't trust, verify." speed={55} />
              </h2>
            </div>

            <div className="mt-10">
              <p className="text-tertiary mt-3 max-w-md text-[16px] leading-[1.7]">
                Every coin in Kaspa&apos;s history traces cryptographically back
                to an empty genesis.
                <br />
                <br />
                No premine. No hidden allocation. Fair launch.
              </p>
            </div>

            <div className="mt-6">
              <p className="text-tertiary mt-3 max-w-md text-[16px] leading-[1.7]">
                The genesis proof follows the chain of pruning-point block
                hashes backward to the original genesis and verifies its UTXO
                commitment matches an empty set. Bitcoin block hashes embedded
                in the genesis coinbase serve as timestamps, ruling out hidden
                premining.
              </p>
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              <ProofTrigger />
              <a
                href="https://github.com/kaspagang/kaspad-py-explorer/blob/main/src/genesis_proof.ipynb"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost"
              >
                Run the proof <ArrowUpRightIcon size={14} />
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer reserveLauncherSpace={isKaspaAiEnabled} />
      {isKaspaAiEnabled ? <AiLauncherEntry /> : null}
    </div>
  );
}
