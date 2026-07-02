import { TELEGRAM_RND_URL } from "../constants";
import type { DevelopmentCard } from "../types";

export const developmentCards: DevelopmentCard[] = [
  {
    label: "Channel",
    title: "Core R&D Telegram",
    desc: "The main public stream for current Kaspa research and development discussions. Discord is still used, but most core discussion now happens here.",
    href: TELEGRAM_RND_URL,
  },
  {
    label: "Forum",
    title: "Kaspa Research",
    desc: "Long-form forum for protocol, consensus, economics, and mining discussion, plus KIP drafts and proposals.",
    href: "https://research.kas.pa/",
  },
  {
    label: "Hard fork",
    title: "Toccata: covenants & zk",
    desc: "Hard fork bundling extended script opcodes (KIP-17), covenant IDs (KIP-20), zk opcodes with a verifier precompile subsystem (KIP-16), and sequencing commitments (KIP-21). Currently live on TN12 ahead of mainnet activation.",
    href: "https://medium.com/@michaelsuttonil/kaspa-covenants-toccata-hard-fork-outlook-a4d81a40900c",
  },
  {
    label: "Programmability",
    title: "Silverscript",
    desc: "High-level scripting language that compiles to native Kaspa Script. Testing on TN12 ahead of the Toccata hard fork that lands covenants and zk opcodes on mainnet.",
    href: "https://github.com/kaspanet/silverscript",
  },
  {
    label: "Programmability",
    title: "vProgs",
    desc: "Early research on verifiable programs: on-chain sequencing with off-chain execution settled via zk proofs. Builds on the script primitives landing in Toccata.",
    href: "https://github.com/kaspanet/vprogs",
  },
  {
    label: "SDK",
    title: "Python SDK",
    desc: "In beta and nearly complete. Python tooling is progressing in the open and expanding the developer surface.",
    href: "https://github.com/kaspanet/kaspa-python-sdk",
  },
  {
    label: "Protocol",
    title: "KIPs",
    desc: "Track proposals that can change how applications and infrastructure integrate with the network.",
    href: "https://github.com/kaspanet/kips",
  },
];
