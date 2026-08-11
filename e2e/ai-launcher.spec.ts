import { expect, test, type Page } from "@playwright/test";

import {
  genericAiError,
  mockedAiAnswerBody,
  mockedAiResponse,
  publicLlmsHrefPattern,
} from "./site-fixtures";

const isKaspaAiEnabled = /^(1|true|yes|on)$/i.test(
  process.env.NEXT_PUBLIC_KASPA_AI_ENABLED ?? "",
);

async function sendLauncherQuestion(page: Page, question: string) {
  const launcherInput = page.getByPlaceholder("Ask anything...");
  const sendButton = page.getByRole("button", { name: /send message/i });

  await expect(launcherInput).toBeVisible();
  await expect(launcherInput.locator("xpath=ancestor::*[@inert]")).toHaveCount(
    0,
  );
  await launcherInput.fill(question);
  await expect(launcherInput).toHaveValue(question);
  await expect(sendButton).toBeEnabled();
  await sendButton.click();
}

test.describe("when Kaspa AI is disabled", () => {
  test.skip(isKaspaAiEnabled, "Kaspa AI is enabled for this run");

  test("hides launchers and blocks the ASK route", async ({
    page,
    request,
  }) => {
    for (const path of ["/", "/lore", "/hodl", "/build", "/not-found-test"]) {
      await page.goto(path);

      await expect(
        page.getByRole("button", { name: /^ask anything$/i }),
      ).toHaveCount(0);
    }

    await page.goto("/build");

    await expect(
      page.getByRole("button", { name: /^Ask Kaspa AI$/i }),
    ).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Open AI$/i })).toHaveCount(
      0,
    );
    await expect(
      page.getByText("How do I build and sign a transaction?"),
    ).toHaveCount(0);
    await expect(page.getByText(/Kaspa AI/)).toHaveCount(0);

    await page.goto("/hodl");

    await expect(page.getByRole("button", { name: /^Open AI$/i })).toHaveCount(
      0,
    );
    await expect(page.getByText("How do I back up my wallet?")).toHaveCount(0);
    await expect(page.getByText(/Kaspa AI/)).toHaveCount(0);

    const response = await request.post("/api/ask", {
      data: { question: "What is Kaspa?" },
    });

    expect(response.status()).toBe(503);
    expect(await response.json()).toEqual({
      error: "Kaspa AI is temporarily unavailable.",
    });
  });
});

test.describe("when Kaspa AI is enabled", () => {
  test.skip(!isKaspaAiEnabled, "Kaspa AI is disabled for this run");

  test("AI launcher stays collapsed until opened and returns a mock answer", async ({
    page,
  }) => {
    await page.route("**/api/ask", async (route) => {
      await page.waitForTimeout(300);
      await route.fulfill({
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: mockedAiResponse,
      });
    });

    await page.goto("/build");

    const openLauncherButton = page.getByRole("button", {
      name: /^ask anything$/i,
    });
    const launcherInput = page.getByPlaceholder("Ask anything...");

    await expect(launcherInput).toHaveCount(0);
    await expect(page.getByRole("link", { name: /^ChatGPT$/ })).toHaveCount(0);

    await openLauncherButton.click();

    await expect(
      page.getByRole("heading", { name: /ask anything about kaspa/i }),
    ).toBeVisible();
    await expect(launcherInput).toBeVisible();
    await expect(page.getByRole("link", { name: /^ChatGPT$/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /^ChatGPT$/ })).toHaveAttribute(
      "href",
      publicLlmsHrefPattern,
    );

    await sendLauncherQuestion(page, "What is Kaspa?");

    await expect(page.getByText(mockedAiAnswerBody)).toBeVisible();
    await expect(page.getByText("Sources (2)")).toBeVisible();
    await expect(page.getByRole("link", { name: "Kaspa docs" })).toBeHidden();

    await page.getByText("Sources (2)").click();

    await expect(page.getByRole("link", { name: "Kaspa docs" })).toBeVisible();
    await expect(page.getByRole("button", { name: /^copy$/i })).toBeVisible();
  });

  test("AI launcher shows a fallback when the ASK request fails", async ({
    page,
  }) => {
    await page.route("**/api/ask", async (route) => {
      await route.fulfill({
        status: 502,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
        body: "ASK request failed",
      });
    });

    await page.goto("/build");

    await page.getByRole("button", { name: /^ask anything$/i }).click();

    await sendLauncherQuestion(page, "What is Kaspa?");

    await expect(page.getByText(genericAiError)).toBeVisible();
  });
});
