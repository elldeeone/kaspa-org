import { flattenCatalog, type MessageCatalog } from "./catalog-contract.mts";

export const SPANISH_UNCHANGED_MESSAGE_KEYS = [
  "assets.formats.png",
  "assets.formats.svg",
  "assets.groups.lockup",
  "build.access.groups.docs.links.kips",
  "build.access.groups.docs.links.qa",
  "build.access.groups.node.links.rustyKaspa",
  "build.artifacts.utxo.error",
  "build.developments.cards.kips.title",
  "build.developments.cards.python.label",
  "build.developments.cards.python.title",
  "build.developments.cards.research.title",
  "build.developments.cards.silverscript.title",
  "build.developments.cards.vprogs.title",
  "build.help.links.discord.eyebrow",
  "build.help.links.discord.title",
  "build.help.links.github.title",
  "build.help.links.qa.title",
  "build.runNode.dockerHub",
  "build.start.release.version",
  "build.terms.daa",
  "build.terms.dag",
  "build.terms.utxo",
  "build.tooling.community.cards.dnsSeeder.title",
  "build.tooling.community.cards.indexer.title",
  "build.tooling.community.cards.kaspaJs.title",
  "build.tooling.community.cards.khost.title",
  "build.tooling.emerging.python.status",
  "build.tooling.emerging.python.title",
  "build.tooling.stable.rustyKaspa.title",
  "build.tooling.stable.wasm.title",
  "build.tryLive.examples.blockAdded.runtime",
  "build.tryLive.examples.daaChanged.mobileTabLabel",
  "build.tryLive.examples.daaChanged.runtime",
  "build.tryLive.examples.dagInfo.mobileTabLabel",
  "build.tryLive.examples.dagInfo.runtime",
  "build.tryLive.examples.serverInfo.runtime",
  "build.tryLive.examples.utxoContext.mobileTabLabel",
  "build.tryLive.examples.utxoContext.runtime",
  "errors.page.code",
  "hodl.help.discord",
  "hodl.navigation.current",
  "hodl.start.heading",
  "hodl.walletFinder.actions.app_store",
  "hodl.walletFinder.actions.google_play",
  "hodl.walletFinder.criteria.control.label",
  "hodl.walletFinder.features.multisig.label",
  "hodl.walletFinder.features.two_fa.label",
  "hodl.walletFinder.guidance.hardware.shortTitle",
  "hodl.walletFinder.operatingSystems.android",
  "hodl.walletFinder.operatingSystems.hardware",
  "hodl.walletFinder.operatingSystems.ios",
  "hodl.walletFinder.operatingSystems.linux",
  "hodl.walletFinder.operatingSystems.mac",
  "hodl.walletFinder.operatingSystems.windows",
  "hodl.walletFinder.ratings.aria",
  "hodl.walletFinder.ratings.notApplicableCompact",
  "hodl.walletFinder.ratings.tooltipHeading",
  "home.proof.supply.comparison.unit",
  "home.proof.supply.timeline.checkpoint.date",
  "home.proof.supply.timeline.chromatic.date",
  "home.proof.supply.timeline.crescendo.date",
  "home.proof.supply.timeline.crescendo.label",
  "home.proof.supply.timeline.genesis.date",
  "home.proof.supply.timeline.preDeflationary.date",
  "lore.metadata.title",
  "shared.ai.launcher.beta",
  "shared.ai.providers.chatgpt",
  "shared.ai.providers.claude",
  "shared.ai.providers.perplexity",
  "shared.footer.links.github",
  "shared.footer.links.x",
  "shared.navigation.links.build",
  "shared.navigation.links.dagviz",
  "shared.navigation.links.hodl",
  "shared.navigation.links.lore",
  "shared.navigation.links.think",
] as const;

const unchangedMessageKeys = new Set<string>(SPANISH_UNCHANGED_MESSAGE_KEYS);

export const SPANISH_PROTECTED_TERMS = [
  "Kaspa",
  "KAS",
  "blockDAG",
  "GHOSTDAG",
  "DAGKnight",
  "PHANTOM",
  "SPECTRE",
  "Toccata",
  "Crescendo",
  "rusty-kaspa",
  "Silverscript",
  "OP_CAT",
  "TN12",
  "UTXO",
  "BPS",
  "RTD",
  "BFT",
  "ZK",
  "HODL",
  "BUIDL",
  "cypherpunk",
  "Bitcoin",
  "Ethereum",
  "GitHub",
  "CoinDesk",
  "Golang",
  "Rust",
] as const;

const prohibitedEnglishTerms = [
  [/(?:^|\W)mainnet(?:$|\W)/iu, "red principal"],
  [/(?:^|\W)testnet(?:$|\W)/iu, "red de pruebas"],
  [/(?:^|\W)hard[- ]?fork(?:$|\W)/iu, "bifurcación dura"],
  [/(?:^|\W)on-chain(?:$|\W)/iu, "en cadena"],
  [/(?:^|\W)off-chain(?:$|\W)/iu, "fuera de la cadena"],
  [/(?:^|\W)proof[- ]of[- ]work(?:$|\W)/iu, "prueba de trabajo"],
  [/(?:^|\W)fair[- ]launch(?:ed)?(?:$|\W)/iu, "lanzamiento justo"],
  [/(?:^|\W)self-custody(?:$|\W)/iu, "autocustodia"],
  [/(?:^|\W)hashrate(?:$|\W)/iu, "tasa de hash"],
  [/(?:^|\W)finality(?:$|\W)/iu, "finalidad"],
  [/(?:^|\W)bindings?(?:$|\W)/iu, "enlaces"],
  [/(?:^|\W)stack(?:$|\W)/iu, "pila tecnológica"],
] as const satisfies readonly (readonly [RegExp, string])[];

function countOccurrences(value: string, token: string): number {
  return value.split(token).length - 1;
}

export function validateSpanishCatalogContract(
  namespace: string,
  sourceCatalog: MessageCatalog,
  targetCatalog: MessageCatalog,
): string[] {
  const errors: string[] = [];
  const source = flattenCatalog(sourceCatalog);
  const target = flattenCatalog(targetCatalog);

  for (const [key, sourceValue] of source) {
    const fullKey = `${namespace}.${key}`;
    const targetValue = target.get(key);
    if (targetValue === undefined) continue;

    const allowedUnchanged = unchangedMessageKeys.has(fullKey);
    if (sourceValue === targetValue && !allowedUnchanged) {
      errors.push(
        `${fullKey} is unchanged from English without an explicit allowlist entry`,
      );
    } else if (sourceValue !== targetValue && allowedUnchanged) {
      errors.push(`${fullKey} has a stale unchanged-message allowlist entry`);
    }

    for (const term of SPANISH_PROTECTED_TERMS) {
      const sourceCount = countOccurrences(sourceValue, term);
      const targetCount = countOccurrences(targetValue, term);
      if (sourceCount > 0 && targetCount === 0) {
        errors.push(
          `${fullKey} removes protected term ${term} from translated copy`,
        );
      }
    }

    for (const [pattern, preferred] of prohibitedEnglishTerms) {
      if (pattern.test(targetValue)) {
        errors.push(
          `${fullKey} retains prohibited English terminology; use ${preferred}`,
        );
      }
    }
  }

  for (const fullKey of unchangedMessageKeys) {
    if (!fullKey.startsWith(`${namespace}.`)) continue;
    const key = fullKey.slice(namespace.length + 1);
    if (!source.has(key)) {
      errors.push(`${fullKey} allowlist entry does not exist in English`);
    }
  }

  return errors;
}
