import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { getDagAnnotationFontContract } from "../../src/i18n/dag-annotation-font.ts";
import { chineseLocale } from "../../src/i18n/locale-registry.ts";
import { chineseMessages } from "../../src/i18n/messages.ts";
import { getOpenGraphFontContract } from "../../src/i18n/opengraph-font.ts";

const repositoryRoot = resolve(
  fileURLToPath(new URL("../../", import.meta.url)),
);

function findTable(font: Buffer, tag: string): number {
  const tableCount = font.readUInt16BE(4);
  for (let index = 0; index < tableCount; index += 1) {
    const record = 12 + index * 16;
    if (font.toString("ascii", record, record + 4) === tag) {
      return font.readUInt32BE(record + 8);
    }
  }
  throw new Error(`Font is missing ${tag} table`);
}

function format4HasGlyph(font: Buffer, table: number, codePoint: number) {
  const segCount = font.readUInt16BE(table + 6) / 2;
  const endCodes = table + 14;
  const startCodes = endCodes + segCount * 2 + 2;
  const deltas = startCodes + segCount * 2;
  const rangeOffsets = deltas + segCount * 2;

  for (let index = 0; index < segCount; index += 1) {
    const start = font.readUInt16BE(startCodes + index * 2);
    const end = font.readUInt16BE(endCodes + index * 2);
    if (codePoint < start || codePoint > end) continue;

    const delta = font.readInt16BE(deltas + index * 2);
    const rangeOffsetEntry = rangeOffsets + index * 2;
    const rangeOffset = font.readUInt16BE(rangeOffsetEntry);
    if (rangeOffset === 0) return ((codePoint + delta) & 0xffff) !== 0;

    const glyphAddress =
      rangeOffsetEntry + rangeOffset + (codePoint - start) * 2;
    if (glyphAddress + 2 > font.length) return false;
    const glyph = font.readUInt16BE(glyphAddress);
    return glyph !== 0 && ((glyph + delta) & 0xffff) !== 0;
  }
  return false;
}

function fontHasGlyph(font: Buffer, codePoint: number): boolean {
  const cmap = findTable(font, "cmap");
  const subtableCount = font.readUInt16BE(cmap + 2);
  for (let index = 0; index < subtableCount; index += 1) {
    const record = cmap + 4 + index * 8;
    const table = cmap + font.readUInt32BE(record + 4);
    if (font.readUInt16BE(table) !== 4 || codePoint > 0xffff) continue;
    if (format4HasGlyph(font, table, codePoint)) return true;
  }
  return false;
}

test("Simplified Chinese Open Graph fonts cover the offline render copy", async () => {
  const copy = chineseMessages.home.openGraph;
  const visibleCharacters = new Set(
    [...`${copy.heading.replace("\n", " ")} ${copy.tagline}`].filter(
      (character) => !/\s/u.test(character),
    ),
  );
  const fontContract = getOpenGraphFontContract(chineseLocale);
  assert.equal(fontContract.family, "Noto Sans SC");

  for (const asset of fontContract.assets) {
    const font = await readFile(
      join(repositoryRoot, "src/app/fonts", asset.filename),
    );
    const missing = [...visibleCharacters].filter(
      (character) => !fontHasGlyph(font, character.codePointAt(0)!),
    );
    assert.deepEqual(missing, [], `${asset.filename} glyph coverage`);
  }
});

test("Simplified Chinese DAG annotation font covers the reviewed copy", async () => {
  const copy = chineseMessages.home.hero.dagAnnotation;
  const visibleCharacters = new Set(
    [...copy].filter((character) => !/\s/u.test(character)),
  );
  const fontContract = getDagAnnotationFontContract(chineseLocale);
  assert.equal(fontContract.family, "Ma Shan Zheng");
  if (fontContract.filename === null) {
    assert.fail("Simplified Chinese DAG annotation font needs a local asset");
  }

  const font = await readFile(
    join(repositoryRoot, "src/app/fonts", fontContract.filename),
  );
  const missing = [...visibleCharacters].filter(
    (character) => !fontHasGlyph(font, character.codePointAt(0)!),
  );
  assert.deepEqual(missing, [], `${fontContract.filename} glyph coverage`);
});
