import { expect, test, type Page } from "@playwright/test";

const enabled = process.env.RUN_CUSTOMER_ORDERS_BROWSER_ACCEPTANCE === "1";
const password = process.env.CUSTOMER_ORDERS_BROWSER_PASSWORD ?? "";
const accounts = {
  customer: { email: "customer-a@orders.test", callback: "/settings?tab=notifications" },
  admin: { email: "marketing-admin@orders.test", callback: "/admin/notifications" },
};

async function login(page: Page, account: keyof typeof accounts) {
  const target = accounts[account];
  await page.goto(`/login?callbackUrl=${encodeURIComponent(target.callback)}`);
  await page.getByLabel("Email Address").fill(target.email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect.poll(() => new URL(page.url()).pathname, { timeout: 15_000 }).toBe(new URL(target.callback, "http://local").pathname);
}

async function installMockPushBrowser(page: Page) {
  await page.addInitScript(() => {
    const json = { endpoint: "https://push.acceptance.invalid/browser-customer-a", expirationTime: null, keys: { p256dh: "browser_acceptance_p256dh_key", auth: "browser_acceptance_auth_key" } };
    const isSubscribed = () => localStorage.getItem("acceptance-push-subscribed") === "1";
    const subscription = { endpoint: json.endpoint, toJSON: () => json, unsubscribe: async () => { localStorage.removeItem("acceptance-push-subscribed"); return true; } };
    const registration = { pushManager: { getSubscription: async () => isSubscribed() ? subscription : null, subscribe: async () => { localStorage.setItem("acceptance-push-subscribed", "1"); return subscription; } } };
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { getRegistration: async () => registration, register: async () => registration } });
    class AcceptanceNotification {
      static permission: NotificationPermission = "default";
      static async requestPermission() { AcceptanceNotification.permission = "granted"; return "granted" as NotificationPermission; }
    }
    Object.defineProperty(window, "Notification", { configurable: true, value: AcceptanceNotification });
  });
}

test.describe("authenticated P3D marketing push acceptance", () => {
  test.skip(!enabled, "Requires disposable PostgreSQL, Firebase Auth Emulator, and local Next.js.");

  test("persists explicit promotional push consent without removing the essential subscription", async ({ page }) => {
    await installMockPushBrowser(page);
    await login(page, "customer");
    await expect(page.getByText("Notification preferences")).toBeVisible();
    const promotionalPush = page.getByRole("switch", { name: "Promotional push notifications" });
    await expect(promotionalPush).not.toBeChecked();
    await expect(page.getByText("Permission: Not requested")).toBeVisible();
    await promotionalPush.click();
    await expect(promotionalPush).toBeChecked();
    await page.reload();
    await expect(promotionalPush).toBeChecked();
    await promotionalPush.click();
    await expect(promotionalPush).not.toBeChecked();
    await expect(page.getByText("Device notifications")).toBeVisible();
    await expect(page.getByText("Enabled", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  });

  test("shows blocked browser permission accurately without opting the customer in", async ({ page }) => {
    await page.addInitScript(() => {
      class BlockedNotification { static permission: NotificationPermission = "denied"; static async requestPermission() { return "denied" as NotificationPermission; } }
      Object.defineProperty(window, "Notification", { configurable: true, value: BlockedNotification });
    });
    await login(page, "customer");
    await expect(page.getByText("Browser notifications are blocked.")).toBeVisible();
    await expect(page.getByRole("switch", { name: "Promotional push notifications" })).not.toBeChecked();
  });

  test("loads the authenticated admin composer with push off and displays persisted delivery status", async ({ page }) => {
    await login(page, "admin");
    await page.getByRole("tab", { name: "Marketing" }).click();
    await expect(page.getByText("Fresh finds on Mwezora").first()).toBeVisible();
    await expect(page.getByText(/evaluated .* eligible .* queued .* accepted/).first()).toBeVisible();
    await page.getByRole("button", { name: "Create campaign" }).click();
    await expect(page.getByRole("heading", { name: "Create marketing campaign" })).toBeVisible();
    const composer = page.getByRole("dialog");
    await composer.locator("input").nth(0).fill("Browser acceptance campaign");
    await composer.locator("input").nth(1).fill("Acceptance title");
    await composer.locator("textarea").fill("Acceptance campaign message");
    await composer.getByRole("button", { name: "Continue" }).click();
    const push = page.getByRole("switch", { name: "Browser push notification" });
    await expect(push).not.toBeChecked();
    await push.click();
    await expect(push).toBeChecked();
  });

  test("preserves responsive layout and accent-aware light and dark themes", async ({ page }, testInfo) => {
    await installMockPushBrowser(page);
    await login(page, "customer");
    await page.goto("/settings?tab=appearance");
    const theme = testInfo.project.name.includes("mobile") ? "Dark" : "Light";
    const accent = testInfo.project.name.includes("mobile") ? "Rose" : "Emerald";
    await page.getByRole("button", { name: theme.toLowerCase(), exact: true }).click();
    await page.getByRole("radio", { name: new RegExp(accent) }).click();
    await page.goto("/settings?tab=notifications");
    await expect(page.locator("html")).toHaveClass(theme === "Dark" ? /dark/ : /^(?!.*dark)/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  });
});
