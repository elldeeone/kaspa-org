import { expect, test } from "@playwright/test";

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
    await expect
      .poll(() =>
        canvas.evaluate(
          (element) => (element as HTMLCanvasElement).toDataURL().length,
        ),
      )
      .toBeGreaterThan(1_000);

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
