import { expect, test, type Locator, type Page } from "@playwright/test";

const countDagPixels = async (page: Page, canvas: Locator) => {
  const screenshot = await canvas.screenshot();

  return page.evaluate(
    async (source) => {
      const bitmap = await createImageBitmap(
        await (await fetch(source)).blob(),
      );
      const sample = document.createElement("canvas");
      sample.width = bitmap.width;
      sample.height = bitmap.height;
      const context = sample.getContext("2d");
      if (!context) throw new Error("2D canvas is unavailable");
      context.drawImage(bitmap, 0, 0);
      const pixels = context.getImageData(
        0,
        0,
        bitmap.width,
        bitmap.height,
      ).data;
      const blockColors = [
        [0x55, 0x81, 0xaa],
        [0xb3, 0x4d, 0x50],
        [0xdc, 0xdc, 0xdc],
      ];
      let count = 0;

      for (let offset = 0; offset < pixels.length; offset += 4) {
        if (
          blockColors.some(
            ([red, green, blue]) =>
              Math.abs(pixels[offset] - red) +
                Math.abs(pixels[offset + 1] - green) +
                Math.abs(pixels[offset + 2] - blue) <
              24,
          )
        ) {
          count += 1;
        }
      }

      bitmap.close();
      return count;
    },
    `data:image/png;base64,${screenshot.toString("base64")}`,
  );
};

const expectRenderedDag = async (page: Page, canvas: Locator) => {
  await expect.poll(() => countDagPixels(page, canvas)).toBeGreaterThan(2_000);
};

test("renders the staged DAG before the full replay and caps canvas density", async ({
  page,
}) => {
  let releaseFullReplay!: () => void;
  const fullReplayGate = new Promise<void>((resolve) => {
    releaseFullReplay = resolve;
  });

  await page.route("**/replay/mainnet-60s-compressed.json", async (route) => {
    await fullReplayGate;
    await route.continue();
  });

  const firstFrameResponse = page.waitForResponse((response) =>
    response.url().endsWith("/replay/mainnet-first-frame.json"),
  );
  const fullReplayRequest = page.waitForRequest((request) =>
    request.url().endsWith("/replay/mainnet-60s-compressed.json"),
  );

  try {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await firstFrameResponse;
    await fullReplayRequest;

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible();
    await expectRenderedDag(page, canvas);

    const density = await canvas.evaluate(
      (element) =>
        (element as HTMLCanvasElement).width /
        element.getBoundingClientRect().width,
    );
    expect(density).toBeLessThanOrEqual(2.01);
  } finally {
    releaseFullReplay();
  }
});

test("falls back to the full replay when the staged frame stalls", async ({
  page,
}) => {
  let releaseFirstFrame!: () => void;
  const firstFrameGate = new Promise<void>((resolve) => {
    releaseFirstFrame = resolve;
  });

  await page.route("**/replay/mainnet-first-frame.json", async (route) => {
    await firstFrameGate;
    await route.continue();
  });
  const fullReplayResponse = page.waitForResponse((response) =>
    response.url().endsWith("/replay/mainnet-60s-compressed.json"),
  );

  try {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await fullReplayResponse;

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible();
    await expectRenderedDag(page, canvas);
  } finally {
    releaseFirstFrame();
  }
});
