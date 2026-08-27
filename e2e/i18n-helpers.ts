import { expect, type Locator, type Page } from "@playwright/test";

import { buildExampleContract } from "../src/i18n/build-example-contract.ts";

export const standaloneExampleNames = Object.freeze(
  buildExampleContract.examples.map(({ name }) => name),
);

export const standaloneBasePath = buildExampleContract.examplesPublicBasePath;

export async function waitForStableLayout(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.images]
        .filter((image) => image.currentSrc)
        .map((image) =>
          image.complete ? undefined : image.decode().catch(() => undefined),
        ),
    );
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
}

export async function measureOpenGraphImage(page: Page, pathname: string) {
  return page.evaluate(async (imagePathname) => {
    const response = await fetch(imagePathname);
    if (!response.ok) {
      throw new Error(
        `Open Graph image ${imagePathname} returned ${response.status}`,
      );
    }

    const bitmap = await createImageBitmap(await response.blob());
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("2D canvas is unavailable");
    context.drawImage(bitmap, 0, 0);
    const pixels = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
    const background = [pixels[0], pixels[1], pixels[2]];
    const inkRows = new Set<number>();
    let inkPixels = 0;
    let minX = bitmap.width;
    let maxX = -1;
    let minY = bitmap.height;
    let maxY = -1;

    for (let y = 0; y < bitmap.height; y += 1) {
      for (let x = 0; x < bitmap.width; x += 1) {
        const offset = (y * bitmap.width + x) * 4;
        const distance =
          Math.abs(pixels[offset] - background[0]) +
          Math.abs(pixels[offset + 1] - background[1]) +
          Math.abs(pixels[offset + 2] - background[2]);
        if (pixels[offset + 3] === 0 || distance < 24) continue;
        inkPixels += 1;
        inkRows.add(y);
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }

    let inkBandCount = 0;
    let lastInkRow = Number.NEGATIVE_INFINITY;
    for (const row of inkRows) {
      if (row - lastInkRow > 12) inkBandCount += 1;
      lastInkRow = row;
    }
    bitmap.close();

    return {
      width: canvas.width,
      height: canvas.height,
      inkPixels,
      inkBandCount,
      minX,
      maxX,
      minY,
      maxY,
    };
  }, pathname);
}

export async function assertNoHorizontalOverflow(
  page: Page,
  viewportWidth: number,
  state: string,
) {
  const dimensions = await page.evaluate(() => {
    const client = document.documentElement.clientWidth;
    const overflowing = [...document.body.querySelectorAll("*")]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          element: [
            element.tagName.toLowerCase(),
            element.id ? `#${element.id}` : "",
            element.classList.length
              ? `.${[...element.classList].slice(0, 2).join(".")}`
              : "",
          ].join(""),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          text: element.textContent?.replace(/\s+/gu, " ").trim().slice(0, 80),
        };
      })
      .filter(({ left, right }) => left < -1 || right > client + 1)
      .slice(0, 5);

    return {
      body: document.body.scrollWidth,
      client,
      document: document.documentElement.scrollWidth,
      overflowing,
    };
  });
  expect(
    Math.max(dimensions.body, dimensions.document),
    `${viewportWidth}px ${state}; overflowing: ${JSON.stringify(dimensions.overflowing)}`,
  ).toBeLessThanOrEqual(dimensions.client + 1);
}

export async function assertWordsStayOnSingleLine(
  heading: Locator,
  state: string,
) {
  const splitWords = await heading.evaluate((element) => {
    const split: string[] = [];
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);

    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent ?? "";
      for (const match of text.matchAll(/\S+/gu)) {
        const lineTops = new Set<number>();
        for (
          let index = match.index;
          index < match.index + match[0].length;
          index += 1
        ) {
          const range = document.createRange();
          range.setStart(node, index);
          range.setEnd(node, index + 1);
          lineTops.add(Math.round(range.getBoundingClientRect().top));
        }
        if (lineTops.size > 1) split.push(match[0]);
      }
    }

    return split;
  });

  expect(splitWords, `${state}; split words`).toEqual([]);
}

export async function assertHeadingUsesResponsiveWrapping(
  heading: Locator,
  state: string,
) {
  const wrapping = await heading.evaluate((element) => {
    const styles = getComputedStyle(element);
    return {
      clientWidth: element.clientWidth,
      overflowWrap: styles.overflowWrap,
      scrollWidth: element.scrollWidth,
      wordBreak: styles.wordBreak,
    };
  });

  expect(wrapping, `${state}; wrapping policy`).toMatchObject({
    overflowWrap: "break-word",
    wordBreak: "normal",
  });
  expect(
    wrapping.scrollWidth,
    `${state}; heading must fit its container`,
  ).toBeLessThanOrEqual(wrapping.clientWidth + 1);
}

export async function assertEqualControlRow(controls: Locator, state: string) {
  await expect(controls, state).toHaveCount(2);
  const geometry = await controls.evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        height: rect.height,
        overflow: element.scrollWidth > element.clientWidth + 1,
        width: rect.width,
        y: rect.y,
      };
    }),
  );
  const [first, second] = geometry;
  if (!first || !second) throw new Error(`${state}; proof controls missing`);

  expect(Math.abs(first.y - second.y), `${state}; controls share a row`).toBe(
    0,
  );
  expect(
    Math.abs(first.width - second.width),
    `${state}; controls have equal widths`,
  ).toBeLessThanOrEqual(1);
  expect(
    Math.abs(first.height - second.height),
    `${state}; controls have equal heights`,
  ).toBeLessThanOrEqual(1);
  expect(
    geometry.some(({ overflow }) => overflow),
    `${state}; control content overflows`,
  ).toBe(false);
}
