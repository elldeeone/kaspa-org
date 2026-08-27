import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;
const useDevServer = process.env.PLAYWRIGHT_E2E_MODE === "dev";
const port = useDevServer ? 3000 : 3100;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: 1,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: isCI ? "on-first-retry" : "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "mobile-chromium",
      use: {
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        userAgent: devices["iPhone 13"].userAgent,
      },
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: `npm run ${useDevServer ? "dev" : "start"} -- --hostname 127.0.0.1 --port ${port}`,
        url: baseURL,
        reuseExistingServer: useDevServer && !isCI,
        stdout: "pipe",
        stderr: "pipe",
        timeout: 120_000,
      },
});
