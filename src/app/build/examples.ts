import { BROWSER_EXAMPLES_BASE } from "./constants";
import type { BrowserExample } from "./types";

export const browserExamples: BrowserExample[] = [
  {
    id: "server-info",
    title: "Get server info",
    shortLabel: "Server info",
    mobileTabLabel: "Server",
    desc: "Connect through the public resolver and fetch basic node information directly from the browser.",
    runtime: "RPC",
    path: `${BROWSER_EXAMPLES_BASE}/get-server-info.html`,
    source:
      "https://github.com/kaspanet/rusty-kaspa/blob/v2.0.0/wasm/examples/web/get-server-info.html",
  },
  {
    id: "dag-info",
    title: "Get block DAG info",
    shortLabel: "DAG info",
    mobileTabLabel: "DAG",
    desc: "Read high-level DAG state from a live Kaspa node using the upstream browser RPC bindings.",
    runtime: "RPC",
    path: `${BROWSER_EXAMPLES_BASE}/get-block-dag-info.html`,
    source:
      "https://github.com/kaspanet/rusty-kaspa/blob/v2.0.0/wasm/examples/web/get-block-dag-info.html",
  },
  {
    id: "block-added",
    title: "Watch new blocks",
    shortLabel: "New blocks",
    mobileTabLabel: "Blocks",
    desc: "Subscribe to block-added events and watch blocks arrive in real time from the browser.",
    runtime: "RPC",
    path: `${BROWSER_EXAMPLES_BASE}/subscribe-block-added.html`,
    source:
      "https://github.com/kaspanet/rusty-kaspa/blob/v2.0.0/wasm/examples/web/subscribe-block-added.html",
  },
  {
    id: "daa-changed",
    title: "Watch DAA changes",
    shortLabel: "DAA changes",
    mobileTabLabel: "DAA",
    desc: "Subscribe to DAA score updates and watch the stream change in real time.",
    runtime: "RPC",
    path: `${BROWSER_EXAMPLES_BASE}/subscribe-daa-changed.html`,
    source:
      "https://github.com/kaspanet/rusty-kaspa/blob/v2.0.0/wasm/examples/web/subscribe-daa-changed.html",
  },
  {
    id: "utxo-context",
    title: "Track a UTXO context",
    shortLabel: "UTXO context",
    mobileTabLabel: "UTXO",
    desc: "Use the core browser bindings to monitor an address and receive live UTXO events.",
    runtime: "Core",
    path: `${BROWSER_EXAMPLES_BASE}/utxo-context.html`,
    source:
      "https://github.com/kaspanet/rusty-kaspa/blob/v2.0.0/wasm/examples/web/utxo-context.html",
  },
];
