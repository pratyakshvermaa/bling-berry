const { test, expect } = require("./helpers");

test.describe("Content and order paths", () => {
  test("about page still tells the brand story", async ({ page }) => {
    await page.goto("/About.html");
    await expect(page.locator("h1, h2").first()).toBeVisible();
    await expect(page.getByText("Honest prices").first()).toBeVisible();
  });

  test("reviews page renders", async ({ page }) => {
    await page.goto("/Reviews.html");
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("order / WhatsApp and Instagram destinations stay correct", async ({ page }) => {
    await page.goto("/index.html");
    const ig = page.locator("a[href*='instagram.com/blingberyyy'], a[href*='ig.me/m/blingberyyy']").first();
    await expect(ig).toBeVisible();
    const wa = page.locator("a[href*='wa.me/918668782212']").first();
    await expect(wa).toBeVisible();
  });

  test("complete-profile sends signed-out people to login", async ({ page }) => {
    await page.goto("/complete-profile.html");
    await page.waitForURL(/login\.html/, { timeout: 15000 });
  });
});
