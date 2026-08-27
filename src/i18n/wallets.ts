import spanishWalletSummariesSource from "../../messages/es/wallets.json" with { type: "json" };
import frenchWalletSummariesSource from "../../messages/fr/wallets.json" with { type: "json" };
import chineseWalletSummariesSource from "../../messages/zh-CN/wallets.json" with { type: "json" };
import russianWalletSummariesSource from "../../messages/ru/wallets.json" with { type: "json" };
import germanWalletSummariesSource from "../../messages/de/wallets.json" with { type: "json" };
import indonesianWalletSummariesSource from "../../messages/id-ID/wallets.json" with { type: "json" };

import type { KaspaWallet } from "../app/hodl/wallet-finder/types.ts";
import { kaspaWallets, type WalletId } from "../data/wallets.ts";

import {
  chineseLocale,
  frenchLocale,
  germanLocale,
  indonesianLocale,
  russianLocale,
  spanishLocale,
  type Locale,
} from "./locale-registry.ts";

type WalletSummaryCatalog = Readonly<Record<WalletId, string>>;

const spanishWalletSummaries =
  spanishWalletSummariesSource satisfies WalletSummaryCatalog;
const frenchWalletSummaries =
  frenchWalletSummariesSource satisfies WalletSummaryCatalog;
const chineseWalletSummaries =
  chineseWalletSummariesSource satisfies WalletSummaryCatalog;
const russianWalletSummaries =
  russianWalletSummariesSource satisfies WalletSummaryCatalog;
const germanWalletSummaries =
  germanWalletSummariesSource satisfies WalletSummaryCatalog;
const indonesianWalletSummaries =
  indonesianWalletSummariesSource satisfies WalletSummaryCatalog;

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
  }
}

export function getLocalizedWallets(locale: Locale): KaspaWallet[] {
  switch (locale) {
    case "en":
      return kaspaWallets.map((wallet) => ({ ...wallet }));
    case spanishLocale:
      assertCompleteCatalog(spanishLocale, spanishWalletSummaries);
      return kaspaWallets.map((wallet) => ({
        ...wallet,
        summary: spanishWalletSummaries[wallet.id],
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
    case germanLocale:
      assertCompleteCatalog(germanLocale, germanWalletSummaries);
      return kaspaWallets.map((wallet) => ({
        ...wallet,
        summary: germanWalletSummaries[wallet.id],
      }));
    case indonesianLocale:
      assertCompleteCatalog(indonesianLocale, indonesianWalletSummaries);
      return kaspaWallets.map((wallet) => ({
        ...wallet,
        summary: indonesianWalletSummaries[wallet.id],
      }));
    default:
      return assertNever(locale);
  }
}
