import { WALLET_OS_IDS } from "../src/app/hodl/wallet-finder/taxonomy.ts";

const allowedOs = new Set<string>(WALLET_OS_IDS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateWalletAvailability(
  path: string,
  availability: { platforms?: unknown; paths?: unknown },
) {
  const errors: string[] = [];
  const platforms = new Set<string>();
  const fail = (failurePath: string, message: string) => {
    errors.push(`${failurePath}: ${message}`);
  };
  const hasPlatforms = availability.platforms !== undefined;
  const hasPaths = availability.paths !== undefined;

  if (hasPlatforms === hasPaths) {
    fail(path, "must define exactly one of platforms or paths");
    return { errors, platforms };
  }

  const validatePlatforms = (
    platformPath: string,
    value: unknown,
  ): Set<string> => {
    const found = new Set<string>();
    if (!Array.isArray(value) || value.length === 0) {
      fail(platformPath, "must be a non-empty array");
      return found;
    }

    value.forEach((platform, index) => {
      const itemPath = `${platformPath}[${index}]`;
      if (typeof platform !== "string" || !allowedOs.has(platform)) {
        fail(itemPath, `invalid OS "${platform}"`);
      } else if (found.has(platform)) {
        fail(itemPath, `duplicate platform "${platform}"`);
      } else {
        found.add(platform);
        platforms.add(platform);
      }
    });
    return found;
  };

  if (hasPlatforms) {
    const simplePlatforms = validatePlatforms(
      `${path}.platforms`,
      availability.platforms,
    );
    if (simplePlatforms.has("hardware") && simplePlatforms.size > 1) {
      fail(
        `${path}.platforms`,
        "hardware with companion platforms must use paths to declare working combinations",
      );
    }
    return { errors, platforms };
  }

  if (!Array.isArray(availability.paths) || availability.paths.length === 0) {
    fail(`${path}.paths`, "must be a non-empty array");
    return { errors, platforms };
  }

  const seenPaths = new Set<string>();
  availability.paths.forEach((usagePath, index) => {
    const usagePathPath = `${path}.paths[${index}]`;
    if (!isRecord(usagePath)) {
      fail(usagePathPath, "must be an object");
      return;
    }
    for (const key of Object.keys(usagePath)) {
      if (key !== "platforms") {
        fail(`${usagePathPath}.${key}`, "is not a known path field");
      }
    }

    const pathPlatforms = validatePlatforms(
      `${usagePathPath}.platforms`,
      usagePath.platforms,
    );
    const fingerprint = [...pathPlatforms].sort().join(":");
    if (fingerprint && seenPaths.has(fingerprint)) {
      fail(usagePathPath, "duplicates another path");
    } else if (fingerprint) {
      seenPaths.add(fingerprint);
    }
  });

  return { errors, platforms };
}
