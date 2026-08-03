import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { BUILD_TERMS } from "./constants";

type LocalizedBuildTerm = "daa" | "dag" | "node" | "publicNodeNetwork" | "utxo";

export type BuildTerms = Omit<typeof BUILD_TERMS, LocalizedBuildTerm> &
  Record<LocalizedBuildTerm, string>;

export function useBuildTerms(): BuildTerms {
  const t = useTranslations("build.terms");

  return useMemo(
    () => ({
      ...BUILD_TERMS,
      daa: t("daa"),
      dag: t("dag"),
      node: t("node"),
      publicNodeNetwork: t("publicNodeNetwork"),
      utxo: t("utxo"),
    }),
    [t],
  );
}
