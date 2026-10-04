# SpendLess (price-tracker)

Mobile-first shopping app with two sections:
- **Lists** (default): quick grocery/shopping lists — type "bread" or "2 milk" and
  go; no brand/size needed. Works fully offline and syncs when back online.
- **Compare**: users track product prices across stores, build a cart, and get an
  optimized multi-store shopping plan.
Live at https://spendless.ibexoft.com

## Tech Stack
- React 18 + TypeScript + Vite + Tailwind CSS
- Supabase (PostgreSQL + Auth + RLS)
- Lucide React icons, React Router 7

## Commands
- `npm run dev` — start dev server
- `npm run build` — typecheck + production build (output: `dist/`)
- `npm run typecheck` — TypeScript check only (`vite build` alone doesn't type-check)
- `npm run lint` — ESLint (no test framework; manual testing only)
- `npm run generate:icons` — regenerate PWA/favicon icons
- `node scripts/check-contrast.mjs` — WCAG contrast check for the colour tokens (run after editing them)
- `node scripts/check-migrations.mjs` — fails if a migration touches anything outside the `spendless` schema
  (only exception: `spendless-…` policies on `storage.objects`)
- `SUPABASE_DB_URL=… scripts/db-migrate.sh [--dry-run] <dir>` — apply migrations (CI does this on deploy)

## Environment Variables (`.env`)
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_GA_MEASUREMENT_ID=   # optional
VITE_GA_ENABLE_IN_DEV=false
```

## Architecture

### State Management
Context-based (no Redux). Providers in `src/contexts/`:
- `AuthContext` — session, login/logout; caches the last identity so the app opens offline
- `ListsContext` — Lists section: lists/items, quick add, suggestions, sync status (offline-first)
- `AppContext` — navigation stack, section, Compare cart (`Record<productId, qty>`), screen enum
- `OnboardingContext` — Compare walkthrough + contextual tips (`useHint`)
- `SettingsContext` — currency + location (persisted to localStorage)
- `ThemeContext` — light-only
- `AnalyticsContext` — gtag wrappers

### Key Hooks
- `useSupabaseData()` — CRUD for products/stores/shopping lists; 30s TTL cache
- `useBreakpoint()` — returns `{ compact, isTablet }` for responsive logic
- `useFmt()` — currency formatting
- `useHint(id, when)` — one-at-a-time contextual tips (copy in `src/lib/hints.ts`)

### Offline (Lists)
- `src/lib/offline/db.ts` — IndexedDB (`idb`) per user: `lists`, `items`, `outbox`, `meta`
- `src/lib/offline/sync.ts` — every change is a full-row upsert queued in `outbox`;
  `flush()` pushes (lists before items), `pull()` fetches rows with `updated_at` >
  cursor. Last write wins; rows with unsent local edits are never overwritten.
- Ids are generated on the device; deletes are soft (`deleted_at`).
- Service worker (vite-plugin-pwa) precaches the app shell and caches Google Fonts.

### App updates (new deploys)
- `registerType: 'prompt'` in `vite.config.ts`: a new deploy's service worker installs
  and **waits**. `src/components/shell/UpdatePrompt.tsx` (mounted in `src/main.tsx`, so
  every route) registers it via `virtual:pwa-register/react`, checks for a new
  `sw.js` hourly, on return to the app and on reconnect, and shows a top toast
  "A new version is ready · Update". Tapping it activates the new worker and reloads.
  Coming back after ≥30 min in the background with an update waiting applies it
  automatically. A cold start always gets the newest build.
- Cache invalidation: Workbox precache entries are revisioned per build and old ones
  are removed when the new worker activates. `public/_headers` makes Netlify serve
  `/`, `/index.html`, `/sw.js` and `/site.webmanifest` as `no-cache` and the hashed
  `/assets/*` as immutable. `src/main.tsx` reloads once on `vite:preloadError` (a tab
  on an old build asking for a chunk the new deploy removed).
- Lists data survives the reload (IndexedDB + outbox); in-memory state (navigation
  stack, Compare cache) starts fresh.
- Compare still needs a network; it shows an offline notice instead of breaking.

### Navigation
Stack-based within `AppContext`. Screen enum values: `lists`, `browse`, `search`,
`detail`, `cart`, `plan`, `profile`, `mproducts`, `mstores`, `mprices`.
Sections (`app.section` / `app.openSection`): `lists` (default), `compare`, `profile`.
- Mobile (<768px): bottom tab bar **Lists · Compare · Profile**; Compare has a
  Browse · Cart · Catalogue segmented control (Catalogue → Products/Stores/Prices)
- Tablet (768–1099px): collapsed sidebar
- Desktop (≥1100px): full sidebar (your lists on top, then Compare and Catalogue)

## Database (Supabase — schema `spendless`, all tables have RLS, data is per-user)

### Own schema — the Supabase project is shared with other apps
SpendLess lives in the Supabase project "Universal Project for Apps", which other
apps also use (their tables, e.g. `accounts`, `goals`, `profiles`, `transactions`,
are in `public`). SpendLess data must never mix with theirs:
- **Every SpendLess database object lives in the `spendless` schema** — tables,
  functions, triggers, views. Migrations schema-qualify everything
  (`spendless.products`, `CREATE SCHEMA IF NOT EXISTS spendless`); never rely on the
  default `public`.
- **Never create, alter or drop anything in `public` or another app's schema**, and
  never touch other apps' tables or functions (`accounts`, `goals`, `profiles`,
  `transactions`, `public.handle_new_user`, `public.update_updated_at_column`).
  The only exception is the temporary rollout views from
  `20261003000000_spendless_schema.sql`, removed by
  `supabase/post-deploy/20261003000200_*`.
- The client is pinned to the schema in `src/lib/supabaseClient.ts`
  (`createClient(url, key, { db: { schema: DB_SCHEMA } })`, `DB_SCHEMA = 'spendless'`);
  don't create other clients without it.
- New tables need grants in their migration (`GRANT ALL ON spendless.<t> TO anon,
  authenticated, service_role`) plus RLS. `spendless` must stay listed in Dashboard →
  Project Settings → Integrations → **Data API** → *Exposed schemas* (the pipeline
  adds it automatically), or the API can't see it.
- `auth.users` is shared by all apps in the project (that can't be split without a
  separate project). Keep app data in `spendless` tables, not in other apps' tables.
- Storage buckets are project-wide, so SpendLess's are named `spendless-…`
  (`spendless-avatars`, `spendless-product-images`; names live in
  `src/lib/storage.ts`), and so are their policies on `storage.objects`
  (`"spendless-avatars: owner insert"`). Both are public (files are read by URL);
  users may only write, list and delete inside their own `<user id>/` folder.
  Creating them is a migration (`INSERT INTO storage.buckets`); deleting one needs
  `SET LOCAL storage.allow_delete_query = 'true'` and an empty bucket.
- Schema changes ship **only through the deploy pipeline** (merge to `main`): add a
  migration file, never change the live database by hand. Before writing one, check
  what's live (Supabase MCP `list_tables`, read-only SQL). Applying anything to the
  shared project outside the pipeline needs the user's explicit OK.
- Migration files: `<YYYYMMDDHHMMSS>_<name>.sql`, never edited once deployed.
  `supabase/migrations/` = additive, runs before the new app goes live;
  `supabase/post-deploy/` = destructive cleanup the old app still needed, runs after.
  Tracked in `spendless.schema_migrations` by `scripts/db-migrate.sh` (not
  `supabase db push` — the shared project's history includes other apps).

| Table (`spendless.*`) | Key Columns |
|-------|------------|
| `products` | id, user_id, name, category, brand, unit, **prices** (jsonb array) |
| `stores` | id, user_id, name, type ('physical'\|'online'), location (jsonb), **delivery_rule** (jsonb) |
| `shopping_lists` | id, user_id, name, items (jsonb array) — Compare's "My Cart" (auto-created) |
| `lists` | id (device-generated), user_id, name, sort_order, updated_at (server-set), deleted_at |
| `list_items` | id, list_id, user_id, name, quantity?, unit?, note?, category?, done, done_at, cleared_at, product_id?, updated_at (server-set), deleted_at |

`prices` is a **jsonb column on `products`** (not a separate table). Each entry:
`{ storeId, price, currency, lastUpdated, isAvailable, discountPercentage? }`

`delivery_rule` union: `none | free | flat { fee } | over { threshold, fee }`
Legacy `has_delivery`/`delivery_fee` columns still exist; `delivery_rule` takes precedence.

## Key Files

| Path | Purpose |
|------|---------|
| `src/types/index.ts` | All TypeScript types (Product, Store, Price, DeliveryRule, etc.) |
| `src/lib/supabaseClient.ts` | Supabase client, pinned to the `spendless` schema |
| `src/lib/storage.ts` | Storage bucket names + `storagePathFromUrl()` |
| `src/lib/links.ts` | Outbound links with UTM tags: `supportUrl(placement)` → ibexoft.com/contact |
| `src/hooks/useSupabaseData.ts` | All Supabase CRUD + caching |
| `src/utils/optimizer.ts` | Cart optimization (brute-force ≤300k combos, else greedy) |
| `src/utils/currency.ts` | 50+ currencies, formatting, geolocation detection |
| `src/lib/categories.ts` | 15 canonical categories (tuned for Pakistan market) |
| `src/components/shell/Shell.tsx` | Adaptive layout shell + screen routing |
| `src/components/shell/UpdatePrompt.tsx` | Service worker registration + "new version" prompt |
| `public/_headers` | Netlify cache headers (no-cache HTML/SW, immutable `/assets/*`) |
| `src/components/screens/ListsScreen.tsx` | Lists section (+ `listParts.tsx`, `listSheets.tsx`) |
| `src/contexts/ListsContext.tsx` | Lists state + offline sync wiring |
| `src/utils/quickAdd.ts` | Parses "2 milk", "milk x2", "atta 10 kg" |
| `src/lib/groceryDictionary.ts` | Item → aisle (English + romanized Urdu) |
| `supabase/migrations/`, `supabase/post-deploy/` | Schema history (pre-/post-deploy) |
| `.github/workflows/ci-cd.yml` | CI checks + production deploy pipeline |
| `scripts/db-migrate.sh` | Migration runner (tracks `spendless.schema_migrations`) |
| `docs/deployment.md` | Deployment runbook, setup, rollback |

## Conventions
- **Naming**: PascalCase components/types, camelCase hooks/utils, kebab-case CSS vars
- **Styling**: Tailwind utilities only; OKLCH design tokens via CSS vars (`--paper`, `--surface`, `--ink`, `--accent`); no CSS Modules
- **Responsive**: mobile-first; Tailwind breakpoints `md:` (768px), `lg:` (1024px)
- **Touch**: 48px min touch targets, 16px font on inputs (prevents iOS zoom)
- **Error handling**: try/catch with `console.error`; graceful fallbacks to empty arrays
- **Analytics**: always guard with `window.gtag` check before calling
- **Outbound links**: tag with `utm_source=spendless&utm_medium=referral`; the support
  link always comes from `supportUrl()` (`src/lib/links.ts`), never a hand-built URL or
  an email address

## Security
Always follow security best practices — in code, migrations, CI config and docs.
Security is never traded for convenience or speed; if a request would weaken it,
say so and propose a safe alternative.
- **Secrets**: never commit secrets, keys, tokens or DB URLs (`.env` is git-ignored;
  `.env.example` holds placeholders only). Only the Supabase **anon** key belongs in the
  client — never a `service_role` key or `SUPABASE_DB_URL`. CI secrets stay in the
  GitHub `production` environment; never echo them in logs.
- **Data access**: RLS is the security boundary, not the UI. Every new `spendless`
  table gets RLS enabled plus policies scoped to `auth.uid() = user_id` in the same
  migration; never disable RLS or add `USING (true)` policies on user data. Never trust
  a client-supplied `user_id` without a policy that enforces it.
- **Database functions**: avoid `SECURITY DEFINER`; if one is truly needed, pin
  `SET search_path` and keep it in `spendless`. Never build SQL from string
  concatenation — use the Supabase client's query builder or parameters.
- **Storage**: users may only write, list and delete inside their own `<user id>/`
  folder; keep policies that way. Validate file type and size before uploading.
- **Input & output**: treat all user input, URLs, imported data and synced rows as
  untrusted. Validate and length-limit on input; rely on React's escaping — no
  `dangerouslySetInnerHTML`, `eval`, `new Function` or unvalidated `href`/`src`
  (block `javascript:` URLs).
- **Auth**: use Supabase Auth only; never roll custom auth, store passwords, or put
  tokens in URLs. Keep sign-out clearing the cached identity and the user's offline
  lists (`AppContext.signOut` → `ListsContext.clearLocalData`, after a final sync).
- **Privacy**: no PII or user content in analytics events, logs or error messages.
- **Dependencies**: add packages sparingly from reputable sources; keep the lockfile
  committed; check `npm audit` when adding or upgrading; no scripts from untrusted CDNs.
- **CI/CD**: least-privilege `permissions:` in workflows; pin actions to a version
  (third-party ones to a commit SHA); never run untrusted PR code with access to secrets.
- When reviewing or writing code, flag any security issue you spot (even outside the
  task) rather than silently leaving it.

## Deployment (CI/CD)
- `.github/workflows/ci-cd.yml`: PRs and pushes run checks (lint, contrast, migration
  guard, build). Pushes to `main` deploy: pre-deploy migrations → expose schema →
  build → Netlify → smoke test → post-deploy migrations → tag + GitHub Release.
- Versions are **CalVer `YYYY.M.N`** from git tags, injected as `VITE_APP_VERSION` /
  `VITE_APP_COMMIT` (`src/lib/version.ts`, shown in Profile). Don't hand-edit versions
  or commit version bumps.
- Secrets/variables live in the GitHub `production` environment; runbook, setup and
  rollback in `docs/deployment.md`. Bolt is no longer used — don't add Bolt files.
- New services go in as steps of the `deploy` job (see `docs/deployment.md`).
- SPA routing on Netlify comes from `public/_redirects`; keep it. Cache headers come
  from `public/_headers`; never give `sw.js` or `index.html` a long cache lifetime.

## Keep Docs in Sync
Docs are part of every change, not an afterthought:
- Any change to behaviour, features, setup, env vars, commands, scripts, database
  schema/migrations, project structure or UX updates the affected docs **in the
  same commit**: `README.md`, `CLAUDE.md`, `QUICK_START.md`, `TESTING_GUIDE.md`,
  `GA_TROUBLESHOOTING.md` and `docs/` (and any new doc you add).
- `CLAUDE.md` must always describe the code as it is now (architecture, key files,
  tables, conventions). `README.md` must always match what users and contributors see.
- Rewrite or delete docs that have gone stale rather than leaving them wrong.
- Before finishing a task, search the docs for anything that mentions what you changed
  (`grep -rn "<thing>" *.md docs/`) and fix every hit.

## Design & UX Standards
The bar is a modern, polished, top-tier app experience. Every UI change should look
and feel like it came from a strong product design team, not a default template.

### Principles
- **Mobile-first, app-like**: design for a phone in one hand first, then scale up to
  tablet and desktop. Keep primary actions within thumb reach; no hover-only behavior.
- **Clarity over decoration**: clear visual hierarchy, generous whitespace, one primary
  action per screen, scannable prices and savings (savings are the hero of the product).
- **Consistency**: use the existing tokens and primitives; never hard-code colors,
  radii, shadows or fonts. Extend the token set (`src/index.css` +
  `tailwind.config.js`) rather than adding one-off values.
- **Every state is designed**: loading (skeletons over spinners), empty (helpful copy
  + next action), error (plain-language message + recovery), and success feedback for
  every async action.
- **Motion with purpose**: short, subtle transitions (150–300ms) that explain change;
  respect `prefers-reduced-motion`.
- **Accessibility is non-negotiable**: WCAG 2.2 AA contrast, visible focus states,
  semantic HTML, labelled controls and icon buttons, keyboard navigable, screen-reader
  friendly; 48px touch targets and 16px input text (see Conventions).
- **Performance is UX**: fast first paint, no layout shift, optimistic updates where
  safe, lazy-load heavy screens.
- **Copy**: short, friendly, specific microcopy; money always formatted via `useFmt()`.

### Design System in Code
- **Tokens**: `src/index.css` (`--paper`, `--surface`, `--ink`/`--ink-soft`/`--ink-faint`,
  `--line`, `--accent` family, `--r-card`, `--r-btn`, `--shadow-card`)
- **Tailwind mapping**: `tailwind.config.js` (`bg-paper`, `text-ink-soft`, `rounded-card`,
  `rounded-btn`, `shadow-card`, `font-display`, `animate-slide-up`, …)
- **Typography**: `font-display` (Bricolage Grotesque) for headings, `font-sans`
  (Hanken Grotesk) for body, `font-mono` (Space Mono) for figures where it helps
- **Primitives**: reuse `src/components/ui/` (`primitives.tsx`, `Sheet.tsx`, `Icon.tsx`)
  before creating new components; put new shared pieces there

### Using Claude Design
Involve **Claude Design** whenever the work is design-led rather than a small tweak:
- New screens, flows or features with UI
- Significant redesigns of existing screens, navigation or layout
- New visual language: components, iconography, illustrations, empty states,
  onboarding, marketing/landing pages
- Any time the right look or interaction is unclear and options should be compared

Workflow: explore and agree the design in Claude Design (mockups/prototypes, mobile
first, then tablet/desktop) → confirm the direction with the user → implement it with
the project's tokens and primitives → check the build against the design at 375px,
768px and 1024px+. Small fixes that stay inside the existing design system don't need
a Claude Design pass.

### UI Change Checklist
- [ ] Uses tokens/primitives only; no hard-coded colors, radii or shadows
- [ ] Looks right at mobile (375px), tablet (768px) and desktop (1024px+)
- [ ] Loading, empty, error and success states covered
- [ ] Contrast, focus, labels and keyboard access checked
- [ ] Motion is subtle and honours reduced-motion
- [ ] `npm run lint` and `npm run build` pass

## What to Avoid
- Don't add a test framework — no tests exist and none are expected
- Don't introduce CSS Modules or styled-components
- Don't create a separate `prices` table — prices live in `products.prices` jsonb
- Don't add dark mode — `ThemeContext` is light-only by design
- Don't add Redux/Zustand — the context pattern is intentional
- Don't create SpendLess tables/functions in `public` or touch other apps' objects —
  everything goes in the `spendless` schema (shared Supabase project)
- Don't make Lists depend on the network — all list reads/writes go through
  `ListsContext` (IndexedDB first, then sync)
- Don't ship UI with hard-coded colors/sizes, unstyled default controls, or missing
  loading/empty/error states
- Don't commit secrets, ship a `service_role` key to the client, or weaken RLS/storage
  policies — see **Security**
