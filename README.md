# SpendLess - Smart Shopping List and Price Comparison App

A modern, mobile-first shopping app built with React, TypeScript, and Supabase. Jot down what you need in seconds — even offline — and, when you want to save more, track prices across stores and get the cheapest shopping plan.

> Formerly referred to as "PriceTracker" — the product is now branded **SpendLess**.

## ✨ Features

The app has two sections: **Lists** (the default) and **Compare**.

### 📝 Quick Lists (default)
- Add items the way you'd say them: `bread`, `2 milk`, `atta 10 kg` — no brand or size needed
- Suggestions while typing (your own history first) and one-tap "often bought" chips
- Items sorted by aisle automatically (English and romanized Urdu names)
- Tick items as you shop, swipe to tick/delete, undo anything, see your progress
- Several lists (Groceries, Pharmacy, …) with optional quantity, unit and notes
- Friendly one-at-a-time tips that teach the app as you use it

### 📴 Works Offline
- Lists are stored on the device first (IndexedDB) and sync to Supabase when online
- Changes made offline are queued and sent automatically; the app opens offline too
- Installable PWA; the app shell and fonts are cached by a service worker
- New releases arrive by themselves: an open app shows **"A new version is ready · Update"**,
  and the next launch always runs the latest build

### 🛍️ Smart Price Tracking (Compare)
- Track products and their prices across multiple stores
- Real-time price comparison with visual best-price indicators
- Per-store availability and delivery rules

### 📝 Smart Shopping Plans
- Build shopping lists and turn them into optimized plans
- Automatic store-by-store cost optimization (including delivery fees)
- Cart and plan screens for organizing what to buy and where

### 🏪 Store Management
- Support for both physical and online stores
- Delivery fee and delivery-rule tracking
- Store-specific pricing and availability

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
- **spendless.products**: Product catalog with per-store pricing
- **spendless.stores**: Store information (physical and online) with delivery rules
- **spendless.shopping_lists**: Compare's cart ("My Cart")

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

One-time setup (tokens, GitHub `production` environment, leaving Bolt), rollback and
how to add new services: **[docs/deployment.md](docs/deployment.md)**.

## 📁 Project Structure

```
.github/workflows/ci-cd.yml # CI checks + production deploy pipeline
public/                     # Static assets (favicons, PWA icons, manifest, _redirects, _headers)
scripts/
├── generate-icons.mjs      # Generates favicon/PWA icons from SVG sources
├── check-contrast.mjs      # WCAG contrast check for the colour tokens
├── check-migrations.mjs    # Guard: migrations may only touch the spendless schema (+ spendless-* storage policies)
├── db-migrate.sh           # Applies migrations (tracked in spendless.schema_migrations)
└── supabase-expose-schema.sh # Adds spendless to the Data API's exposed schemas
supabase/migrations/        # Pre-deploy (additive) migrations — schema: spendless
supabase/post-deploy/       # Post-deploy (cleanup) migrations
src/
├── App.tsx                 # App root (auth gate + shell)
├── main.tsx                # Entry point + React Router routes
├── index.css               # Global styles, design tokens & Tailwind
├── components/
│   ├── shell/Shell.tsx     # Adaptive app shell (sidebar/nav + screens)
│   ├── screens/            # Feature screens
│   │   ├── ListsScreen.tsx     # Quick lists (default section)
│   │   ├── listParts.tsx       # List rows, add bar, suggestions, banners
│   │   ├── listSheets.tsx      # Item details + list switcher sheets
│   │   ├── listHelpers.ts      # Aisle grouping/colours + haptic tap
│   │   ├── AuthScreen.tsx      # Sign in / sign up
│   │   ├── BrowseScreen.tsx    # Browse products
│   │   ├── SearchScreen.tsx    # Search
│   │   ├── CartScreen.tsx      # Cart
│   │   ├── PlanScreen.tsx      # Optimized shopping plan
│   │   ├── DetailScreen.tsx    # Product detail
│   │   ├── ManageScreens.tsx   # Manage products / stores / prices
│   │   └── ProfileScreen.tsx   # User profile & settings
│   ├── onboarding/         # Compare walkthrough
│   ├── ui/                 # Reusable UI primitives (Icon, Sheet, Toast, CoachMark, …)
│   ├── PageHeader.tsx      # Header for marketing/legal pages
│   └── PageFooter.tsx      # Footer with developer credits
├── pages/                  # Standalone routed pages
│   ├── Pricing.tsx
│   ├── Privacy.tsx
│   ├── Refund.tsx
│   ├── Terms.tsx
│   └── lazy.ts             # Lazy (code-split) exports of the pages above
├── contexts/               # React contexts
│   ├── AuthContext.tsx         # Authentication state (+ offline identity)
│   ├── ListsContext.tsx        # Lists state, quick add, offline sync
│   ├── AppContext.tsx          # Navigation, sections & Compare cart state
│   ├── OnboardingContext.tsx   # Walkthrough + contextual tips
│   ├── ThemeContext.tsx        # Theme management
│   ├── SettingsContext.tsx     # User settings
│   └── AnalyticsContext.tsx    # Analytics wiring
├── hooks/                  # Custom React hooks
│   ├── useSupabaseData.ts      # Supabase data management
│   ├── useBreakpoint.ts        # Responsive breakpoints
│   ├── useHint.ts              # One-at-a-time contextual tips
│   └── useFmt.ts               # Formatting helpers
├── lib/                    # Library configuration & data
│   ├── supabase.ts             # Supabase client re-export
│   ├── supabaseClient.ts       # Supabase client (pinned to the `spendless` schema)
│   ├── offline/                # IndexedDB store + sync engine for Lists
│   ├── groceryDictionary.ts    # Item → aisle dictionary
│   ├── hints.ts                # Tip copy
│   ├── version.ts              # Release version (CalVer, set by CI)
│   └── categories.ts           # Product categories
├── utils/                  # Utility functions
│   ├── currency.ts             # Currency formatting
│   ├── optimizer.ts            # Shopping plan optimization
│   ├── quickAdd.ts             # Parses "2 milk", "atta 10 kg", …
│   ├── analytics.ts            # Analytics helpers
│   └── storage.ts              # Local storage utilities
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
