# Post-deploy regression

Playwright suite for Bling Berry. Run it against local, Wi-Fi, or production after every release.

## Install once

```bash
npm install
npx playwright install chromium webkit
```

## Credentials

Copy `.env.example` to `.env` and fill:

| Variable | Used for |
| --- | --- |
| `BASE_URL` | Site under test |
| `BB_ADMIN_EMAIL` / `BB_ADMIN_PASSWORD` | Sign-in, prices, dashboard, users list |
| `BB_CUSTOMER_EMAIL` / `BB_CUSTOMER_PASSWORD` | Prove a shopper cannot open `/admin` |

Guest, navigation, and negative-login tests always run. Signed-in tests skip until those env vars are set.

Load env vars however you prefer. Example:

```bash
export BASE_URL="https://your-domain.example"
export BB_ADMIN_EMAIL="you@example.com"
export BB_ADMIN_PASSWORD="…"
npx playwright test
```

## Run after a production deploy

```bash
BASE_URL="https://your-domain.example" npx playwright test
```

HTML report: `playwright-report/index.html`

## What it covers

- Every public page returns 200 (`/`, bangles, watches, about, reviews, login, signup)
- `Jwellery.html` still redirects home
- Nav, shop cards, footer, mobile menu
- Guest price gate on home, watches, and bangles
- Login overlay from nav and from **Sign in to see the price**
- Bad password, missing DOB, short password, duplicate email
- Valid admin login, welcome name, sign out
- Admin products + users views; guest/customer blocked from `/admin`
- Inquire links: Instagram chat with no pre-text, WhatsApp draft includes category

It does **not** complete Google OAuth or create throwaway accounts on production.
