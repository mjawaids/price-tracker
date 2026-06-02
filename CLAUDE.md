# SpendLess (price-tracker)

Mobile-first price comparison and shopping optimizer. Users track product prices
across stores, build a cart, and get an optimized multi-store shopping plan.
Live at https://spendless.ibexoft.com

## Tech Stack
- React 18 + TypeScript + Vite + Tailwind CSS
- Supabase (PostgreSQL + Auth + RLS)
- Lucide React icons, React Router 7

## Commands
- `npm run dev` — start dev server
- `npm run build` — production build (output: `dist/`)
- `npm run lint` — ESLint (no test framework; manual testing only)
- `npm run generate:icons` — regenerate PWA/favicon icons

## Environment Variables (`.env`)
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_GA_MEASUREMENT_ID=   # optional
VITE_GA_ENABLE_IN_DEV=false
```

## Architecture

### State Management
Context-based (no Redux). Five providers in `src/contexts/`:
- `AuthContext` — session, login/logout
- `AppContext` — navigation stack, cart (`Record<productId, qty>`), screen enum
- `SettingsContext` — currency + location (persisted to localStorage)
- `ThemeContext` — light-only
- `AnalyticsContext` — gtag wrappers

### Key Hooks
- `useSupabaseData()` — CRUD for products/stores/shopping lists; 30s TTL cache
- `useBreakpoint()` — returns `{ compact, isTablet }` for responsive logic
- `useFmt()` — currency formatting

### Navigation
Stack-based within `AppContext`. Screen enum values: `browse`, `search`, `detail`,
`cart`, `plan`, `profile`, `mproducts`, `mstores`, `mprices`.
- Mobile (<768px): bottom tab bar
- Tablet (768–1023px): collapsed sidebar
- Desktop (≥1024px): full sidebar

## Database (Supabase — all tables have RLS, data is per-user)

| Table | Key Columns |
|-------|------------|
| `products` | id, user_id, name, category, brand, unit, **prices** (jsonb array) |
| `stores` | id, user_id, name, type ('physical'\|'online'), location (jsonb), **delivery_rule** (jsonb) |
| `shopping_lists` | id, user_id, name, items (jsonb array) — "My Cart" is auto-created |

`prices` is a **jsonb column on `products`** (not a separate table). Each entry:
`{ storeId, price, currency, lastUpdated, isAvailable, discountPercentage? }`

`delivery_rule` union: `none | free | flat { fee } | over { threshold, fee }`
Legacy `has_delivery`/`delivery_fee` columns still exist; `delivery_rule` takes precedence.

## Key Files

| Path | Purpose |
|------|---------|
| `src/types/index.ts` | All TypeScript types (Product, Store, Price, DeliveryRule, etc.) |
| `src/hooks/useSupabaseData.ts` | All Supabase CRUD + caching |
| `src/utils/optimizer.ts` | Cart optimization (brute-force ≤300k combos, else greedy) |
| `src/utils/currency.ts` | 50+ currencies, formatting, geolocation detection |
| `src/lib/categories.ts` | 15 canonical categories (tuned for Pakistan market) |
| `src/components/shell/Shell.tsx` | Adaptive layout shell + screen routing |
| `supabase/migrations/` | Schema history (7 migrations) |

## Conventions
- **Naming**: PascalCase components/types, camelCase hooks/utils, kebab-case CSS vars
- **Styling**: Tailwind utilities only; OKLCH design tokens via CSS vars (`--paper`, `--surface`, `--ink`, `--accent`); no CSS Modules
- **Responsive**: mobile-first; Tailwind breakpoints `md:` (768px), `lg:` (1024px)
- **Touch**: 48px min touch targets, 16px font on inputs (prevents iOS zoom)
- **Error handling**: try/catch with `console.error`; graceful fallbacks to empty arrays
- **Analytics**: always guard with `window.gtag` check before calling

## What to Avoid
- Don't add a test framework — no tests exist and none are expected
- Don't introduce CSS Modules or styled-components
- Don't create a separate `prices` table — prices live in `products.prices` jsonb
- Don't add dark mode — `ThemeContext` is light-only by design
- Don't add Redux/Zustand — the context pattern is intentional
