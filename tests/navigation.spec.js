const { test, expect } = require("./helpers");

test.describe("Navigation", () => {
  test("desktop nav reaches every storefront page", async ({ page }) => {
    await page.goto("/index.html");
    await expect(page.locator(".navbar .nav-link", { hasText: "Home" }).first()).toBeVisible();

    await page.locator(".navbar a", { hasText: "About" }).first().click();
    await expect(page).toHaveURL(/About\.html/);

    await page.locator(".navbar a", { hasText: "Reviews" }).first().click();
    await expect(page).toHaveURL(/Reviews\.html/);

    await page.locator(".navbar a", { hasText: "Shop" }).first().hover();
    await page.locator(".drop a", { hasText: "Bangles" }).first().click();
    await expect(page).toHaveURL(/Bangles\.html/);

    await page.locator(".navbar a", { hasText: "Shop" }).first().hover();
    await page.locator(".drop a", { hasText: "Watches" }).first().click();
    await expect(page).toHaveURL(/Watches\.html/);

    await page.locator(".navbar a", { hasText: "Home" }).first().click();
    await expect(page).toHaveURL(/index\.html|\/$/);
  });

  test("home shop cards go to the right catalogues", async ({ page }) => {
    await page.goto("/index.html#shop");
    await expect(page.locator("#shop")).toBeVisible();
    await expect(page.locator("#shop-grid .product-card")).toHaveCount(3);

    await page.goto("/index.html#shop");
    await page.locator("#shop-grid .btn", { hasText: /view stacks/i }).click();
    await page.waitForURL(/Bangles\.html/, { timeout: 15000 });

    await page.goto("/index.html#shop");
    await page.locator("#shop-grid .btn", { hasText: /view watches/i }).click();
    await page.waitForURL(/Watches\.html/, { timeout: 15000 });
  });

  test("footer keeps shop, about, reviews, and order routes", async ({ page }) => {
    await page.goto("/index.html");
    const footer = page.locator("footer").first();
    await expect(footer.getByRole("link", { name: /bangles/i })).toHaveAttribute("href", /Bangles\.html/);
    await expect(footer.getByRole("link", { name: /watches/i })).toHaveAttribute("href", /Watches\.html/);
    await expect(footer.getByRole("link", { name: /about/i })).toHaveAttribute("href", /About\.html/);
    await expect(footer.getByRole("link", { name: /reviews/i })).toHaveAttribute("href", /Reviews\.html/);
  });

  test("mobile menu opens and lists shop destinations", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/Watches.html");
    await page.locator("#menu-btn").click();
    await expect(page.locator("#mobile-nav")).toHaveClass(/is-open/);
    await expect(page.locator("#mobile-nav a", { hasText: "Bangles" })).toBeVisible();
    await expect(page.locator("#mobile-nav a", { hasText: "Login" })).toBeVisible();
  });

  test("broken in-site links do not 404", async ({ page, request, baseURL }) => {
    await page.goto("/index.html");
    const hrefs = await page.$$eval("a[href]", (anchors) =>
      anchors
        .map((a) => a.getAttribute("href"))
        .filter((href) => href && !href.startsWith("http") && !href.startsWith("mailto:") && !href.startsWith("#"))
    );
    const unique = [...new Set(hrefs)];
    for (const href of unique) {
      const url = new URL(href, baseURL).href;
      const res = await request.get(url);
      expect(res.status(), href).toBeLessThan(400);
    }
  });
});
