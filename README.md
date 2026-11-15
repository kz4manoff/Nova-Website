# NOVA MUSIC — Official Website

Official product website for **NOVA MUSIC**, a minimalist Android music player inspired by Liquid Glass design.

Developed by **kz4man, Mohamed**  
© 2026 kz4man, Mohamed. All Rights Reserved.

---

## Tech Stack

- **Framework:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS v4
- **Motion:** Motion (`motion/react`) with `prefers-reduced-motion` support
- **Icons:** Lucide React
- **Hosting & Serverless Ready:** Cloudflare Pages + `/functions/api/*`

---

## Central Website Configuration

All editable website settings live in **`src/config/siteConfig.ts`**:

- **APK Release Details (`release`)**
  - `apkUrl`: Set to your hosted `.apk` file URL (or `null` to show **Coming Soon**).
  - `version`, `fileSize`, `releaseDate`, `minAndroidVersion`, `sha256`, `changelog`.
- **NOVA PRO Pricing & Checkout (`pro`)**
  - `priceAmount`: `49` (`49 DH` / `MAD`, `Lifetime Access`).
  - `paymentProvider.configured`: Keep `false` until your server-side payment gateway credentials are live; flipping it to `true` enables the checkout form wired to `/api/payments/create-checkout`.
- **Support Form (`support`)**
  - `formEndpoint`: Set to `/api/contact` (or Formspree/Resend endpoint) when connected; otherwise the form validates input honestly without faking delivery.
  - `supportEmail`: Optional public support email for direct `mailto:` fallback.
- **Screenshots (`screenshots`)**
  - Add verified Android app screenshots into `public/screenshots/` and register them in `siteConfig.screenshots.items`.

---

## NOVA PRO Payment Architecture (Morocco Ready)

Never place payment secret keys in frontend code.

Serverless endpoint blueprints are included in `/functions/api/`:
- `functions/api/payments/create-checkout.ts` — Creates a signed checkout session on the server using `PAYMENT_PROVIDER_SECRET` and `PAYMENT_MERCHANT_ID`.
- `functions/api/payments/verify.ts` — Confirms transaction completion with the payment gateway (e.g., CMI, Payzone, Stripe, or Lemon Squeezy) before granting NOVA PRO access.
- `functions/api/contact.ts` — Optional server-side support email relay.

---

## Local Development

```bash
npm install
npm run dev
```

Build and type-check for production:

```bash
npm run lint
npm run build
```

---

## Deployment

### Option 1: Cloudflare Pages (Recommended)

Cloudflare Pages natively serves the static Vite bundle (`dist/`), automatically falls back unknown routes to `index.html` for Single-Page Applications (when no `404.html` exists; `public/_redirects` contains no catch-all loop rules), and supports `/functions/api/*` serverless endpoints for payment verification.

1. Push this repository to GitHub or GitLab.
2. In the **Cloudflare Dashboard**, go to **Workers & Pages → Create → Pages → Connect to Git**.
3. Use these build settings:
   - **Framework preset:** `Vite`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Add server-side secrets (when activating payments or email) under **Settings → Environment variables**.
5. **Custom Domain:** Go to **Custom domains → Set up a custom domain**, enter your domain (e.g. `novamusic.app`), and let Cloudflare configure DNS + SSL automatically.

### Option 2: GitHub Pages (Static Only)

1. Set `base` in `vite.config.ts` if deploying to `https://<username>.github.io/<repo>/` (or leave `/` when using a custom domain).
2. Run `npm run build` and publish `dist/` using `peaceiris/actions-gh-pages` or GitHub Actions `actions/deploy-pages`.
3. Note: GitHub Pages hosts static assets only and does not run `/functions/api/*` serverless endpoints; point `siteConfig.pro.paymentProvider` endpoints to an external backend when using GitHub Pages.
