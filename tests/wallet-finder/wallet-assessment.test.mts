import assert from "node:assert/strict";
import test from "node:test";

import { validateWalletAvailability } from "../../scripts/wallet-availability-validation.mts";
import { createWalletFinderModel } from "../../src/app/hodl/wallet-finder/walletModel.ts";
import type { KaspaWallet } from "../../src/app/hodl/wallet-finder/types.ts";

const details: Pick<
  KaspaWallet,
  | "id"
  | "title"
  | "icon"
  | "user"
  | "summary"
  | "features"
  | "check"
  | "actions"
> = {
  id: "test-wallet",
  title: "Test Wallet",
  icon: "/hodl/wallets/test-wallet/icon.svg",
  user: "beginner",
  summary: "A wallet test fixture.",
  features: [],
  check: {
    control: "good",
    validation: "acceptable",
    transparency: "acceptable",
    fees: "good",
  },
  actions: [{ action: "open", link: "https://example.com" }],
};

test("platform differences remain visible through non-platform filters", () => {
  const wallet: KaspaWallet = {
    ...details,
    platforms: ["android", "ios"],
    features: ["two_fa"],
    platformOverrides: {
      ios: { check: { transparency: "caution", fees: "caution" } },
    },
  };

  const match = createWalletFinderModel([wallet], {
    important: [],
    features: ["two_fa"],
  }).matches[0];

  assert.equal(match.presentation.ratings.transparency, "mixed");
  assert.equal(match.presentation.ratings.fees, "mixed");
  assert.deepEqual(match.presentation.breakdowns.fees, [
    { platforms: ["android"], rating: "good" },
    { platforms: ["ios"], rating: "caution" },
  ]);
});

test("a hardware path returns every required platform and relevant action", () => {
  const wallet: KaspaWallet = {
    ...details,
    paths: [
      { platforms: ["hardware", "android"] },
      { platforms: ["hardware", "ios"] },
    ],
    check: { ...details.check, validation: "good" },
    platformOverrides: {
      hardware: {
        check: { validation: "not_applicable", transparency: "caution" },
      },
    },
    actions: [
      {
        action: "google_play",
        link: "https://example.com/android",
        platforms: ["android"],
      },
      {
        action: "app_store",
        link: "https://example.com/ios",
        platforms: ["ios"],
      },
    ],
  };

  const android = createWalletFinderModel([wallet], {
    os: "android",
    important: [],
    features: [],
  }).matches[0];
  assert.deepEqual(android.platforms, ["hardware", "android"]);
  assert.deepEqual(android.actions, [wallet.actions[0]]);
  assert.equal(android.presentation.ratings.validation, "good");
  assert.deepEqual(android.presentation.breakdowns.validation, [
    { platforms: ["hardware"], rating: "not_applicable" },
    { platforms: ["android"], rating: "good" },
  ]);
  assert.equal(android.presentation.ratings.transparency, "mixed");

  const hardware = createWalletFinderModel([wallet], {
    os: "hardware",
    important: ["validation"],
    features: [],
  }).matches[0];
  assert.deepEqual(hardware.platforms, ["hardware", "android", "ios"]);
  assert.deepEqual(hardware.actions, wallet.actions);
});

test("important criteria keep only complete paths that satisfy them", () => {
  const wallet: KaspaWallet = {
    ...details,
    paths: [
      { platforms: ["hardware", "android"] },
      { platforms: ["hardware", "ios"] },
    ],
    check: { ...details.check, transparency: "good" },
    platformOverrides: {
      ios: { check: { transparency: "caution" } },
    },
  };

  const match = createWalletFinderModel([wallet], {
    important: ["transparency"],
    features: [],
  }).matches[0];

  assert.deepEqual(match.paths, [{ platforms: ["hardware", "android"] }]);
  assert.deepEqual(match.platforms, ["hardware", "android"]);
  assert.equal(match.presentation.ratings.transparency, "good");
});

test("wallet availability accepts one simple list or one path matrix", () => {
  const simple = validateWalletAvailability("wallet", {
    platforms: ["android", "ios"],
  });
  assert.deepEqual(simple.errors, []);
  assert.deepEqual([...simple.platforms], ["android", "ios"]);

  const advanced = validateWalletAvailability("wallet", {
    paths: [
      { platforms: ["hardware", "android"] },
      { platforms: ["hardware", "ios"] },
    ],
  });
  assert.deepEqual(advanced.errors, []);
  assert.deepEqual([...advanced.platforms], ["hardware", "android", "ios"]);

  assert.deepEqual(
    validateWalletAvailability("wallet", {
      platforms: ["hardware", "android"],
    }).errors,
    [
      "wallet.platforms: hardware with companion platforms must use paths to declare working combinations",
    ],
  );
  assert.deepEqual(
    validateWalletAvailability("wallet", {
      platforms: ["android"],
      paths: [{ platforms: ["android"] }],
    }).errors,
    ["wallet: must define exactly one of platforms or paths"],
  );
});
