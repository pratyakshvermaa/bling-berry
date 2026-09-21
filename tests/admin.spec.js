const {
  test,
  expect,
  creds,
  hasAdmin,
  hasCustomer,
  loginViaModal,
  waitForAuthReady
} = require("./helpers");

test.describe("Admin dashboard", () => {
  test("guest hitting /admin is sent to login, not a missing admin/login page", async ({ page }) => {
    await page.goto("/admin/index.html");
    await page.waitForURL(/\/login\.html/, { timeout: 15000 });
    await expect(page).not.toHaveURL(/\/admin\/login/);
    await expect(page.locator("#login-form")).toBeVisible();
  });

  test("customer cannot stay on the dashboard", async ({ page }) => {
    test.skip(!hasCustomer, "Set BB_CUSTOMER_EMAIL and BB_CUSTOMER_PASSWORD");
    await page.goto("/index.html");
    await waitForAuthReady(page);
    await loginViaModal(page, creds.customerEmail, creds.customerPassword);
    await page.goto("/admin/index.html");
    await page.waitForURL(/index\.html|\/$/, { timeout: 15000 });
    await expect(page).not.toHaveURL(/\/admin\//);
  });

  test("admin can open products and users", async ({ page }) => {
    test.skip(!hasAdmin, "Set BB_ADMIN_EMAIL and BB_ADMIN_PASSWORD");
    await page.goto("/index.html");
    await waitForAuthReady(page);
    await loginViaModal(page, creds.adminEmail, creds.adminPassword);

    await page.locator(".navbar .nav-auth.is-welcome").first().click();
    await page.getByRole("link", { name: /dashboard/i }).click();
    await expect(page).toHaveURL(/\/admin\//);

    await expect(page.locator("#product-form")).toBeVisible();
    await expect(page.locator("#p-name")).toBeVisible();

    await page.locator("#tab-users").click();
    await expect(page.locator("#view-users")).toHaveClass(/is-on/);
    await expect(page.locator(".people-row").first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator(".people-name").first()).not.toHaveText("");
    await expect(page.locator(".access-pill").first()).toBeVisible();
    await expect(page.locator(".you-chip").first()).toBeVisible();
  });

  test("admin product form still has the Instagram reel field", async ({ page }) => {
    test.skip(!hasAdmin, "Set BB_ADMIN_EMAIL and BB_ADMIN_PASSWORD");
    await page.goto("/index.html");
    await waitForAuthReady(page);
    await loginViaModal(page, creds.adminEmail, creds.adminPassword);
    await page.goto("/admin/index.html");
    await expect(page.locator("#p-instagram")).toBeVisible();
    await expect(page.locator("#p-price")).toBeVisible();
    await expect(page.locator("#p-name")).toBeVisible();
  });
});
