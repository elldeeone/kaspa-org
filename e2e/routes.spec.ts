import { expect, test } from "@playwright/test";

import { loreHeading, routeHeadings } from "./site-fixtures";

for (const route of routeHeadings) {
  test(`renders ${route.path} with the expected heading`, async ({ page }) => {
    await page.goto(route.path);
    await expect(
      page.getByRole("heading", { level: 1, name: route.heading }),
    ).toBeVisible();
  });
}

test("home hero CTAs route to the expected destinations", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-chromium",
    "Desktop-only navigation smoke",
  );

  await page.goto("/");

  await page.getByRole("link", { name: /get started/i }).click();
  await expect(page).toHaveURL(/\/lore$/);
  await expect(
    page.getByRole("heading", { level: 1, name: loreHeading }),
  ).toBeVisible();

  await page.goto("/");
  await page.getByRole("link", { name: /get a wallet/i }).press("Enter");
  await expect(page).toHaveURL(/\/hodl#wallet$/);
  await expect(
    page.getByRole("heading", { level: 2, name: /get a wallet/i }),
  ).toBeVisible();

  await page.goto("/");
  await page.getByRole("link", { name: /buy kaspa/i }).press("Enter");
  await expect(page).toHaveURL(/\/hodl#buy$/);
  await expect(
    page.getByRole("heading", { level: 2, name: /buy kas/i }),
  ).toBeVisible();
});

test("DAGVIZ nav link opens in a new tab", async ({ page }) => {
  await page.goto("/");

  const dagvizLink = page.locator('a[href="https://kgi.kaspad.net/"]').first();

  await expect(dagvizLink).toHaveAttribute("href", "https://kgi.kaspad.net/");
  await expect(dagvizLink).toHaveAttribute("target", "_blank");
  await expect(dagvizLink).toHaveAttribute("rel", /noopener/);
  await expect(dagvizLink).toHaveAttribute("rel", /noreferrer/);
});

test("wallet finder links to the wallet submission guide", async ({ page }) => {
  await page.goto("/hodl#wallet");

  const submissionLink = page.getByRole("link", {
    name: /learn how to submit it on github/i,
  });

  await expect(submissionLink).toBeVisible();
  await expect(submissionLink).toHaveAttribute(
    "href",
    "https://github.com/kaspamedia/kaspa-org/blob/main/docs/wallet-submissions.md",
  );
  await expect(submissionLink).toHaveAttribute("target", "_blank");
  await expect(submissionLink).toHaveAttribute("rel", /noopener/);
  await expect(submissionLink).toHaveAttribute("rel", /noreferrer/);
});
