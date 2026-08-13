import spanishWalletSummariesSource from "../../messages/es/wallets.json" with { type: "json" };
import germanWalletSummariesSource from "../../messages/de/wallets.json" with { type: "json" };
import frenchWalletSummariesSource from "../../messages/fr/wallets.json" with { type: "json" };
import chineseWalletSummariesSource from "../../messages/zh-CN/wallets.json" with { type: "json" };
import russianWalletSummariesSource from "../../messages/ru/wallets.json" with { type: "json" };
import indonesianWalletSummariesSource from "../../messages/id-ID/wallets.json" with { type: "json" };
import brazilianPortugueseWalletSummariesSource from "../../messages/pt-BR/wallets.json" with { type: "json" };

import type { KaspaWallet } from "../app/hodl/wallet-finder/types.ts";
import { kaspaWallets, type WalletId } from "../data/wallets.ts";

import {
  brazilianPortugueseLocale,
  chineseLocale,
  frenchLocale,
  germanLocale,
  indonesianLocale,
  pseudoLocale,
  russianLocale,
  spanishLocale,
  type Locale,
} from "./locale-registry.ts";
import { hasSameIcuStructure, pseudoLocalizeMessage } from "./pseudo.ts";

type WalletSummaryCatalog = Readonly<Record<WalletId, string>>;

const spanishWalletSummaries =
  spanishWalletSummariesSource satisfies WalletSummaryCatalog;
const germanWalletSummaries =
  germanWalletSummariesSource satisfies WalletSummaryCatalog;
const frenchWalletSummaries =
  frenchWalletSummariesSource satisfies WalletSummaryCatalog;
const chineseWalletSummaries =
  chineseWalletSummariesSource satisfies WalletSummaryCatalog;
const russianWalletSummaries =
  russianWalletSummariesSource satisfies WalletSummaryCatalog;
const indonesianWalletSummaries =
  indonesianWalletSummariesSource satisfies WalletSummaryCatalog;
const brazilianPortugueseWalletSummaries =
  brazilianPortugueseWalletSummariesSource satisfies WalletSummaryCatalog;

function assertNever(value: never): never {
  throw new Error(`Unsupported wallet locale: ${String(value)}`);
}

function assertCompleteCatalog(
  locale: Locale,
  catalog: Readonly<Record<string, unknown>>,
): void {
  const walletIds = kaspaWallets.map((wallet) => wallet.id).sort();
  const catalogIds = Object.keys(catalog).sort();

  if (JSON.stringify(catalogIds) !== JSON.stringify(walletIds)) {
    throw new Error(
      `Wallet summaries for ${locale} must exactly match wallet IDs: expected ${JSON.stringify(walletIds)}, received ${JSON.stringify(catalogIds)}`,
    );
  }

  for (const wallet of kaspaWallets) {
    const summary = catalog[wallet.id];
    if (typeof summary !== "string" || summary.trim().length === 0) {
      throw new Error(
        `Wallet summary for ${wallet.id}:${locale} must be a non-empty string`,
      );
    }
    if (!hasSameIcuStructure(wallet.summary, summary)) {
      throw new Error(
        `Wallet summary for ${wallet.id}:${locale} changed its ICU interface`,
      );
    }
  }
}

export function getLocalizedWallets(locale: Locale): KaspaWallet[] {
  switch (locale) {
    case "en":
      return kaspaWallets.map((wallet) => ({ ...wallet }));
    case pseudoLocale:
      return kaspaWallets.map((wallet) => ({
        ...wallet,
        summary: pseudoLocalizeMessage(wallet.summary),
      }));
    case spanishLocale:
      assertCompleteCatalog(spanishLocale, spanishWalletSummaries);
      return kaspaWallets.map((wallet) => ({
        ...wallet,
        summary: spanishWalletSummaries[wallet.id],
      }));
    case germanLocale:
      assertCompleteCatalog(germanLocale, germanWalletSummaries);
      return kaspaWallets.map((wallet) => ({
        ...wallet,
        summary: germanWalletSummaries[wallet.id],
      }));
    case frenchLocale:
      assertCompleteCatalog(frenchLocale, frenchWalletSummaries);
      return kaspaWallets.map((wallet) => ({
        ...wallet,
        summary: frenchWalletSummaries[wallet.id],
      }));
    case chineseLocale:
      assertCompleteCatalog(chineseLocale, chineseWalletSummaries);
      return kaspaWallets.map((wallet) => ({
        ...wallet,
        summary: chineseWalletSummaries[wallet.id],
      }));
    case russianLocale:
      assertCompleteCatalog(russianLocale, russianWalletSummaries);
      return kaspaWallets.map((wallet) => ({
        ...wallet,
        summary: russianWalletSummaries[wallet.id],
      }));
    case indonesianLocale:
      assertCompleteCatalog(indonesianLocale, indonesianWalletSummaries);
      return kaspaWallets.map((wallet) => ({
        ...wallet,
        summary: indonesianWalletSummaries[wallet.id],
      }));
    case brazilianPortugueseLocale:
      assertCompleteCatalog(
        brazilianPortugueseLocale,
        brazilianPortugueseWalletSummaries,
      );
      return kaspaWallets.map((wallet) => ({
        ...wallet,
        summary: brazilianPortugueseWalletSummaries[wallet.id],
      }));
    default:
      return assertNever(locale);
  }
}
