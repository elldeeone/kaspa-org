import { expect, type Page } from "@playwright/test";

export const standaloneExampleNames = [
  "get-server-info",
  "get-block-dag-info",
  "subscribe-block-added",
  "subscribe-daa-changed",
  "utxo-context",
] as const;

export const standaloneRuntimeFingerprints: Readonly<
  Record<(typeof standaloneExampleNames)[number], string>
> = {
  "get-server-info": "GetServerInfo",
  "get-block-dag-info": "GetBlockDagInfo",
  "subscribe-block-added": "Ɓļööçķ ÅÅďďëëď",
  "subscribe-daa-changed": "DAA",
  "utxo-context": "UtxoProcessor",
};

export const standaloneBasePath = "/vendor/kaspa-wasm/2.0.0/examples/web";

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

export async function installStandaloneExampleMocks(page: Page) {
  const interceptedModules = new Set<"core" | "rpc">();

  await page.route(
    "**/vendor/kaspa-wasm/2.0.0/web/kaspa-rpc/kaspa.js",
    async (route) => {
      interceptedModules.add("rpc");
      await route.fulfill({
        contentType: "text/javascript",
        body: `
          export default async function initialize() {}

          export class Resolver {}

          export class RpcClient {
            constructor() {
              this.url = "mock://local-rpc";
              this.listeners = new Map();
            }

            addEventListener(name, listener) {
              const listeners = this.listeners.get(name) ?? [];
              listeners.push(listener);
              this.listeners.set(name, listeners);
            }

            async emit(name) {
              for (const listener of this.listeners.get(name) ?? []) {
                await listener({ type: name });
              }
            }

            async connect() {
              await this.emit("connect");
            }

            async disconnect() {
              await this.emit("disconnect");
            }

            async getServerInfo() {
              return { serverVersion: "mock-server" };
            }

            async getBlockDagInfo() {
              return { blockCount: 1 };
            }

            async subscribeBlockAdded() {}
            async subscribeVirtualDaaScoreChanged() {}
          }

          export const Encoding = { Borsh: "borsh" };
        `,
      });
    },
  );

  await page.route(
    "**/vendor/kaspa-wasm/2.0.0/web/kaspa-core/kaspa.js",
    async (route) => {
      interceptedModules.add("core");
      await route.fulfill({
        contentType: "text/javascript",
        body: `
          export default async function initialize() {}

          export class Resolver {
            async connect() {
              return { url: "mock://local-core" };
            }
          }

          export class RpcClient {}

          export class UtxoProcessor {
            async start() {}
            async stop() {}
            addEventListener() {}
          }

          export class UtxoContext {
            async clear() {}
            async trackAddresses() {}
          }

          export const Encoding = { Borsh: "borsh" };
        `,
      });
    },
  );

  return interceptedModules;
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
