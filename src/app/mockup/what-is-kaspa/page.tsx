import Image from "next/image";

import MarketingPageShell from "@/app/components/MarketingPageShell";
import { ArrowUpRightIcon, ChevronRightIcon } from "@/app/components/icons";
import { Link } from "@/i18n/link";

function CommunityDagVisual() {
  return (
    <figure className="relative left-1/2 my-12 w-[min(1000px,calc(100vw-2rem))] -translate-x-1/2">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#090f1d] shadow-[0_24px_70px_rgba(11,20,37,0.2)]">
        <Image
          src="/assets/png/dagpulse-blockdag.png"
          width={1057}
          height={711}
          sizes="(min-width: 1040px) 1000px, calc(100vw - 2rem)"
          alt="A live Kaspa BlockDAG view with many parallel blocks connected into a shared graph"
          className="h-auto w-full"
        />
      </div>
      <figcaption className="text-tertiary mt-4 text-center text-[13px] leading-[1.6]">
        A real Kaspa BlockDAG view from the community-built{" "}
        <a
          href="https://github.com/Yonkoo11/dagpulse"
          target="_blank"
          rel="noopener noreferrer"
          className="link-accent"
        >
          DAGPulse
        </a>
        . Cropped from the project screenshot and used under its{" "}
        <a
          href="/assets/png/dagpulse-LICENSE.txt"
          target="_blank"
          rel="noopener noreferrer"
          className="link-accent"
        >
          MIT license
        </a>
        .
      </figcaption>
    </figure>
  );
}

const layers = [
  {
    title: "KAS moves value",
    state: "Live",
    body: "KAS is the network's native asset. Transfers settle directly on Kaspa's proof-of-work base layer.",
  },
  {
    title: "Toccata adds programmable rules",
    state: "Live on L1",
    body: "Covenants let the base layer enforce conditions on how coins and application state can be spent and updated.",
  },
  {
    title: "vProgs extend the model",
    state: "Early prototype",
    body: "An evolving approach where Kaspa orders application activity and proofs settle through the base layer.",
  },
] as const;

export default function WhatIsKaspaMockupPage() {
  return (
    <MarketingPageShell>
      <article className="mx-auto max-w-[700px] px-6 pt-32 pb-24 lg:pt-40 lg:pb-32">
        <header className="text-center">
          <h1 className="text-primary text-[clamp(3rem,9vw,5.25rem)] leading-[0.92] font-bold tracking-[-0.055em] text-balance">
            WTH is Kaspa?
          </h1>
          <p className="text-secondary mx-auto mt-8 max-w-[620px] text-[21px] leading-[1.4] tracking-[-0.015em] sm:text-[25px]">
            An open proof-of-work network for moving value and building
            programmable applications.
          </p>
          <p className="text-tertiary mx-auto mt-5 max-w-[540px] text-[15px] leading-[1.75]">
            It begins with a simple change to how blocks are organized. From
            there, the rest of Kaspa makes more sense.
          </p>
        </header>

        <CommunityDagVisual />

        <section
          id="the-one-idea"
          className="mt-20 border-t border-[var(--border-subtle)] pt-16"
        >
          <h2 className="text-primary text-center text-[26px] leading-[1.2] font-normal tracking-[-0.02em] sm:text-[30px]">
            Keep the parallel blocks
          </h2>
          <p className="text-secondary mt-8 text-[16px] leading-[1.75]">
            Traditional proof-of-work networks arrange blocks in a single chain.
            When blocks are created at the same time, only one branch can become
            the main chain.
          </p>
          <p className="text-secondary mt-5 text-[16px] leading-[1.75]">
            Kaspa keeps parallel blocks and orders them into a shared history.
            This allows blocks to arrive more frequently while the network
            remains secured by proof of work.
          </p>

          <p className="text-secondary text-[16px] leading-[1.75]">
            The result is not a tidy fork that disappears. It is the dense,
            connected graph shown above: a <strong>blockDAG</strong>.
          </p>
          <p className="text-secondary mt-5 text-[16px] leading-[1.75]">
            Kaspa currently produces ten blocks per second. That responsiveness
            is the visible result; the blockDAG is the mechanism underneath it.
          </p>
        </section>

        <section className="mt-20 border-t border-[var(--border-subtle)] pt-16">
          <h2 className="text-primary text-center text-[26px] leading-[1.2] font-normal tracking-[-0.02em] sm:text-[30px]">
            Kaspa is more than KAS
          </h2>
          <p className="text-secondary mt-8 text-[16px] leading-[1.75]">
            Kaspa is the network. KAS is its native asset. Programmability
            expands what can be coordinated and settled through the same base
            layer.
          </p>

          <div className="mt-10 border-y border-[var(--border-subtle)]">
            {layers.map((layer) => (
              <section
                key={layer.title}
                className="border-b border-[var(--border-subtle)] py-7 last:border-b-0 sm:grid sm:grid-cols-[1fr_8rem] sm:gap-x-8"
              >
                <h3 className="text-primary text-[18px] font-semibold tracking-[-0.01em]">
                  {layer.title}
                </h3>
                <p className="mt-2 text-[13px] text-[var(--accent)] sm:mt-1 sm:text-right">
                  {layer.state}
                </p>
                <p className="text-tertiary mt-3 text-[15px] leading-[1.7] sm:col-span-2">
                  {layer.body}
                </p>
              </section>
            ))}
          </div>
        </section>

        <section className="mt-20 border-t border-[var(--border-subtle)] pt-16 text-center">
          <h2 className="text-primary text-[26px] leading-[1.2] font-normal tracking-[-0.02em] sm:text-[30px]">
            Real-time decentralization
          </h2>
          <p className="text-secondary mx-auto mt-8 max-w-[600px] text-[16px] leading-[1.75]">
            Speed is not the point by itself. The aim is responsive,
            permissionless settlement without giving up proof of work,
            competitive mining or censorship resistance.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/lore" className="btn-primary justify-center px-6 py-3">
              Read the LORE <ChevronRightIcon />
            </Link>
            <a
              href="https://eprint.iacr.org/2018/104.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost justify-center px-6 py-3"
            >
              Read the research <ArrowUpRightIcon />
            </a>
          </div>
        </section>
      </article>
    </MarketingPageShell>
  );
}
