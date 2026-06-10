import { RUSTY_KASPA_URL, RUSTY_RELEASE_URL } from "../constants";
import type { PathCard } from "../types";

export const choosePathCards: PathCard[] = [
  {
    tier: "App SDK",
    title: "Build with the WASM SDK",
    desc: "Use the upstream browser and Node.js bindings for wallet flows, transactions, and RPC access.",
    links: [
      { label: "WASM SDK docs", href: "https://kaspa.aspectron.org/docs/" },
      {
        label: "Upstream examples",
        href: "https://github.com/kaspanet/rusty-kaspa/tree/v2.0.0/wasm/examples",
      },
    ],
  },
  {
    tier: "Native Rust",
    title: "Build with native Rust",
    desc: "Use the Rust crates inside Rusty Kaspa for backend services, systems integrations, wallet internals, and node-adjacent workloads.",
    links: [{ label: "Rusty Kaspa repo", href: RUSTY_KASPA_URL }],
  },
  {
    tier: "Node",
    title: "Run a node",
    desc: "Use Rusty Kaspa for full access, UTXO indexing, and production infrastructure.",
    links: [
      { label: "Latest release", href: RUSTY_RELEASE_URL },
      { label: "Rusty Kaspa repo", href: RUSTY_KASPA_URL },
    ],
  },
];
