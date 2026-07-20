import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  // Run tests in parallel within each file; files themselves run sequentially
  // on CI (one worker) to avoid port conflicts with the preview server.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  use: {
    baseURL: "http://localhost:4173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // All tests run against the production build served by `vite preview`,
    // which is closer to the real deployment than the dev server.
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
  ],
  // Build the app and serve it before running tests.
  // The build step also runs the Vite PWA plugin, ensuring the service worker
  // is present (though tests disable it via route interception).
  webServer: {
    // In CI the dist/ is already built by the preceding "Build" step in the
    // workflow, so we just serve it. Locally we build+serve in one command.
    command: process.env.CI
      ? "npm run preview"
      : "npm run build && npm run preview",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
