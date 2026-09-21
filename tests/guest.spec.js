const { test, expect, expectGuestPrices, openLoginModal, waitForAuthReady } = require("./helpers");

test.describe("Guest storefront", () => {
  test("home shows Login, not a welcome name", async ({ page }) => {
    await page.goto("/index.html");
    await waitForAuthReady(page);
    await expect(page.locator(".navbar .nav-auth").first()).toHaveText(/login/i);
    await expect(page.locator(".nav-auth.is-welcome")).toHaveCount(0);
  });

  test("home prices are gated and the hint opens login", async ({ page }) => {
    await page.goto("/index.html#shop");
    await waitForAuthReady(page);
    await expectGuestPrices(page);
    await expect(page.locator(".price-amount, .price-num").filter({ visible: true })).toHaveCount(0);

    await page.locator("#shop .price-hint").first().click();
    await expect(page.locator("#bb-login")).toHaveClass(/is-on/);
    await expect(page.locator("#bb-login-title")).toContainText(/welcome back/i);
  });

  test("vintage watches hide look prices while logged out", async ({ page }) => {
    await page.goto("/Watches.html");
    await waitForAuthReady(page);
    await expectGuestPrices(page);
    await expect(page.locator(".look-head .price-amount").first()).toBeHidden();
    await expect(page.locator(".look-head .price-hint").first()).toBeVisible();
    await expect(page.locator(".price-inline").first()).toBeHidden();
  });

  test("bangle stacks hide look prices while logged out", async ({ page }) => {
    await page.goto("/Bangles.html");
    await waitForAuthReady(page);
    await expectGuestPrices(page);
  });

  test("login in the nav opens the overlay, not a new page", async ({ page }) => {
    await page.goto("/About.html");
    await waitForAuthReady(page);
    await openLoginModal(page);
    await expect(page).toHaveURL(/About\.html/);
    await page.locator(".bb-login-close").click();
    await expect(page.locator("#bb-login")).not.toHaveClass(/is-on/);
  });

  test("guest cannot open the admin dashboard", async ({ page }) => {
    await page.goto("/admin/index.html");
    await page.waitForURL(/login\.html/, { timeout: 15000 });
    await expect(page.locator("#login-form")).toBeVisible();
  });
});
