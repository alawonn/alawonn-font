import { defineConfig, devices } from "@playwright/test";

const port = 5182;

export default defineConfig({
  testDir: "demo/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${port}/alawonn-font/`,
    trace: "retain-on-failure",
  },
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.01 },
  },
  snapshotPathTemplate: "demo/e2e/snapshots/{arg}-{projectName}{ext}",
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npx vite preview demo --port ${port} --strictPort`,
    url: `http://localhost:${port}/alawonn-font/`,
    reuseExistingServer: !process.env.CI,
  },
});
