# Quick Start

Get SpendLess running locally in a few minutes. For the full picture see
[README.md](README.md); for manual test passes see [TESTING_GUIDE.md](TESTING_GUIDE.md).

## 1. Install

```bash
git clone https://github.com/mjawaids/price-tracker.git
cd price-tracker
npm install
```

Node.js 18+ is required.

## 2. Configure

Copy `.env.example` to `.env` and fill in your Supabase project values
(Project Settings → **API Keys** for the anon key; the project URL is on
Project Settings → Integrations → **Data API**):

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
VITE_GA_MEASUREMENT_ID=        # optional
VITE_GA_ENABLE_IN_DEV=false
```

Without these the marketing/legal pages still load, but sign-in and data are disabled.

## 3. Database

SpendLess keeps all of its tables in its own Postgres schema, **`spendless`**,
because the Supabase project can be shared with other apps.

1. For your own (empty) Supabase project, apply the migrations with the runner:
   ```bash
   SUPABASE_DB_URL="postgresql://…" scripts/db-migrate.sh --from-scratch supabase/migrations
   SUPABASE_DB_URL="postgresql://…" scripts/db-migrate.sh supabase/post-deploy
   ```
   (Production is migrated automatically on every push to `main` — see
   [docs/deployment.md](docs/deployment.md).)
2. In the Supabase dashboard go to **Project Settings → Integrations → Data API** and
   add `spendless` to **Exposed schemas**. The app's client is pinned to this schema
   (`src/lib/supabaseClient.ts`), so without this step every request fails.

## 4. Run

```bash
npm run dev        # http://localhost:5173
npm run lint
npm run build      # typecheck + production build in dist/
npm run preview    # serve the build (service worker + offline work here, not in dev)
```

## 5. Find your way around

| What | Where |
|------|-------|
| Lists (default section) | `src/components/screens/ListsScreen.tsx`, `src/contexts/ListsContext.tsx` |
| Offline storage + sync | `src/lib/offline/` |
| Where to buy (plan for a list) | `src/components/screens/PlanScreen.tsx`, `listCompare.tsx`; logic in `src/lib/compare/` |
| Compare (prices, stores, contribute) | `src/components/screens/` (Prices, Search, Detail, Stores, Contribute, Manage…), state in `src/contexts/CompareContext.tsx` |
| Navigation shell | `src/components/shell/Shell.tsx` |
| Design tokens | `src/index.css`, `tailwind.config.js` |
| Database migrations | `supabase/migrations/` (pre-deploy), `supabase/post-deploy/` |
| Deploy pipeline | `.github/workflows/ci-cd.yml`, [docs/deployment.md](docs/deployment.md) |
| Conventions & rules for contributors/AI | `CLAUDE.md` |

## Tips

- Test phone layouts with your browser's device toolbar at 375px, then 768px and 1280px.
- To try offline mode, run `npm run build && npm run preview`, open the app, then
  switch the browser to offline in DevTools → Network.
- After changing colour tokens run `node scripts/check-contrast.mjs`.
