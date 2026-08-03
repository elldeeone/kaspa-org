import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { pseudoLocalizeCatalog } from "../../src/i18n/pseudo.ts";
import {
  compareCatalogs,
  flattenCatalog,
  validateCatalogSource,
  type MessageCatalog,
} from "./catalog-contract.mts";

const SOURCE_LOCALE = "en";
const PSEUDO_LOCALE = "en-XA";

export const PSEUDO_UNCHANGED_MESSAGE_KEYS = [
  "errors.page.code",
  "home.proof.supply.comparison.unit",
  "shared.ai.providers.chatgpt",
  "shared.ai.providers.claude",
  "shared.ai.providers.perplexity",
  "shared.footer.links.github",
  "shared.footer.links.x",
] as const;

const defaultUnchangedAllowlist = new Set<string>(
  PSEUDO_UNCHANGED_MESSAGE_KEYS,
);

export function generatePseudoCatalog<T extends MessageCatalog>(source: T): T {
  return pseudoLocalizeCatalog(source);
}

export function validateGeneratedPseudoCatalog(
  sourceCatalog: MessageCatalog,
  generatedCatalog: MessageCatalog,
  unchangedAllowlist: ReadonlySet<string> = defaultUnchangedAllowlist,
): string[] {
  const errors = compareCatalogs(sourceCatalog, generatedCatalog);
  const sourceMessages = flattenCatalog(sourceCatalog);
  const generatedMessages = flattenCatalog(generatedCatalog);

  for (const [key, sourceMessage] of sourceMessages) {
    const generatedMessage = generatedMessages.get(key);
    if (generatedMessage === undefined) continue;
    const unchanged = generatedMessage === sourceMessage;
    if (unchanged && !unchangedAllowlist.has(key)) {
      errors.push(`${key} did not change in the generated pseudo catalog`);
    }
    if (!unchanged && unchangedAllowlist.has(key)) {
      errors.push(`${key} is a stale pseudo unchanged-message allowlist entry`);
    }
  }

  for (const key of [...unchangedAllowlist].sort()) {
    if (!sourceMessages.has(key)) {
      errors.push(
        `${key} is a pseudo unchanged-message allowlist entry without a source message`,
      );
    }
  }

  return errors;
}

export function serializePseudoCatalog(catalog: MessageCatalog): string {
  return `${JSON.stringify(catalog, null, 2)}\n`;
}

async function loadSourceCatalog(repositoryRoot: string) {
  const sourceCatalog: Record<string, MessageCatalog> = {};
  const errors: string[] = [];
  const sourceDirectory = join(repositoryRoot, "messages", SOURCE_LOCALE);
  const sourceNamespaces = (
    await readdir(sourceDirectory, {
      withFileTypes: true,
    })
  )
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name.slice(0, -".json".length))
    .sort();
  if (!sourceNamespaces.length) {
    throw new Error(`No source catalogs found in ${sourceDirectory}`);
  }

  for (const namespace of sourceNamespaces) {
    const relativePath = `messages/${SOURCE_LOCALE}/${namespace}.json`;
    const source = await readFile(join(repositoryRoot, relativePath), "utf8");
    const result = validateCatalogSource(source, relativePath);
    errors.push(...result.errors);
    if (result.catalog) sourceCatalog[namespace] = result.catalog;
  }

  if (errors.length) throw new Error(errors.join("\n"));
  return sourceCatalog;
}

type CliOptions = {
  check: boolean;
  output: string | null;
};

function parseCliOptions(args: readonly string[]): CliOptions {
  let check = false;
  let output: string | null = null;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--check") {
      check = true;
      continue;
    }
    if (argument === "--output") {
      output = args[index + 1] ?? null;
      if (!output) throw new Error("--output requires a path");
      index += 1;
      continue;
    }
    throw new Error(`Unknown option: ${argument}`);
  }

  if (!check && !output) {
    throw new Error("Use --check or --output <path>");
  }
  return { check, output };
}

async function main(): Promise<void> {
  const options = parseCliOptions(process.argv.slice(2));
  const repositoryRoot = process.cwd();
  const sourceCatalog = await loadSourceCatalog(repositoryRoot);
  const generatedCatalog = generatePseudoCatalog(sourceCatalog);
  const errors = validateGeneratedPseudoCatalog(
    sourceCatalog,
    generatedCatalog,
  );
  if (errors.length) throw new Error(errors.join("\n"));

  const serialized = serializePseudoCatalog(generatedCatalog);
  const regenerated = serializePseudoCatalog(
    generatePseudoCatalog(sourceCatalog),
  );
  if (serialized !== regenerated) {
    throw new Error("Pseudo catalog generation is not deterministic");
  }

  if (options.output) {
    const outputPath = resolve(repositoryRoot, options.output);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, serialized, "utf8");
    console.log(`generated ${PSEUDO_LOCALE} catalog: ${outputPath}`);
  } else {
    console.log(
      `pseudo catalog valid: ${flattenCatalog(generatedCatalog).size} messages`,
    );
  }
}

const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMain) await main();
