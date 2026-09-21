const {
  test,
  expect,
  creds,
  hasAdmin,
  hasCustomer,
  loginViaModal,
  loginOnLoginPage,
  waitForAuthReady,
  openLoginModal
} = require("./helpers");

const knownEmail = creds.adminEmail || creds.customerEmail;

test.describe("Auth — negative", () => {
  test("empty login form stays put (browser required fields)", async ({ page }) => {
    await page.goto("/login.html");
    await page.locator("#submit-btn").click();
    await expect(page).toHaveURL(/login\.html/);
    await expect(page.locator("#email")).toBeVisible();
  });

  test("wrong password shows an error in the overlay", async ({ page }) => {
    await page.goto("/index.html");
    await waitForAuthReady(page);
    await openLoginModal(page);
    await page.locator("#bb-login-email").fill("nobody@example.com");
    await page.locator("#bb-login-password").fill("definitely-wrong-password");
    await page.locator("#bb-login-submit").click();
    await expect(page.locator("#bb-login-error")).toHaveClass(/is-on/, { timeout: 15000 });
    await expect(page.locator("#bb-login-error")).not.toHaveText("");
    await expect(page.locator("#bb-login")).toHaveClass(/is-on/);
  });

  test("wrong password on login.html shows an error and stays on the page", async ({ page }) => {
    await page.goto("/login.html");
    await page.locator("#email").fill("nobody@example.com");
    await page.locator("#password").fill("definitely-wrong-password");
    await page.locator("#submit-btn").click();
    await expect(page.locator("#error-msg")).toHaveClass(/is-on/, { timeout: 15000 });
    await expect(page).toHaveURL(/login\.html/);
  });

  test("signup without a date of birth is rejected", async ({ page }) => {
    await page.goto("/signup.html");
    await page.locator("#name").fill("Regression Guest");
    await page.locator("#email").fill("regression.guest@example.com");
    await page.locator("#password").fill("long-enough-password");
    await page.locator("#submit-btn").click();
    await expect(page.locator("#error-msg")).toHaveClass(/is-on/);
    await expect(page.locator("#error-msg")).toContainText(/date of birth/i);
  });

  test("password shorter than 6 characters is blocked", async ({ page }) => {
    await page.goto("/signup.html");
    await page.locator("#password").fill("123");
    await page.locator("#submit-btn").click();
    await expect(page).toHaveURL(/signup\.html/);
  });

  test("signing up again with an existing email is refused", async ({ page }) => {
    test.skip(!knownEmail, "Set BB_ADMIN_EMAIL or BB_CUSTOMER_EMAIL");
    await page.goto("/signup.html");
    await page.locator("#name").fill("Duplicate Person");
    await page.locator("#email").fill(knownEmail);
    await page.locator(".dob-seg[data-part='day']").click();
    await page.locator(".dob-list [role='option']").first().click();
    await page.locator(".dob-seg[data-part='month']").click();
    await page.locator(".dob-list [role='option']").first().click();
    await page.locator(".dob-seg[data-part='year']").click();
    await page.locator(".dob-list [role='option']").nth(10).click();
    await page.locator("#password").fill("another-password-123");
    await page.locator("#submit-btn").click();
    await expect(page.locator("#error-msg")).toHaveClass(/is-on/, { timeout: 15000 });
    await expect(page.locator("#error-msg")).toContainText(/already exists|sign in/i);
    await expect(page.locator("#success-msg")).not.toHaveClass(/is-on/);
  });

  test("Google stays hidden until the provider is enabled", async ({ page }) => {
    await page.goto("/login.html");
    await expect(page.locator("#google-btn")).toBeHidden();
    await page.goto("/signup.html");
    await expect(page.locator("#google-btn")).toBeHidden();
  });
});

test.describe("Auth — positive", () => {
  test("admin can sign in from the overlay and see Welcome", async ({ page }) => {
    test.skip(!hasAdmin, "Set BB_ADMIN_EMAIL and BB_ADMIN_PASSWORD");
    await page.goto("/index.html");
    await waitForAuthReady(page);
    await loginViaModal(page, creds.adminEmail, creds.adminPassword);
    await expect(page.locator(".navbar .nav-auth-name").first()).not.toHaveText("");
  });

  test("login.html signs a valid user into the storefront", async ({ page }) => {
    test.skip(!hasAdmin, "Set BB_ADMIN_EMAIL and BB_ADMIN_PASSWORD");
    await loginOnLoginPage(page, creds.adminEmail, creds.adminPassword);
    await expect(page.locator("html")).toHaveClass(/bb-signed-in/);
  });

  test("signed-in user can sign out from the account menu", async ({ page }) => {
    test.skip(!hasAdmin, "Set BB_ADMIN_EMAIL and BB_ADMIN_PASSWORD");
    await page.goto("/index.html");
    await waitForAuthReady(page);
    await loginViaModal(page, creds.adminEmail, creds.adminPassword);
    await page.locator(".navbar .nav-auth.is-welcome").first().click();
    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page.locator(".navbar .nav-auth").first()).toHaveText(/login/i, {
      timeout: 15000
    });
  });

  test("customer can sign in when customer credentials are set", async ({ page }) => {
    test.skip(!hasCustomer, "Set BB_CUSTOMER_EMAIL and BB_CUSTOMER_PASSWORD");
    await page.goto("/index.html");
    await waitForAuthReady(page);
    await loginViaModal(page, creds.customerEmail, creds.customerPassword);
    await expect(page.locator(".navbar .nav-auth.is-welcome").first()).toBeVisible();
  });
});
