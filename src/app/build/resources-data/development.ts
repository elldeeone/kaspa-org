import { useMemo } from "react";
import { useTranslations } from "next-intl";

import {
  BUILD_TERMS,
  PROGRAMMABILITY_URL,
  TELEGRAM_RND_URL,
  TOCCATA_DOCS_URL,
} from "../constants";
import type { DevelopmentCard } from "../types";

export function useDevelopmentCards(): DevelopmentCard[] {
  const t = useTranslations("build.developments.cards");

  return useMemo(
    () => [
      {
        id: "channel",
        label: t("channel.label"),
        title: t("channel.title", { telegram: BUILD_TERMS.telegram }),
        desc: t("channel.description", {
          discord: BUILD_TERMS.discord,
          kaspa: BUILD_TERMS.kaspa,
        }),
        href: TELEGRAM_RND_URL,
      },
      {
        id: "research",
        label: t("research.label"),
        title: t("research.title", {
          kaspaResearch: BUILD_TERMS.kaspaResearch,
        }),
        desc: t("research.description", { kip: BUILD_TERMS.kip }),
        href: "https://research.kas.pa/",
      },
      {
        id: "kasSmiths",
        label: t("kasSmiths.label"),
        title: t("kasSmiths.title", {
          kasSmiths: BUILD_TERMS.kasSmiths,
        }),
        desc: t("kasSmiths.description", { kaspa: BUILD_TERMS.kaspa }),
        href: "https://kas-smiths.org/",
      },
      {
        id: "toccata",
        label: t("toccata.label"),
        title: t("toccata.title", {
          toccata: BUILD_TERMS.toccata,
        }),
        desc: t("toccata.description", {
          kaspa: BUILD_TERMS.kaspa,
          toccata: BUILD_TERMS.toccata,
        }),
        href: TOCCATA_DOCS_URL,
      },
      {
        id: "silverscript",
        label: t("silverscript.label"),
        title: t("silverscript.title", {
          silverscript: BUILD_TERMS.silverscript,
        }),
        desc: t("silverscript.description", {
          kaspaScript: BUILD_TERMS.kaspaScript,
        }),
        href: "https://github.com/kaspanet/silverscript",
      },
      {
        id: "vprogs",
        label: t("vprogs.label"),
        title: t("vprogs.title", { vprogs: BUILD_TERMS.vprogs }),
        desc: t("vprogs.description"),
        href: `${PROGRAMMABILITY_URL}/based-apps`,
      },
      {
        id: "python",
        label: t("python.label", { sdk: BUILD_TERMS.sdk }),
        title: t("python.title", { pythonSdk: BUILD_TERMS.pythonSdk }),
        desc: t("python.description", { python: BUILD_TERMS.python }),
        href: "https://github.com/kaspanet/kaspa-python-sdk",
      },
      {
        id: "kips",
        label: t("kips.label"),
        title: t("kips.title", { kips: BUILD_TERMS.kips }),
        desc: t("kips.description"),
        href: "https://github.com/kaspanet/kips",
      },
    ],
    [t],
  );
}
