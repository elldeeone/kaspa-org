import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { RUSTY_KASPA_URL, RUSTY_RELEASE_URL } from "../constants";
import type { PathCard } from "../types";
import { useBuildTerms } from "../useBuildTerms";

export function useChoosePathCards(): PathCard[] {
  const t = useTranslations("build.paths.cards");
  const terms = useBuildTerms();

  return useMemo(
    () => [
      {
        tier: t("wasm.tier", { sdk: terms.sdk }),
        title: t("wasm.title", { wasmSdk: terms.wasmSdk }),
        desc: t("wasm.description", {
          nodeJs: terms.nodeJs,
          rpc: terms.rpc,
        }),
        links: [
          {
            label: t("wasm.docs", { wasmSdk: terms.wasmSdk }),
            href: "https://kaspa.aspectron.org/docs/",
          },
          {
            label: t("wasm.examples"),
            href: "https://github.com/kaspanet/rusty-kaspa/tree/v2.0.0/wasm/examples",
          },
        ],
      },
      {
        tier: t("rust.tier", { rust: terms.rust }),
        title: t("rust.title", { rust: terms.rust }),
        desc: t("rust.description", {
          rust: terms.rust,
          rustyKaspa: terms.rustyKaspa,
        }),
        links: [
          {
            label: t("rust.repo", { rustyKaspa: terms.rustyKaspa }),
            href: RUSTY_KASPA_URL,
          },
        ],
      },
      {
        tier: t("node.tier"),
        title: t("node.title"),
        desc: t("node.description", {
          rustyKaspa: terms.rustyKaspa,
          utxo: terms.utxo,
        }),
        links: [
          { label: t("node.release"), href: RUSTY_RELEASE_URL },
          {
            label: t("node.repo", { rustyKaspa: terms.rustyKaspa }),
            href: RUSTY_KASPA_URL,
          },
        ],
      },
    ],
    [t, terms],
  );
}
