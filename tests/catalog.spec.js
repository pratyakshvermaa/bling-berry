const {
  test,
  expect,
  creds,
  hasAdmin,
  loginViaModal,
  waitForAuthReady,
  expectGuestPrices,
  expectSignedInPrices
} = require("./helpers");

test.describe("Catalog", () => {
  test("watches lookbook has looks, chips, and inquire links", async ({ page }) => {
    await page.goto("/Watches.html");
    await expect(page.locator("h1")).toContainText(/vintage watches/i);
    await expect(page.locator(".look").first()).toBeVisible();
    await expect(page.locator(".look-head h2").first()).toBeVisible();
    await expect(page.locator(".chip").first()).toBeVisible();

    const ig = page.locator(".inquire").first();
    const wa = page.locator(".inquire-wa").first();
    await expect(ig).toHaveAttribute("href", /ig\.me\/m\/blingberyyy/);
    await expect(ig).not.toHaveAttribute("href", /text=/);
    await expect(wa).toHaveAttribute("href", /wa\.me\/918668782212/);
    await expect(wa).toHaveAttribute("href", /Watches/);
  });

  test("bangles lookbook matches the watches layout language", async ({ page }) => {
    await page.goto("/Bangles.html");
    await expect(page.locator("h1")).toContainText(/bangle/i);
    await expect(page.locator(".look").first()).toBeVisible();
    await expect(page.locator(".look-grid img").first()).toBeVisible();
    const wa = page.locator(".inquire-wa").first();
    await expect(wa).toHaveAttribute("href", /Bangles/);
  });

  test("watch filters do not crash the page", async ({ page }) => {
    await page.goto("/Watches.html");
    const filters = page.locator(".filter");
    const count = await filters.count();
    expect(count).toBeGreaterThan(3);
    await filters.nth(1).click();
    await expect(page.locator(".look").first()).toBeVisible();
    await page.locator(".filter", { hasText: /^All$/i }).click();
  });

  test("look photos actually load", async ({ page }) => {
    await page.goto("/Watches.html");
    const img = page.locator(".look img").first();
    await expect(img).toBeVisible();
    const ok = await img.evaluate((el) => el.complete && el.naturalWidth > 0);
    expect(ok).toBeTruthy();
  });

  test("signed-in shopper sees rupee amounts on watches", async ({ page }) => {
    test.skip(!hasAdmin, "Set BB_ADMIN_EMAIL and BB_ADMIN_PASSWORD");
    await page.goto("/index.html");
    await waitForAuthReady(page);
    await loginViaModal(page, creds.adminEmail, creds.adminPassword);
    await page.goto("/Watches.html");
    await expectSignedInPrices(page);
    await expect(page.locator(".look-head .price-amount").first()).toContainText("₹");
  });

  test("home shop prices appear only after sign-in", async ({ page }) => {
    test.skip(!hasAdmin, "Set BB_ADMIN_EMAIL and BB_ADMIN_PASSWORD");
    await page.goto("/index.html#shop");
    await waitForAuthReady(page);
    await expectGuestPrices(page);
    await loginViaModal(page, creds.adminEmail, creds.adminPassword);
    await expectSignedInPrices(page);
  });
});
