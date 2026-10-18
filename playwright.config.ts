import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.CUSTOMER_ORDERS_BROWSER_BASE_URL ?? "http://127.0.0.1:3000";
const target = new URL(baseURL);
if (!["127.0.0.1", "localhost"].includes(target.hostname)) {
  throw new Error("Customer-order browser acceptance may only target a loopback application.");
}

export default defineConfig({
  testDir: "./tests/browser",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL,
    browserName: "chromium",
    channel: "chrome",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop-chrome", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chrome", use: { ...devices["Pixel 7"] } },
  ],
});
