import { useMemo } from "react";
import { useTranslations } from "next-intl";

import {
  DOCS_URL,
  REST_API_URL,
  RUSTY_KASPA_URL,
  RUSTY_RELEASE_URL,
} from "../constants";
import type { LinkGroup } from "../types";
import { useBuildTerms } from "../useBuildTerms";

export function useNetworkAccessGroups(): LinkGroup[] {
  const t = useTranslations("build.access.groups");
  const terms = useBuildTerms();

  return useMemo(
    () => [
      {
        title: t("docs.title"),
        desc: t("docs.description"),
        links: [
          { label: t("docs.links.docs"), href: DOCS_URL },
          {
            label: t("docs.links.wasm", { wasmSdk: terms.wasmSdk }),
            href: "https://kaspa-mdbook.aspectron.com",
          },
          {
            label: t("docs.links.deepWiki", {
              deepWiki: terms.deepWiki,
              rustyKaspa: terms.rustyKaspa,
            }),
            href: "https://deepwiki.com/kaspanet/rusty-kaspa",
          },
          {
            label: t("docs.links.kips", { kips: terms.kips }),
            href: "https://github.com/kaspanet/kips",
          },
          {
            label: t("docs.links.research"),
            href: "https://research.kas.pa/",
          },
          {
            label: t("docs.links.qa", {
              kaspaQAndA: terms.kaspaQAndA,
            }),
            href: "https://qa.kas.pa/",
          },
        ],
      },
      {
        title: t("query.title"),
        desc: t("query.description", { api: terms.api }),
        links: [
          {
            label: t("query.links.api", { api: terms.api }),
            href: REST_API_URL,
          },
          { label: t("query.links.explorer"), href: "https://kaspa.stream/" },
          {
            label: t("query.links.dag", { dag: terms.dag }),
            href: "https://kgi.kaspad.net",
          },
          {
            label: t("query.links.dumps", { api: terms.api }),
            href: "https://db-dl.kaspa.org",
          },
        ],
      },
      {
        title: t("node.title", { rpc: terms.rpc }),
        desc: t("node.description"),
        links: [
          {
            label: t("node.links.rustyKaspa", {
              rustyKaspa: terms.rustyKaspa,
            }),
            href: RUSTY_KASPA_URL,
          },
          { label: t("node.links.release"), href: RUSTY_RELEASE_URL },
        ],
      },
      {
        title: t("testnet.title"),
        desc: t("testnet.description"),
        links: [
          {
            label: t("testnet.faucet"),
            href: "https://faucet-testnet.kaspanet.io",
          },
        ],
      },
    ],
    [t, terms],
  );
}
