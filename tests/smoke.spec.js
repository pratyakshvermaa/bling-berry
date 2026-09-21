const { test, expect } = require("./helpers");

const pages = [
  { path: "/", title: /bling berry/i },
  { path: "/index.html", title: /bling berry/i },
  { path: "/Bangles.html", title: /bangle/i },
  { path: "/Watches.html", title: /watch/i },
  { path: "/About.html", title: /about|bling berry/i },
  { path: "/Reviews.html", title: /review|bling berry/i },
  { path: "/signup.html", title: /sign up|create|bling berry/i },
  { path: "/login.html", title: /login|sign in|bling berry/i }
];

test.describe("Smoke — pages load after deploy", () => {
  for (const item of pages) {
    test(`${item.path} returns 200 and brand chrome`, async ({ page }) => {
      const response = await page.goto(item.path);
      expect(response, `${item.path} should respond`).toBeTruthy();
      expect(response.status(), `${item.path} status`).toBeLessThan(400);
      await expect(page).toHaveTitle(item.title);
      await expect(page.locator("img").first()).toBeVisible();
    });
  }

  test("Jwellery.html still lands on the home page", async ({ page }) => {
    await page.goto("/Jwellery.html");
    await page.waitForURL(/index\.html|\/$/);
    await expect(page.locator(".navbar, .brand").first()).toBeVisible();
  });

  test("logo and favicon are reachable", async ({ request, baseURL }) => {
    const logo = await request.get(new URL("assets/bling-berry-logo.png", baseURL).href);
    expect(logo.status()).toBe(200);
    const icon = await request.get(new URL("assets/logo.png", baseURL).href);
    expect(icon.status()).toBe(200);
  });

  test("shared scripts load", async ({ request, baseURL }) => {
    for (const file of ["supabase-config.js", "storefront-products.js", "login-modal.js", "dob-picker.js"]) {
      const res = await request.get(new URL(file, baseURL).href);
      expect(res.status(), file).toBe(200);
    }
  });
});
