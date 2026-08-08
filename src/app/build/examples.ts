import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";

import {
  buildExampleContract,
  getBuildExampleHref,
  getBuildExampleSourceUrl,
} from "@/i18n/build-example-contract";

import type { BrowserExample } from "./types";
import { useBuildTerms } from "./useBuildTerms";

export function useBrowserExamples(): BrowserExample[] {
  const locale = useLocale();
  const t = useTranslations("build.tryLive.examples");
  const terms = useBuildTerms();

  return useMemo(
    () =>
      buildExampleContract.examples.map((example): BrowserExample => {
        const shared = {
          id: example.id,
          path: getBuildExampleHref(example, locale),
          source: getBuildExampleSourceUrl(example),
        };

        switch (example.id) {
          case "server-info":
            return {
              ...shared,
              title: t("serverInfo.title"),
              shortLabel: t("serverInfo.shortLabel"),
              mobileTabLabel: t("serverInfo.mobileTabLabel"),
              desc: t("serverInfo.description"),
              runtime: t("serverInfo.runtime", { rpc: terms.rpc }),
            };
          case "dag-info":
            return {
              ...shared,
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
            };
          case "block-added":
            return {
              ...shared,
              title: t("blockAdded.title"),
              shortLabel: t("blockAdded.shortLabel"),
              mobileTabLabel: t("blockAdded.mobileTabLabel"),
              desc: t("blockAdded.description"),
              runtime: t("blockAdded.runtime", { rpc: terms.rpc }),
            };
          case "daa-changed":
            return {
              ...shared,
              title: t("daaChanged.title", { daa: terms.daa }),
              shortLabel: t("daaChanged.shortLabel", { daa: terms.daa }),
              mobileTabLabel: t("daaChanged.mobileTabLabel", {
                daa: terms.daa,
              }),
              desc: t("daaChanged.description", { daa: terms.daa }),
              runtime: t("daaChanged.runtime", { rpc: terms.rpc }),
            };
          case "utxo-context":
            return {
              ...shared,
              title: t("utxoContext.title", { utxo: terms.utxo }),
              shortLabel: t("utxoContext.shortLabel", { utxo: terms.utxo }),
              mobileTabLabel: t("utxoContext.mobileTabLabel", {
                utxo: terms.utxo,
              }),
              desc: t("utxoContext.description", { utxo: terms.utxo }),
              runtime: t("utxoContext.runtime", { core: terms.core }),
            };
        }
      }),
    [locale, t, terms],
  );
}
