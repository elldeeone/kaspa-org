import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";

import type { Locale } from "@/i18n/config";

import { BROWSER_EXAMPLES_BASE } from "./constants";
import type { BrowserExample } from "./types";
import { useBuildTerms } from "./useBuildTerms";

function getBrowserExamplePath(stem: string, locale: Locale): string {
  const isPseudo = locale === "en-XA";
  const filename = `${stem}${isPseudo ? ".en-XA" : ""}.html`;
  const returnTo = isPseudo ? "/en-XA/build#try-live" : "/build#try-live";
  return `${BROWSER_EXAMPLES_BASE}/${filename}?returnTo=${encodeURIComponent(returnTo)}`;
}

export function useBrowserExamples(): BrowserExample[] {
  const locale = useLocale();
  const t = useTranslations("build.tryLive.examples");
  const terms = useBuildTerms();

  return useMemo(
    () => [
      {
        id: "server-info",
        title: t("serverInfo.title"),
        shortLabel: t("serverInfo.shortLabel"),
        mobileTabLabel: t("serverInfo.mobileTabLabel"),
        desc: t("serverInfo.description"),
        runtime: t("serverInfo.runtime", { rpc: terms.rpc }),
        path: getBrowserExamplePath("get-server-info", locale),
        source:
          "https://github.com/kaspanet/rusty-kaspa/blob/v2.0.0/wasm/examples/web/get-server-info.html",
      },
      {
        id: "dag-info",
        title: t("dagInfo.title", { dag: terms.dag }),
        shortLabel: t("dagInfo.shortLabel", { dag: terms.dag }),
        mobileTabLabel: t("dagInfo.mobileTabLabel", {
          dag: terms.dag,
        }),
        desc: t("dagInfo.description", {
          dag: terms.dag,
          kaspa: terms.kaspa,
          rpc: terms.rpc,
        }),
        runtime: t("dagInfo.runtime", { rpc: terms.rpc }),
        path: getBrowserExamplePath("get-block-dag-info", locale),
        source:
          "https://github.com/kaspanet/rusty-kaspa/blob/v2.0.0/wasm/examples/web/get-block-dag-info.html",
      },
      {
        id: "block-added",
        title: t("blockAdded.title"),
        shortLabel: t("blockAdded.shortLabel"),
        mobileTabLabel: t("blockAdded.mobileTabLabel"),
        desc: t("blockAdded.description"),
        runtime: t("blockAdded.runtime", { rpc: terms.rpc }),
        path: getBrowserExamplePath("subscribe-block-added", locale),
        source:
          "https://github.com/kaspanet/rusty-kaspa/blob/v2.0.0/wasm/examples/web/subscribe-block-added.html",
      },
      {
        id: "daa-changed",
        title: t("daaChanged.title", { daa: terms.daa }),
        shortLabel: t("daaChanged.shortLabel", { daa: terms.daa }),
        mobileTabLabel: t("daaChanged.mobileTabLabel", {
          daa: terms.daa,
        }),
        desc: t("daaChanged.description", { daa: terms.daa }),
        runtime: t("daaChanged.runtime", { rpc: terms.rpc }),
        path: getBrowserExamplePath("subscribe-daa-changed", locale),
        source:
          "https://github.com/kaspanet/rusty-kaspa/blob/v2.0.0/wasm/examples/web/subscribe-daa-changed.html",
      },
      {
        id: "utxo-context",
        title: t("utxoContext.title", { utxo: terms.utxo }),
        shortLabel: t("utxoContext.shortLabel", { utxo: terms.utxo }),
        mobileTabLabel: t("utxoContext.mobileTabLabel", {
          utxo: terms.utxo,
        }),
        desc: t("utxoContext.description", { utxo: terms.utxo }),
        runtime: t("utxoContext.runtime", { core: terms.core }),
        path: getBrowserExamplePath("utxo-context", locale),
        source:
          "https://github.com/kaspanet/rusty-kaspa/blob/v2.0.0/wasm/examples/web/utxo-context.html",
      },
    ],
    [locale, t, terms],
  );
}
