import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { BUILD_TERMS } from "../constants";

export function useAiPrompts(): string[] {
  const t = useTranslations("build.help.prompts");

  return useMemo(
    () => [
      t("gettingStarted", { kaspa: BUILD_TERMS.kaspa }),
      t("choosePath", {
        rust: BUILD_TERMS.rust,
        wasmSdk: BUILD_TERMS.wasmSdk,
      }),
      t("nodeOrApi", { api: BUILD_TERMS.api }),
      t("smartContracts", { kaspa: BUILD_TERMS.kaspa }),
      t("wallet", { wasmSdk: BUILD_TERMS.wasmSdk }),
      t("transaction"),
      t("runNode", { kaspa: BUILD_TERMS.kaspa }),
      t("hardware"),
      t("toccata", { toccata: BUILD_TERMS.toccata }),
      t("covenants", { kaspa: BUILD_TERMS.kaspa }),
      t("programmability", {
        basedApps: BUILD_TERMS.basedApps,
        covenants: BUILD_TERMS.covenants,
        inlineZk: BUILD_TERMS.inlineZk,
      }),
      t("silverscript", { silverscript: BUILD_TERMS.silverscript }),
      t("testing"),
    ],
    [t],
  );
}
