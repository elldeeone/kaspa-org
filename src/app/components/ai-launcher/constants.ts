import type { PanelState, ProviderLink } from "./types";

const DEFAULT_PUBLIC_SITE_ORIGIN = "https://kaspa.org";
const PUBLIC_SITE_ORIGIN =
  process.env.NEXT_PUBLIC_PUBLIC_SITE_ORIGIN ?? DEFAULT_PUBLIC_SITE_ORIGIN;

export const ASK_API_PATH = "/api/ask";
export const AI_KNOWLEDGE_DOCUMENT_URL = `${PUBLIC_SITE_ORIGIN}/llms.txt`;
export const PANEL_TRANSITION_MS = 500;
export const LOADING_MESSAGE_ROTATE_MS = 1400;

export const LOADING_MESSAGE_KEYS = [
  "atomicArc",
  "ibd",
  "ftr",
  "kip",
  "template",
  "commitment",
  "blueSet",
  "mergeDepth",
  "silverscript",
  "covenantId",
  "covenantState",
  "orphans",
  "mempool",
  "fees",
  "covenants",
  "blocks",
  "pruning",
  "dagLayer",
  "stack",
  "bps",
  "blueWork",
  "l2",
  "vprogBatch",
  "schnorr",
  "virtualState",
  "utxoSet",
  "anticone",
  "transactions",
  "utxo",
  "vprogs",
  "crescendo",
] as const;

export const SUGGESTED_QUESTION_KEYS = [
  "kaspaPurpose",
  "blockTimes",
  "decentralization",
  "premine",
] as const;

type AiProviderLabels = {
  chatgpt: string;
  claude: string;
  perplexity: string;
};

export function createAiProviderLinks(
  prompt: string,
  labels: AiProviderLabels,
): readonly ProviderLink[] {
  const encodedPrompt = encodeURIComponent(prompt);

  return [
    {
      label: labels.chatgpt,
      href: `https://chatgpt.com/?q=${encodedPrompt}`,
    },
    {
      label: labels.claude,
      href: `https://claude.ai/new?q=${encodedPrompt}`,
    },
    {
      label: labels.perplexity,
      href: `https://www.perplexity.ai/search/?q=${encodedPrompt}`,
    },
  ];
}

export function getPanelHeight(panelState: PanelState): string {
  if (panelState === "full") {
    return "var(--panel-full)";
  }

  if (panelState === "mid") {
    return "var(--panel-mid)";
  }

  return "0px";
}
