import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { BUILD_TERMS, TELEGRAM_RND_URL } from "../constants";
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
        id: "toccata",
        label: t("toccata.label"),
        title: t("toccata.title", {
          toccata: BUILD_TERMS.toccata,
          zk: BUILD_TERMS.zk,
        }),
        desc: t("toccata.description", {
          kip16: BUILD_TERMS.kip16,
          kip17: BUILD_TERMS.kip17,
          kip20: BUILD_TERMS.kip20,
          kip21: BUILD_TERMS.kip21,
          tn12: BUILD_TERMS.tn12,
          zk: BUILD_TERMS.zk,
        }),
        href: "https://medium.com/@michaelsuttonil/kaspa-covenants-toccata-hard-fork-outlook-a4d81a40900c",
      },
      {
        id: "silverscript",
        label: t("silverscript.label"),
        title: t("silverscript.title", {
          silverscript: BUILD_TERMS.silverscript,
        }),
        desc: t("silverscript.description", {
          kaspaScript: BUILD_TERMS.kaspaScript,
          tn12: BUILD_TERMS.tn12,
          toccata: BUILD_TERMS.toccata,
          zk: BUILD_TERMS.zk,
        }),
        href: "https://github.com/kaspanet/silverscript",
      },
      {
        id: "vprogs",
        label: t("vprogs.label"),
        title: t("vprogs.title", { vprogs: BUILD_TERMS.vprogs }),
        desc: t("vprogs.description", {
          toccata: BUILD_TERMS.toccata,
          zk: BUILD_TERMS.zk,
        }),
        href: "https://github.com/kaspanet/vprogs",
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
