import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { RUSTY_KASPA_URL } from "../constants";
import type { CommunityTool, EmergingTool, ToolCard } from "../types";
import { useBuildTerms } from "../useBuildTerms";

export function useToolingCards(): {
  communityTools: CommunityTool[];
  emergingTools: EmergingTool[];
  toolingCards: ToolCard[];
} {
  const t = useTranslations("build.tooling");
  const terms = useBuildTerms();

  return useMemo(
    () => ({
      toolingCards: [
        {
          eyebrow: t("stable.rustyKaspa.eyebrow"),
          title: t("stable.rustyKaspa.title", {
            rustyKaspa: terms.rustyKaspa,
          }),
          desc: t("stable.rustyKaspa.description", {
            rpc: terms.rpc,
            rust: terms.rust,
          }),
          tags: [
            t("stable.rustyKaspa.tags.rust", { rust: terms.rust }),
            t("stable.rustyKaspa.tags.infra"),
          ],
          actionLabel: t("stable.rustyKaspa.action"),
          href: RUSTY_KASPA_URL,
        },
        {
          eyebrow: t("stable.wasm.eyebrow", { sdks: terms.sdks }),
          title: t("stable.wasm.title", { wasmSdk: terms.wasmSdk }),
          desc: t("stable.wasm.description", { node: terms.nodeJs }),
          tags: [t("stable.wasm.tag", { node: terms.nodeJs })],
          actionLabel: t("stable.wasm.action"),
          href: "https://kaspa.aspectron.org/docs/",
        },
      ],
      emergingTools: [
        {
          status: t("emerging.python.status"),
          title: t("emerging.python.title", {
            pythonSdk: terms.pythonSdk,
          }),
          desc: t("emerging.python.description", {
            python: terms.python,
          }),
          actionLabel: t("emerging.python.action"),
          href: "https://github.com/kaspanet/kaspa-python-sdk",
        },
      ],
      communityTools: [
        {
          type: t("community.cards.indexer.type"),
          title: t("community.cards.indexer.title", {
            simplyKaspaIndexer: terms.simplyKaspaIndexer,
          }),
          desc: t("community.cards.indexer.description", {
            kaspa: terms.kaspa,
          }),
          href: "https://github.com/supertypo/simply-kaspa-indexer",
        },
        {
          type: t("community.cards.dnsSeeder.type"),
          title: t("community.cards.dnsSeeder.title", {
            dnsSeeder: terms.dnsSeeder,
          }),
          desc: t("community.cards.dnsSeeder.description", {
            kaspa: terms.kaspa,
          }),
          href: "https://github.com/kaspanet/dnsseeder",
        },
        {
          type: t("community.cards.khost.type"),
          title: t("community.cards.khost.title", {
            khost: terms.khost,
          }),
          desc: t("community.cards.khost.description"),
          href: "https://github.com/aspectron/khost",
        },
        {
          type: t("community.cards.kaspaJs.type"),
          title: t("community.cards.kaspaJs.title", {
            kaspaJs: terms.kaspaJs,
          }),
          desc: t("community.cards.kaspaJs.description", {
            javascript: terms.javascript,
            kaspa: terms.kaspa,
          }),
          href: "https://github.com/K-Kluster/kaspa-js",
        },
      ],
    }),
    [t, terms],
  );
}
