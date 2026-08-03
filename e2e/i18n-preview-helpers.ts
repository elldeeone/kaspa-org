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
  "subscribe-block-added": "Block Added",
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
