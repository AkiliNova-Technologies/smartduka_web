import { expect, test, type Page } from "@playwright/test";
import { join } from "node:path";

const enabled = process.env.RUN_CUSTOMER_ORDERS_BROWSER_ACCEPTANCE === "1";
const customerA = { email: "customer-a@orders.test", password: process.env.CUSTOMER_ORDERS_BROWSER_PASSWORD ?? "" };
const customerB = { email: "customer-b@orders.test", password: process.env.CUSTOMER_ORDERS_BROWSER_PASSWORD ?? "" };

async function login(page: Page, customer = customerA) {
  await page.goto("/login?callbackUrl=/orders");
  await page.getByLabel("Email Address").fill(customer.email);
  await page.locator("#password").fill(customer.password);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect.poll(() => new URL(page.url()).pathname, { timeout: 15_000 }).toBe("/orders");
}

async function logout(page: Page) {
  await page.getByRole("button", { name: "Open account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/");
}

test.describe("isolated customer orders", () => {
  test.skip(!enabled, "Requires the guarded isolated app and Firebase Auth Emulator runner.");

  test.beforeEach(() => {
    if (!customerA.password) throw new Error("The isolated browser password is required.");
  });

  test("navigates paginated history and preserves filter URLs", async ({ page }) => {
    await login(page);
    await expect(page.getByRole("heading", { name: "My orders" })).toBeVisible();
    await expect(page.getByText("Payment:").first()).toBeVisible();
    await expect(page.getByText("Fulfillment:").first()).toBeVisible();
    await page.getByRole("link", { name: "Next" }).click();
    await expect(page).toHaveURL(/\/orders\?page=2$/);
    await page.reload();
    await expect(page.getByText("Page 2 of 3")).toBeVisible();
    await page.getByRole("link", { name: "In progress" }).click();
    await expect(page).toHaveURL(/\/orders\?filter=in-progress$/);
    await expect(page.locator("body")).not.toHaveCSS("overflow-x", "scroll");
  });

  test("cold-loads and refreshes the persisted mixed order", async ({ page }) => {
    await login(page);
    const mixedOrder = page.getByRole("article").filter({ hasText: "Order #ACC-ORDER-001" });
    const detailPath = await mixedOrder.getByRole("link", { name: /View order/ }).getAttribute("href");
    expect(detailPath).toBeTruthy();
    await page.goto(detailPath!);
    await expect(page.getByRole("heading", { name: /Order #/ })).toBeVisible();
    await expect(page.getByText("Standard Basket")).toBeVisible();
    await expect(page.getByText("Variant Jacket")).toBeVisible();
    await expect(page.getByText("Crimson / Large")).toBeVisible();
    await expect(page.getByText("Delivery", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Pickup", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("USh 358,500")).toBeVisible();
    await page.reload();
    await expect(page.getByText("Partially paid")).toBeVisible();
  });

  test("renders orders in light and dark themes without horizontal overflow", async ({ page }) => {
    await login(page);
    await page.goto("/settings?tab=appearance");
    for (const [theme, accent] of [["Light", "Emerald"], ["Dark", "Rose"]] as const) {
      await page.getByRole("button", { name: theme.toLowerCase(), exact: true }).click();
      await page.getByRole("radio", { name: new RegExp(accent) }).click();
      await page.goto("/orders");
      await expect(page.locator("html")).toHaveClass(theme === "Dark" ? /dark/ : /^(?!.*dark)/);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      expect(overflow).toBe(false);
      await page.screenshot({
        path: join(process.cwd(), "artifacts", "customer-orders-acceptance", `${test.info().project.name}-${theme.toLowerCase()}-${accent.toLowerCase()}.png`),
        fullPage: true,
      });
      await page.goto("/settings?tab=appearance");
    }
  });

  test("rejects Customer B after switching away from Customer A", async ({ page }) => {
    await login(page);
    const mixedOrder = page.getByRole("article").filter({ hasText: "Order #ACC-ORDER-001" });
    const detailPath = await mixedOrder.getByRole("link", { name: /View order/ }).getAttribute("href");
    await logout(page);
    await login(page, customerB);
    await page.goto(detailPath!);
    await expect(page.getByRole("heading", { name: "Order not found" })).toBeVisible();
  });

  test("persists profile and delivery settings and signs out", async ({ page }, testInfo) => {
    await login(page);
    await page.goto("/settings");
    const name = page.getByLabel("Full name");
    const expectedName = `Acceptance Customer A ${testInfo.project.name}`;
    const expectedDistrict = `Nakawa ${testInfo.project.name}`;
    await expect(name).toHaveValue(/Acceptance Customer A/);
    await expect(page.getByRole("button", { name: "Save changes" })).toBeDisabled();
    await name.fill(expectedName);
    await page.getByRole("button", { name: "Save changes" }).click();
    const district = page.getByLabel("Delivery district");
    await district.fill(expectedDistrict);
    await page.getByRole("button", { name: "Save delivery location" }).click();
    await page.reload();
    await expect(name).toHaveValue(expectedName);
    await expect(district).toHaveValue(expectedDistrict);
    await page.getByRole("tab", { name: "Notifications" }).click();
    await expect(page.getByText("Notification preferences")).toBeVisible();
    await logout(page);
  });
});
