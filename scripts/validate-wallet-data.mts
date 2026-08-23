import { readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";

import { kaspaWallets } from "../src/data/wallets.ts";
import {
  ACTION_IMPLIED_OS,
  WALLET_ACTION_IDS,
  WALLET_CHECK_RATINGS,
  WALLET_CRITERIA_IDS,
  WALLET_FEATURE_IDS,
  WALLET_OS_IDS,
  WALLET_RATINGS_BY_CRITERION,
  WALLET_USER_TYPES,
} from "../src/app/hodl/wallet-finder/taxonomy.ts";
import { supportedLocaleCodes } from "../src/i18n/locale-registry.ts";
import { getLocalizedWallets } from "../src/i18n/wallets.ts";
import { validateWalletAvailability } from "./wallet-availability-validation.mts";

const allowedOs = new Set<string>(WALLET_OS_IDS);
const allowedUsers = new Set<string>(WALLET_USER_TYPES);
const allowedActions = new Set<string>(WALLET_ACTION_IDS);
const allowedRatings = new Set<string>(WALLET_CHECK_RATINGS);
const requiredCriteria = WALLET_CRITERIA_IDS;
const allowedFeatures = new Set<string>(WALLET_FEATURE_IDS);
const actionImpliedOs: Partial<Record<string, string>> = ACTION_IMPLIED_OS;

const errors: string[] = [];
const walletIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const githubPullRequestUrlPattern =
  /^https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/pull\/\d+$/;
const iconPathPattern =
  /^\/hodl\/wallets\/([a-z0-9]+(?:-[a-z0-9]+)*)\/icon\.(svg|png|jpe?g)$/;
const maxSummaryLength = 140;
const maxSvgIconBytes = 100 * 1024;
const maxRasterIconBytes = 150 * 1024;

function fail(path: string, message: string) {
  errors.push(`${path}: ${message}`);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasValidUrl(value: string) {
  return /^(https?:\/\/|\/)/.test(value);
}

function hasUrl(value: string) {
  return /https?:\/\/|www\./i.test(value);
}

function validateWalletSummary(path: string, summary: unknown) {
  if (!isNonEmptyString(summary)) {
    fail(path, "must be a non-empty string");
    return;
  }

  if (summary.length > maxSummaryLength) {
    fail(path, `must be ${maxSummaryLength} characters or fewer`);
  }
  if (/[\r\n]/.test(summary)) {
    fail(path, "must be a single line");
  }
  if (hasUrl(summary)) {
    fail(path, "must not contain URLs");
  }
}

function getPublicFilePath(publicPath: string) {
  return join(process.cwd(), "public", publicPath.replace(/^\/+/, ""));
}

function readPngDimensions(buffer: Buffer) {
  const pngSignature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== pngSignature) {
    return undefined;
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function readJpegDimensions(buffer: Buffer) {
  let offset = 2;

  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return undefined;
  }

  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      return undefined;
    }

    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);

    if (
      marker === 0xc0 ||
      marker === 0xc1 ||
      marker === 0xc2 ||
      marker === 0xc3
    ) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }

    offset += 2 + length;
  }

  return undefined;
}

function readSvgDimensions(svg: string) {
  const viewBoxMatch = svg.match(
    /\bviewBox=["']\s*[-\d.]+\s+[-\d.]+\s+([-\d.]+)\s+([-\d.]+)\s*["']/i,
  );

  if (viewBoxMatch) {
    return {
      width: Number(viewBoxMatch[1]),
      height: Number(viewBoxMatch[2]),
    };
  }

  const widthMatch = svg.match(/\bwidth=["']([\d.]+)/i);
  const heightMatch = svg.match(/\bheight=["']([\d.]+)/i);

  if (widthMatch && heightMatch) {
    return {
      width: Number(widthMatch[1]),
      height: Number(heightMatch[1]),
    };
  }

  return undefined;
}

function validateIcon(walletPath: string, walletId: string, icon: string) {
  const match = icon.match(iconPathPattern);

  if (!match) {
    fail(
      `${walletPath}.icon`,
      "must use /hodl/wallets/<wallet-id>/icon.svg, .png, .jpg, or .jpeg",
    );
    return;
  }

  if (match[1] !== walletId) {
    fail(`${walletPath}.icon`, "folder name must match wallet id");
  }

  const filePath = getPublicFilePath(icon);
  const extension = extname(filePath).toLowerCase();

  let fileSize = 0;
  try {
    fileSize = statSync(filePath).size;
  } catch {
    fail(`${walletPath}.icon`, "file must exist under public");
    return;
  }

  const maxIconBytes =
    extension === ".svg" ? maxSvgIconBytes : maxRasterIconBytes;
  if (fileSize > maxIconBytes) {
    fail(
      `${walletPath}.icon`,
      `file must be ${Math.round(maxIconBytes / 1024)}KB or smaller`,
    );
  }

  const file = readFileSync(filePath);
  const dimensions =
    extension === ".svg"
      ? readSvgDimensions(file.toString("utf8"))
      : extension === ".png"
        ? readPngDimensions(file)
        : readJpegDimensions(file);

  if (!dimensions) {
    fail(`${walletPath}.icon`, "dimensions could not be read");
  } else if (dimensions.width !== dimensions.height) {
    fail(`${walletPath}.icon`, "must be square");
  } else if (extension !== ".svg" && dimensions.width > 512) {
    fail(`${walletPath}.icon`, "raster icons must be 512px or smaller");
  }
}

function validateCheck(
  path: string,
  check: unknown,
  { partial }: { partial: boolean },
) {
  if (typeof check !== "object" || check === null) {
    fail(path, "must be an object");
    return;
  }

  for (const criterion of requiredCriteria) {
    const rating = (check as Record<string, unknown>)[criterion];
    if (rating === undefined) {
      if (!partial) {
        fail(`${path}.${criterion}`, "is required");
      }
      continue;
    }
    if (typeof rating !== "string" || !allowedRatings.has(rating)) {
      fail(
        `${path}.${criterion}`,
        "must be good, acceptable, caution, or not_applicable",
      );
    } else if (
      !(WALLET_RATINGS_BY_CRITERION[criterion] as readonly string[]).includes(
        rating,
      )
    ) {
      fail(`${path}.${criterion}`, `"${rating}" is not valid for ${criterion}`);
    }
  }

  for (const key of Object.keys(check)) {
    if (!requiredCriteria.includes(key as (typeof requiredCriteria)[number])) {
      fail(`${path}.${key}`, "is not a known criterion");
    }
  }
}

function validateFeatures(path: string, features: unknown) {
  if (!Array.isArray(features)) {
    fail(path, "must be an array");
    return;
  }
  const seen = new Set<string>();
  features.forEach((feature, featureIndex) => {
    if (typeof feature !== "string" || !allowedFeatures.has(feature)) {
      fail(`${path}[${featureIndex}]`, `invalid feature "${feature}"`);
    } else if (seen.has(feature)) {
      fail(`${path}[${featureIndex}]`, `duplicate feature "${feature}"`);
    } else {
      seen.add(feature);
    }
  });
}

function effectiveValidation(
  walletCheck: { validation?: string },
  override: { validation?: string } | undefined,
) {
  return override?.validation ?? walletCheck.validation;
}

const walletIds = new Set<string>();

kaspaWallets.forEach((wallet, walletIndex) => {
  const walletPath = `kaspaWallets[${walletIndex}]`;

  if (!isNonEmptyString(wallet.id)) {
    fail(`${walletPath}.id`, "must be a non-empty string");
  } else if (!walletIdPattern.test(wallet.id)) {
    fail(
      `${walletPath}.id`,
      "must use lowercase letters, numbers, and single hyphens",
    );
  } else if (walletIds.has(wallet.id)) {
    fail(`${walletPath}.id`, `duplicate wallet id "${wallet.id}"`);
  } else {
    walletIds.add(wallet.id);
  }

  for (const field of ["title", "icon", "summary"] as const) {
    if (!isNonEmptyString(wallet[field])) {
      fail(`${walletPath}.${field}`, "must be a non-empty string");
    }
  }

  if (isNonEmptyString(wallet.id) && isNonEmptyString(wallet.icon)) {
    validateIcon(walletPath, wallet.id, wallet.icon);
  }

  if (isNonEmptyString(wallet.summary)) {
    validateWalletSummary(`${walletPath}.summary`, wallet.summary);
  }

  if (!allowedUsers.has(wallet.user)) {
    fail(`${walletPath}.user`, "must be beginner or experienced");
  }

  if (wallet.review !== undefined) {
    if (typeof wallet.review !== "object" || wallet.review === null) {
      fail(`${walletPath}.review`, "must be an object when provided");
    } else {
      if (!isNonEmptyString(wallet.review.submitter)) {
        fail(`${walletPath}.review.submitter`, "must be a non-empty string");
      }
      if (!isNonEmptyString(wallet.review.submission)) {
        fail(`${walletPath}.review.submission`, "must be a non-empty string");
      } else if (!githubPullRequestUrlPattern.test(wallet.review.submission)) {
        fail(
          `${walletPath}.review.submission`,
          "must be a GitHub pull request URL",
        );
      }
    }
  }

  const availability = validateWalletAvailability(walletPath, wallet);
  errors.push(...availability.errors);
  const supportedPlatforms = availability.platforms;
  const platformList = [...supportedPlatforms];

  validateFeatures(`${walletPath}.features`, wallet.features);
  validateCheck(`${walletPath}.check`, wallet.check, { partial: false });

  if (wallet.platformOverrides !== undefined) {
    if (
      typeof wallet.platformOverrides !== "object" ||
      wallet.platformOverrides === null ||
      Array.isArray(wallet.platformOverrides)
    ) {
      fail(
        `${walletPath}.platformOverrides`,
        "must be an object when provided",
      );
    } else {
      for (const [os, override] of Object.entries(wallet.platformOverrides)) {
        const overridePath = `${walletPath}.platformOverrides.${os}`;
        if (!allowedOs.has(os)) {
          fail(overridePath, `invalid OS "${os}"`);
          continue;
        }
        if (!supportedPlatforms.has(os)) {
          fail(
            overridePath,
            `override targets "${os}" but it is not in the wallet availability`,
          );
        }
        if (typeof override !== "object" || override === null) {
          fail(overridePath, "must be an object");
          continue;
        }
        if (override.features !== undefined) {
          validateFeatures(`${overridePath}.features`, override.features);
        }
        if (override.check !== undefined) {
          validateCheck(`${overridePath}.check`, override.check, {
            partial: true,
          });
        }
      }
    }
  }

  if (supportedPlatforms.has("hardware")) {
    const hardwareOverride = wallet.platformOverrides?.hardware?.check;
    const validation = effectiveValidation(
      wallet.check ?? {},
      hardwareOverride,
    );
    if (validation !== "not_applicable") {
      fail(
        `${walletPath}.check.validation`,
        "hardware platforms must resolve to not_applicable validation (set wallet.check.validation or platformOverrides.hardware.check.validation)",
      );
    }
  }

  if (!Array.isArray(wallet.actions) || wallet.actions.length === 0) {
    fail(`${walletPath}.actions`, "must contain at least one action");
    return;
  }

  const actionFingerprints = new Set<string>();
  wallet.actions.forEach((action, actionIndex) => {
    const actionPath = `${walletPath}.actions[${actionIndex}]`;

    if (!allowedActions.has(action.action)) {
      fail(`${actionPath}.action`, `invalid action "${action.action}"`);
    }

    if (!isNonEmptyString(action.link)) {
      fail(`${actionPath}.link`, "must be a non-empty string");
    } else if (!hasValidUrl(action.link)) {
      fail(
        `${actionPath}.link`,
        "must be an absolute URL or root-relative path",
      );
    }

    let scope: string[] = platformList;
    if (action.platforms !== undefined) {
      if (!Array.isArray(action.platforms) || action.platforms.length === 0) {
        fail(`${actionPath}.platforms`, "must be a non-empty array when set");
      } else {
        const seen = new Set<string>();
        action.platforms.forEach((os, osIndex) => {
          if (!allowedOs.has(os)) {
            fail(`${actionPath}.platforms[${osIndex}]`, `invalid OS "${os}"`);
          } else if (seen.has(os)) {
            fail(
              `${actionPath}.platforms[${osIndex}]`,
              `duplicate platform "${os}"`,
            );
          } else if (!supportedPlatforms.has(os)) {
            fail(
              `${actionPath}.platforms[${osIndex}]`,
              `"${os}" is not in the wallet's platforms or paths`,
            );
          } else {
            seen.add(os);
          }
        });
        scope = action.platforms;
      }
    }

    const impliedOs = actionImpliedOs[action.action];
    if (impliedOs) {
      if (action.platforms === undefined) {
        fail(
          `${actionPath}.platforms`,
          `${action.action} actions must scope platforms to ["${impliedOs}"]`,
        );
      } else if (
        action.platforms.length !== 1 ||
        action.platforms[0] !== impliedOs
      ) {
        fail(
          `${actionPath}.platforms`,
          `${action.action} actions must scope to ["${impliedOs}"]`,
        );
      }
    }

    const fingerprint = `${action.action}|${action.link}|${[...scope].sort().join(",")}`;
    if (actionFingerprints.has(fingerprint)) {
      fail(
        `${actionPath}`,
        "duplicate action: same action, link, and platform scope already defined",
      );
    } else {
      actionFingerprints.add(fingerprint);
    }
  });
});

for (const locale of supportedLocaleCodes) {
  try {
    const localizedWallets = getLocalizedWallets(locale);
    const localizedIds = localizedWallets.map((wallet) => wallet.id).sort();
    if (
      JSON.stringify(localizedIds) !== JSON.stringify([...walletIds].sort())
    ) {
      fail(
        `wallet summaries:${locale}`,
        "must exactly match the canonical wallet IDs",
      );
    }
    for (const wallet of localizedWallets) {
      if (!isNonEmptyString(wallet.summary)) {
        fail(
          `wallet summaries:${locale}.${wallet.id}`,
          "must be a non-empty string",
        );
      } else if (/\r|\n/.test(wallet.summary)) {
        fail(
          `wallet summaries:${locale}.${wallet.id}`,
          "must be a single line",
        );
      }
    }
  } catch (error) {
    fail(
      `wallet summaries:${locale}`,
      error instanceof Error ? error.message : String(error),
    );
  }
}

if (errors.length > 0) {
  console.error("Wallet data validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Wallet data validation passed (${kaspaWallets.length} wallets).`);
