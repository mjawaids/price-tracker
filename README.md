# SpendLess - Smart Shopping List and Price Comparison App

A modern, mobile-first shopping app built with React, TypeScript, and Supabase. Jot down what you need in seconds — even offline — and, when you want to save more, tap **Where to buy** to see which stores make your list cheapest, delivery included.

> Formerly referred to as "PriceTracker" — the product is now branded **SpendLess**.

## ✨ Features

The app has two sections: **Lists** (the default) and **Compare**.

### 📝 Quick Lists (default)
- Add items the way you'd say them: `bread`, `2 milk`, `atta 10 kg` — no brand or size needed
- Suggestions while typing (your own history first) and one-tap "often bought" chips
- Items sorted by aisle automatically (English and romanized Urdu names) — or turn off
  **Group by aisle** in list options (⋯) to keep them in the order you added them (each item still shows its aisle)
- Tick items as you shop, swipe to tick/delete, undo anything, see your progress
- Several lists (Groceries, Pharmacy, …) with optional quantity, unit and notes
- Friendly one-at-a-time tips that teach the app as you use it

### 📴 Works Offline
- Lists are stored on the device first (IndexedDB) and sync to Supabase when online
- Changes made offline are queued and sent automatically; the app opens offline too
- Installable PWA; the app shell and fonts are cached by a service worker
- New releases arrive by themselves: an open app shows **"A new version is ready · Update"**,
  and the next launch always runs the latest build

### 🛍️ Where to buy (Compare)
- On any list, **Where to buy** finds the stores that make the whole list cheapest —
  delivery fees, free-delivery thresholds and minimum orders included
- Four choices: **Cheapest**, **One stop**, **Delivered** (online stores only) and
  **Fewer stops**, with what you save compared with the best single store
- Write "bread" and we pick a sensible product (and say which); tap an item to choose
  the brand and size — just this time, or as your usual
- **Use this plan** splits the same list into one section per store; *Shop here*
  shows just that store's part
- Works offline from the prices saved on the device
- **While you shop**: tick an item and SpendLess asks "Was it Rs 210?" — tap Yes, or
  Different to add what you paid; when a store's part is done, the rest come up in one
  go. Answers given offline are sent later. Off in Profile → Shopping features

### 🏷️ Prices, stores and contributing
- Shared prices for your city where they're live (Karachi first); anywhere else,
  Compare works with the stores and prices you add yourself
- Karachi's shared prices are refreshed daily from five online stores (Diamond,
  Imtiaz, Chase Up, Spar, Bin Hashim; Hydri is paused), read politely by SpendLessBot
  (see `/bot` and [docs/data-sources.md](docs/data-sources.md))
- Karachi also has 26 shared in-store branches (Imtiaz, Spar, Diamond Super Market) from
  the chains' own store lists; their prices come from shoppers. Where to buy compares
  the online stores and your own, plus the branches you add to My stores
- **Share a shop**: suggest a shop you added (a local kiryana, a pharmacy, a chain's
  branch) as a shared one. When enough people who shop there suggest it, it becomes a
  shared shop overnight and your own copy moves into it, prices included (never with
  your name)
- **Prices** (search, browse by aisle, your usuals), **Stores** (choose the ones you shop
  at, branches grouped by chain, add your own) and **Contribute** (add a price, add a
  product, add a receipt)
- **Add a receipt**: a whole shop's prices in one go from order screenshots, a PDF
  invoice, a photo of a till receipt or pasted text. It's read on the device (a one-time
  ≈6 MB text reader for pictures and scanned PDFs, ≈2 MB for a PDF's own text; both
  self-hosted and kept for offline use) — the receipt is never uploaded, only the prices
  you confirm are saved. Medicines are saved as your own private products
- **Share to SpendLess** (the installed app on Android): share a screenshot, a PDF or an
  order's text from another app; SpendLess asks "Read this receipt?"
- Prices at shared stores are shared without your name; a price far from the usual one
  is kept for you only until someone else sees the same; your own stores and products
  stay private unless you share a shop
- Every price shows how old it is (Today, 2 wks, Old · Aug)
- **Your contributions** (Compare → Contribute): the prices you've added, where each
  stands (shared, only you for now, private), and Remove for a mistake
- **Wrong price?** on a product page: add the right price, say it isn't sold any more,
  or just say it's wrong — once two people say so, Where to buy leaves it out until a
  newer price comes in. Prices from people whose prices often disagree with others'
  quietly count for less
- Use as much as you like: Profile → **Shopping features** turns Where to buy and receipt
  import off, and lists look exactly as before
- In-app help (Profile → Help), a short walkthrough the first time you open Where to buy,
  and one-at-a-time tips

### 🎨 Beautiful Design
- Warm "paper" light theme with a magenta accent and custom design tokens
- Mobile-first, fully responsive layout with an adaptive app shell
- Custom typography (Bricolage Grotesque, Hanken Grotesk, Space Mono)
- Smooth animations and micro-interactions

### 📲 Installable PWA
- Web app manifest with maskable icons for Android/Chrome
- Apple touch icon and full favicon set for all devices
- Installable to the home screen with a branded splash screen
- **Install the app** button on the sign-in screen and in Profile (so it can be
  reinstalled after removal), a "Get the app" card in the desktop sidebar, a small
  "Get app" pill in the mobile Lists header, plus a dismissible banner. Chrome/Edge/Android open the
  browser's install dialog in one tap; iPhone/iPad, Mac Safari and other browsers get
  step-by-step instructions

### 🔐 Secure & Private
- User authentication with Supabase Auth
- Row-level security (RLS) for all user data
- Privacy-first approach

### 🌍 Multi-Currency Support
- Support for 50+ global currencies
- Automatic currency detection based on locale
- Consistent price formatting across the app

### 📈 Analytics
- Optional Google Analytics integration (configurable via environment variables)

## 🚀 Live Demo

Visit the live application: [https://spendless.ibexoft.com](https://spendless.ibexoft.com)

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript
- **Routing**: React Router (marketing & legal pages)
- **Styling**: Tailwind CSS with custom design tokens (OKLCH color system)
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Icons**: Lucide React
- **Build Tool**: Vite
- **Analytics**: Google Analytics (gtag, optional)
- **Deployment**: GitHub Actions → Netlify (app) + Supabase (database migrations)

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (version 18 or higher)
- npm or yarn package manager
- Git

## 🔧 Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/mjawaids/price-tracker.git
cd price-tracker
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env` file in the root directory (see `.env.example`) and add your credentials:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Analytics Configuration (optional)
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_GA_ENABLE_IN_DEV=false
```

You can find the Supabase values in your project dashboard under **Settings > API**.

### 4. Database Setup

SpendLess keeps **all of its tables in its own Postgres schema, `spendless`**, so it
can share a Supabase project with other apps without mixing data. Tables:

- **spendless.lists / spendless.list_items**: quick lists and their items (offline-synced)
- **spendless.regions**: cities; shared prices are live in Karachi first
- **spendless.catalog_stores / spendless.catalog_products**: the Compare catalogue —
  public (shared) rows plus each user's private ones
- **spendless.price_reports / spendless.current_prices**: append-only price
  observations and the price derived from them (weighted median; held prices count once
  someone else agrees; `disputed` when two people say it's wrong)
- **spendless.reporter_trust**: how much each person's prices count (nightly job only)
- **spendless.my_contributions()**: a user's own price counts for Your contributions
- **spendless.user_stores / item_preferences / plans**: a user's stores, usual
  products and applied plans
- **spendless.products / spendless.stores / spendless.shopping_lists**: the original
  per-user catalogue and Compare cart (legacy). Their rows were copied into the
  catalogue as private rows; the old cart is turned into a list once ("From Compare
  cart"). A later post-deploy migration drops them.

How prices are decided and protected from spam: [docs/compare-data.md](docs/compare-data.md).

User profile data (name, avatar) is stored in Supabase Auth `user_metadata`,
so no separate profiles table is required by the app.

Setup:

1. Apply the migrations with the project's runner (it tracks them in
   `spendless.schema_migrations`):
   ```bash
   SUPABASE_DB_URL="postgresql://…" scripts/db-migrate.sh --from-scratch supabase/migrations
   SUPABASE_DB_URL="postgresql://…" scripts/db-migrate.sh supabase/post-deploy
   ```
   They create the `spendless` schema, grants and RLS policies for every table.
   (Don't use `supabase db push`: the project is shared with other apps — see
   [docs/deployment.md](docs/deployment.md).)
2. In the Supabase dashboard, open **Project Settings → Integrations → Data API**
   and add `spendless` to **Exposed schemas** (production does this automatically).
   The app's client is pinned to this schema (`src/lib/supabaseClient.ts`), so the
   API must expose it.

> **Upgrading an existing install** (tables previously in `public`):
> `20261003000000_spendless_schema.sql` moves `products`, `stores` and
> `shopping_lists` into `spendless` with their data and policies, and leaves
> temporary views in `public` so the old build keeps working. The deploy pipeline
> handles the order: migrations → expose `spendless` → deploy the new build →
> `supabase/post-deploy/20261003000200_drop_public_compat_views.sql`.

### 5. Google Sign-In & Auth Security

Users can register and sign in with **email/password** or **Google**. A Google
login automatically links to an existing account with the same address via
Supabase's built-in identity linking (only when the email is verified), so users
don't end up with duplicate accounts.

The frontend uses only the **public anon key** — all data access is gated by
Row-Level Security, so the anon key cannot read or modify anyone's data on its
own. Never put the `service_role` key in the frontend.

#### One-time configuration

Google OAuth requires provider setup in the Google Cloud and Supabase dashboards
(these are not stored in this repo):

1. **Google Cloud Console** → APIs & Services → Credentials → create an OAuth
   client ID (type: *Web application*). Configure the consent screen, then set
   the **Authorized redirect URI** to your Supabase callback:
   `https://<PROJECT_REF>.supabase.co/auth/v1/callback`. Copy the **Client ID**
   and **Client Secret**.
2. **Supabase** → Authentication → Providers → **Google**: enable it and paste
   the Client ID + Secret.
3. **Supabase** → Authentication → URL Configuration:
   - **Site URL**: your production URL (e.g. `https://spendless.ibexoft.com`)
   - **Redirect URLs**: add only your own domains (e.g.
     `https://spendless.ibexoft.com/**` and `http://localhost:5173/**`).

#### Security checklist (verify before going live)

- [ ] **Google redirect URI** is restricted to the Supabase callback only — this
      stops anyone from reusing your Google credentials in a different app.
- [ ] **Supabase Redirect URLs** list contains only your domains (no broad
      wildcards) — prevents OAuth open-redirect / session-token theft.
- [ ] **Confirm email** is ON (Authentication → Providers → Email) — required for
      safe automatic account linking; blocks account pre-hijacking.
- [ ] **RLS** is enabled on every table (it is, by default in the migrations).
- [ ] **`spendless`** is listed under Project Settings → Integrations → Data API →
      Exposed schemas.
- [ ] **CAPTCHA + rate limits** enabled (Authentication → Attack Protection) to
      deter abuse of the public anon key.
- [ ] The `service_role` key is **never** referenced in frontend code or `.env`
      files prefixed with `VITE_`.

### 6. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### 7. Build for Production

```bash
npm run build
```

This creates an optimized production build in the `dist` directory.

### 8. Regenerate App Icons (optional)

Favicons and PWA icons are generated from the SVG sources in `public/`
(`favicon.svg` and `icon-maskable.svg`). After editing a source SVG, run:

```bash
npm run generate:icons
```

This produces the `.ico`, PNG favicons, apple-touch-icon, and maskable PWA
icons used by `index.html` and `public/site.webmanifest`.

## 🚀 Deployment

Production deploys are fully automated with **GitHub Actions**
(`.github/workflows/ci-cd.yml`). Every push to `main`:

1. runs the checks (lint, colour contrast, migration guard, build),
2. applies new database migrations to Supabase (`supabase/migrations/`),
3. makes sure the `spendless` schema is exposed in the Data API,
4. builds and deploys `dist/` to Netlify (spendless.ibexoft.com),
5. smoke-tests the live site,
6. runs post-deploy migrations (`supabase/post-deploy/`),
7. tags the release and publishes GitHub Release notes.

Pull requests run the checks only. Releases use **CalVer `YYYY.M.N`** (e.g.
`2026.10.0`), shown in the app under Profile.

A second workflow, `.github/workflows/price-import.yml`, imports store prices once a
day (and can be run by hand as a dry run); `shared-branches.yml` makes suggested shops
shared each night; `reporter-trust.yml` works out how much each person's prices count
each night; and `catalog-jobs.yml` runs manual catalogue jobs (add a city's
in-store branches, promote a store to public, close a shared shop).

One-time setup (tokens, GitHub `production` environment, leaving Bolt), rollback and
how to add new services: **[docs/deployment.md](docs/deployment.md)**.

## 📁 Project Structure

```
.github/workflows/ci-cd.yml # CI checks + production deploy pipeline
.github/workflows/price-import.yml # Daily store price import (docs/data-sources.md)
.github/workflows/shared-branches.yml # Nightly: suggested shops become shared (docs/compare-data.md)
.github/workflows/reporter-trust.yml # Nightly: how much each person's prices count (docs/compare-data.md)
.github/workflows/catalog-jobs.yml # Manual catalogue jobs (add in-store branches, promote a store to public, close a shared shop)
public/                     # Static assets (favicons, PWA icons, manifest + share target, _redirects, _headers, share-target-sw.js)
scripts/
├── generate-icons.mjs      # Generates favicon/PWA icons from SVG sources
├── check-contrast.mjs      # WCAG contrast check for the colour tokens
├── check-migrations.mjs    # Guard: migrations may only touch the spendless schema (+ spendless-* storage policies)
├── db-migrate.sh           # Applies migrations (tracked in spendless.schema_migrations)
├── supabase-expose-schema.sh # Adds spendless to the Data API's exposed schemas
├── seed/promote-store.ts   # Makes a private store + its products public (manual "Catalog jobs" workflow)
├── seed/add-branches.ts    # Adds/updates a city's public in-store branches from seed/branches/<city>.json ("Catalog jobs")
├── seed/promote-suggestions.ts # Nightly: suggested shops become shared, people's shops move in ("Shared shops")
├── seed/close-branch.ts    # Undo a shared shop: close it, give people their own shop back ("Catalog jobs")
├── seed/reporter-trust.ts  # Nightly: each person's price weight from how often they agree with others ("Reporter trust")
└── import/                 # Daily store price import: run.ts, sources.ts, adapters/, polite http + robots.txt, write.sql
supabase/migrations/        # Pre-deploy (additive) migrations — schema: spendless
supabase/post-deploy/       # Post-deploy (cleanup) migrations
src/
├── App.tsx                 # App root (auth gate + shell)
├── main.tsx                # Entry point + React Router routes
├── index.css               # Global styles, design tokens & Tailwind
├── components/
│   ├── shell/Shell.tsx     # Adaptive app shell (sidebar/nav + screens)
│   ├── shell/HelpSheet.tsx # In-app help topics (src/lib/help.ts)
│   ├── screens/            # Feature screens
│   │   ├── ListsScreen.tsx     # Quick lists (default section)
│   │   ├── listParts.tsx       # List rows, add bar, suggestions, banners
│   │   ├── listSheets.tsx      # Item details + list switcher sheets
│   │   ├── listHelpers.ts      # Aisle and store grouping/colours + haptic tap
│   │   ├── listCompare.tsx     # Where to buy chip, plan banner, store section headers
│   │   ├── AuthScreen.tsx      # Sign in / sign up
│   │   ├── PlanScreen.tsx      # Where to buy for a list
│   │   ├── PricesScreen.tsx    # Compare home (prices)
│   │   ├── SearchScreen.tsx    # Product search
│   │   ├── DetailScreen.tsx    # Product page (prices per store, add to list)
│   │   ├── StoresScreen.tsx    # Your city and stores
│   │   ├── ContributeScreen.tsx # Add a price / a product / a receipt
│   │   ├── ReceiptScreen.tsx   # Add a receipt (+ receiptParts, receiptSheets, receiptHelpers)
│   │   ├── ManageScreens.tsx   # Your own products
│   │   ├── compareSheets.tsx   # Item choice, city, My stores, store form, add a price
│   │   ├── storePicker.tsx     # Shared store picker: Online / In a shop, search, branches by chain
│   │   ├── suggestSheet.tsx    # Share this shop (suggest it as a shared one), its row, "Your shop is now shared"
│   │   ├── productSheet.tsx    # Add/edit your product
│   │   └── ProfileScreen.tsx   # Profile, shopping features, help
│   ├── onboarding/         # Where to buy walkthrough + "What's new" sheet
│   ├── ui/                 # Reusable UI primitives (Icon, Sheet, Toast, CoachMark, Toggle, …)
│   ├── PageHeader.tsx      # Header for marketing/legal pages
│   └── PageFooter.tsx      # Footer with developer credits
├── pages/                  # Standalone routed pages
│   ├── Pricing.tsx
│   ├── Privacy.tsx
│   ├── Refund.tsx
│   ├── Terms.tsx
│   ├── Bot.tsx             # /bot: what SpendLessBot is and how to opt out
│   └── lazy.ts             # Lazy (code-split) exports of the pages above
├── contexts/               # React contexts
│   ├── AuthContext.tsx         # Authentication state (+ offline identity)
│   ├── ListsContext.tsx        # Lists state, quick add, offline sync
│   ├── CompareContext.tsx      # Compare catalogue, prices, plans (cached offline)
│   ├── AppContext.tsx          # Navigation, sections & app sheets
│   ├── OnboardingContext.tsx   # Walkthrough + contextual tips
│   ├── ThemeContext.tsx        # Theme management
│   ├── SettingsContext.tsx     # User settings (currency, city, shopping features, list grouping)
│   └── AnalyticsContext.tsx    # Analytics wiring
├── hooks/                  # Custom React hooks
│   ├── useBreakpoint.ts        # Responsive breakpoints
│   ├── useHint.ts              # One-at-a-time contextual tips
│   └── useFmt.ts               # Formatting helpers
├── lib/                    # Library configuration & data
│   ├── supabase.ts             # Supabase client re-export
│   ├── supabaseClient.ts       # Supabase client (pinned to the `spendless` schema)
│   ├── offline/                # IndexedDB store + sync engine for Lists
│   ├── compare/                # Compare: item types, name parser, unit prices, matching, optimizer, API, offline cache
│   ├── receipt/                # Receipts: on-device reader, PDFs, parser, dates, store guess, matching, review, memory, share inbox
│   ├── help.ts                 # Help topic copy
│   ├── groceryDictionary.ts    # Item → aisle dictionary
│   ├── hints.ts                # Tip copy
│   ├── version.ts              # Release version (CalVer, set by CI)
│   └── categories.ts           # Product categories
├── utils/                  # Utility functions
│   ├── currency.ts             # Currency formatting
│   ├── quickAdd.ts             # Parses "2 milk", "atta 10 kg", …
│   └── analytics.ts            # Analytics helpers
└── types/
    └── index.ts            # TypeScript type definitions
```

## 🎨 Customization

### Theme & Design Tokens
SpendLess ships a single warm light theme. Colors are defined as OKLCH design
tokens (CSS variables) and surfaced to Tailwind via `tailwind.config.js`:
- `src/index.css` — design tokens, global styles and Tailwind layers
- `tailwind.config.js` — Tailwind theme mapping (colors, fonts, radii)

### App Icons
Edit `public/favicon.svg` (and `public/icon-maskable.svg`) and run
`npm run generate:icons` to regenerate the full icon set.

### Currencies
Add or modify supported currencies in `src/utils/currency.ts`. The app
automatically detects user locale and sets an appropriate default currency.

### Database Schema
Modify the schema by adding migration files in `supabase/migrations/`. Follow
the existing naming convention, create every object in the `spendless` schema
(schema-qualified, e.g. `spendless.lists`), add grants and RLS policies, and never
create SpendLess objects in `public`.

## 🧪 Testing

There is no automated test suite; run the linter and build, then follow the manual
checklist in [TESTING_GUIDE.md](TESTING_GUIDE.md):
```bash
npm run lint
npm run build
node scripts/check-contrast.mjs   # after changing colour tokens
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Made with ❤️ by [Jawaid](https://jawaid.dev)
- Powered by 🚀 [Ibexoft](https://ibexoft.com)
- Icons by [Lucide](https://lucide.dev)
- UI styled with [Tailwind CSS](https://tailwindcss.com)
- Backend powered by [Supabase](https://supabase.com)

## 📞 Support

For support, use **Contact support** in the app (Profile → Help, or the sign-in screen), visit
[ibexoft.com/contact](https://ibexoft.com/contact), or create an issue in the repository.

---

**Made with passion for smart shoppers everywhere** 🛒✨
