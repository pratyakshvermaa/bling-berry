# Bling Berry — Auth, Admin & Supabase Setup

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Note your **Project URL** and **anon (public) key** from **Settings → API**.
3. Open `supabase-config.js` in the project root and replace:
   ```js
   var SUPABASE_URL  = "YOUR_SUPABASE_URL";
   var SUPABASE_ANON = "YOUR_SUPABASE_ANON_KEY";
   ```
   with your actual values. These keys are safe to be in client-side code — Row Level Security (RLS) protects data at the database level.

## 2. Run the database schema

1. In the Supabase dashboard, go to **SQL Editor**.
2. Paste the entire contents of `setup.sql` and click **Run**.
3. This creates:
   - `profiles` table (extends `auth.users` with name, DOB, role, marketing opt-in)
   - `products` table (name, caption, description, price, category, stock, image)
   - RLS policies that enforce:
     - Public read on products (anyone can browse the shop)
     - Admin-only write on products (only `role = 'admin'` can add/edit/delete)
     - Users can read/update their own profile (but cannot change their role)
   - A `product-images` storage bucket with public read, admin-only write
   - An auto-trigger that creates a profile row when a new user signs up

## 3. Enable Google OAuth (optional)

To allow "Continue with Google" login:

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (or use an existing one).
3. Enable the **Google Identity** API.
4. Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
5. Set the application type to **Web application**.
6. Add these authorized redirect URIs:
   ```
   https://<your-supabase-ref>.supabase.co/auth/v1/callback
   ```
   Replace `<your-supabase-ref>` with your Supabase project reference (found in your project URL).
7. Copy the **Client ID** and **Client Secret**.
8. In Supabase, go to **Authentication → Providers → Google**.
9. Toggle it **on** and paste the Client ID and Client Secret.
10. Save.
11. In `supabase-config.js`, set `GOOGLE_AUTH_ENABLED` to `true` so the Google buttons show on the live site.

## 4. Promote the first admin

After creating your account on the site (via the signup page), promote yourself to admin by running this SQL in the Supabase SQL Editor:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';
```

Replace `your-email@example.com` with the email you signed up with.

There is **no UI to set your own role** — this is by design. Only manual database updates can grant admin access.

## 5. Using the admin dashboard

Once your account has the `admin` role:

1. Log in on the site.
2. Click the **Account** link in the nav — it will redirect you to `/admin/`.
3. From the admin dashboard you can:
   - **View** all products in a table
   - **Add** new products with name, caption, description, price, category, stock, sort order, and image
   - **Edit** any product inline
   - **Delete** any product (with confirmation)
4. All changes reflect immediately on the storefront (homepage shop cards, Bangles page, Watches page).

## 6. File overview

| File | Purpose |
|------|---------|
| `setup.sql` | Full database schema, RLS policies, storage bucket, triggers |
| `supabase-config.js` | Supabase client initialization + shared auth helpers |
| `login.html` | Login page (email/password + Google OAuth) |
| `signup.html` | Signup page with name, DOB, marketing opt-in |
| `complete-profile.html` | Post-Google-OAuth step to collect DOB + opt-in |
| `admin/index.html` | Admin dashboard page |
| `admin/admin.css` | Admin-specific styles |
| `admin/admin.js` | Admin CRUD logic, auth guard, image upload |

## 7. Security notes

- **RLS is the real guard.** Even if someone bypasses the JavaScript redirect on the admin page, Supabase will reject any write operation from a non-admin user at the database level.
- The Supabase **anon key** is public by design. It only grants access that RLS allows.
- Google OAuth client ID/secret are stored in the Supabase dashboard, never in your code.
- User sessions are managed by the Supabase JS client's built-in session handling.

## 8. Deployment

The live site is fully static (HTML/CSS/JS). Host it on HTTPS (Netlify, Vercel, Cloudflare Pages, GitHub Pages). Visitors then talk to Supabase directly — do **not** upload or run `serve.py` in production. `serve.py` is only a laptop/Wi-Fi demo helper (DNS + TLS proxy) because home and friend routers often cannot resolve `*.supabase.co`.

In **Supabase → Authentication → URL Configuration**:

- **Site URL:** `https://your-domain`
- **Additional Redirect URLs:** `https://your-domain/**` and `http://127.0.0.1:8000/**`

Do not add `http://192.168.x.x:8000` — GoTrue rejects private LAN addresses (`The string did not match the expected pattern`). Email + password still works on those Wi-Fis; Google OAuth needs the public HTTPS domain.

For laptop/Wi-Fi testing, turn **Authentication → Providers → Email → Confirm email** off so friends can sign in without a working confirmation link. On the live HTTPS site you can turn Confirm email back on.

Make sure `supabase-config.js` has the correct URL and anon key before deploying. Netlify uses the existing `_redirects` file for `/Jwellery.html`.
