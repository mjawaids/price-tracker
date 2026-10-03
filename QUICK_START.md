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
(Dashboard → Settings → API):

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

1. Apply the migrations in `supabase/migrations/` in filename order (Supabase CLI
   `supabase db push`, or paste each file into the SQL editor).
2. In the Supabase dashboard go to **Settings → API → Exposed schemas** and add
   `spendless`. The app's client is pinned to this schema
   (`src/lib/supabaseClient.ts`), so without this step every request fails.

## 4. Run

```bash
npm run dev        # http://localhost:5173
npm run lint
npm run build      # production build in dist/
npm run preview    # serve the build (service worker + offline work here, not in dev)
```

## 5. Find your way around

| What | Where |
|------|-------|
| Lists (default section) | `src/components/screens/ListsScreen.tsx`, `src/contexts/ListsContext.tsx` |
| Offline storage + sync | `src/lib/offline/` |
| Compare (prices, cart, plan) | `src/components/screens/` (Browse, Cart, Plan, Manage…) |
| Navigation shell | `src/components/shell/Shell.tsx` |
| Design tokens | `src/index.css`, `tailwind.config.js` |
| Database migrations | `supabase/migrations/` |
| Conventions & rules for contributors/AI | `CLAUDE.md` |

## Tips

- Test phone layouts with your browser's device toolbar at 375px, then 768px and 1280px.
- To try offline mode, run `npm run build && npm run preview`, open the app, then
  switch the browser to offline in DevTools → Network.
- After changing colour tokens run `node scripts/check-contrast.mjs`.
