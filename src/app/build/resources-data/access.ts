import {
  DOCS_URL,
  REST_API_URL,
  RUSTY_KASPA_URL,
  RUSTY_RELEASE_URL,
} from "../constants";
import type { LinkGroup } from "../types";

export const networkAccessGroups: LinkGroup[] = [
  {
    title: "Docs",
    desc: "Start with the guides, technical references, and open proposals.",
    links: [
      { label: "Open docs", href: DOCS_URL },
      { label: "WASM SDK docs", href: "https://kaspa-mdbook.aspectron.com" },
      {
        label: "Rusty Kaspa DeepWiki",
        href: "https://deepwiki.com/kaspanet/rusty-kaspa",
      },
      { label: "KIPs", href: "https://github.com/kaspanet/kips" },
      { label: "Research forum", href: "https://research.kas.pa/" },
      { label: "Kaspa Q&A", href: "https://qa.kas.pa/" },
    ],
  },
  {
    title: "Query and access",
    desc: "Query the network through public tools and the lightweight community-hosted API. The community API is best-effort with no SLA.",
    links: [
      { label: "Community API docs", href: REST_API_URL },
      { label: "Explorer", href: "https://kaspa.stream/" },
      { label: "DAG visualizer", href: "https://kgi.kaspad.net" },
      { label: "Explorer / API DB dumps", href: "https://db-dl.kaspa.org" },
    ],
  },
  {
    title: "Node and RPC",
    desc: "Run full infrastructure or go deeper into the node stack.",
    links: [
      { label: "Rusty Kaspa", href: RUSTY_KASPA_URL },
      { label: "Latest release", href: RUSTY_RELEASE_URL },
    ],
  },
  {
    title: "Testnet",
    desc: "Use public testing resources before shipping to mainnet.",
    links: [
      {
        label: "Testnet faucet",
        href: "https://faucet-testnet.kaspanet.io",
      },
    ],
  },
];
