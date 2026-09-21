const { test: base, expect } = require("@playwright/test");

const creds = {
  adminEmail: process.env.BB_ADMIN_EMAIL || "",
  adminPassword: process.env.BB_ADMIN_PASSWORD || "",
  customerEmail: process.env.BB_CUSTOMER_EMAIL || "",
  customerPassword: process.env.BB_CUSTOMER_PASSWORD || ""
};

const hasAdmin = Boolean(creds.adminEmail && creds.adminPassword);
const hasCustomer = Boolean(creds.customerEmail && creds.customerPassword);

const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      try {
        sessionStorage.setItem("blingBerryEntered", "1");
      } catch (e) {}
    });
    await use(page);
  }
});

async function waitForAuthReady(page) {
  await page.waitForFunction(() => !!(window.bb && window.bb.getUser), null, {
    timeout: 15000
  });
}

async function openLoginModal(page) {
  await page.locator(".navbar .nav-auth").first().click();
  await expect(page.locator("#bb-login")).toHaveClass(/is-on/, { timeout: 8000 });
}

async function loginViaModal(page, email, password) {
  await openLoginModal(page);
  await page.locator("#bb-login-email").fill(email);
  await page.locator("#bb-login-password").fill(password);
  await page.locator("#bb-login-submit").click();
  await expect(page.locator(".navbar .nav-auth.is-welcome").first()).toBeVisible({
    timeout: 20000
  });
}

async function loginOnLoginPage(page, email, password) {
  await page.goto("/login.html");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator("#submit-btn").click();
  await page.waitForURL(/index\.html\/?$|\/$/, { timeout: 20000 });
  await expect(page.locator(".navbar .nav-auth.is-welcome").first()).toBeVisible({
    timeout: 20000
  });
}

async function expectGuestPrices(page) {
  await expect(page.locator("html")).not.toHaveClass(/bb-signed-in/);
  const amounts = page.locator(".price-amount");
  if ((await amounts.count()) > 0) {
    await expect(amounts.first()).toBeHidden();
  }
  const hints = page.locator(".price-hint");
  await expect(hints.first()).toBeVisible({ timeout: 10000 });
  await expect(hints.first()).toHaveText(/sign in to see the price/i);
}

async function expectSignedInPrices(page) {
  await expect(page.locator("html")).toHaveClass(/bb-signed-in/, { timeout: 15000 });
  const amounts = page.locator(".price-amount");
  await expect(amounts.first()).toBeVisible({ timeout: 10000 });
  await expect(page.locator(".price-hint").first()).toBeHidden();
}

function visibleRupee(page) {
  return page.locator(".price-amount, .price-num, .price-inline").filter({
    visible: true
  });
}

module.exports = {
  test,
  expect,
  creds,
  hasAdmin,
  hasCustomer,
  waitForAuthReady,
  openLoginModal,
  loginViaModal,
  loginOnLoginPage,
  expectGuestPrices,
  expectSignedInPrices,
  visibleRupee
};
