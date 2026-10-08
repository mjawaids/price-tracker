# Deployment (GitHub Actions → Supabase + Netlify)

Every push to `main` ships SpendLess to production through
[`.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml). Pull requests run the
same checks without deploying. Nothing is deployed from Bolt or from Netlify's own
build system any more.

## What a deploy does

| # | Step | Why |
|---|------|-----|
| 1 | **Checks**: `npm ci`, lint, colour-contrast check, migration guard, build | Fails fast; also runs on every PR |
| 2 | Compute the version (CalVer, see below) | One unique version per release |
| 3 | **Pre-deploy migrations** — `scripts/db-migrate.sh supabase/migrations` | Additive DB changes the new app needs; the live app keeps working |
| 4 | **Expose the `spendless` schema** in the Data API | Only adds it if missing; never removes other apps' schemas |
| 5 | Build with the production `VITE_*` values and the version | Same build that's tested below |
| 6 | **Netlify deploy** (`netlify deploy --prod --no-build --dir dist`) | Publishes `dist/` to spendless.ibexoft.com |
| 7 | **Smoke test** on Netlify (`<site>.netlify.app`): `/` and `/privacy` return 200, the entry bundle contains the new version; then the public domain, as a notice only | Proves the deploy is live and SPA routing works. The public domain is behind Cloudflare, which answers GitHub's runners with 403 |
| 8 | **Post-deploy migrations** — `scripts/db-migrate.sh supabase/post-deploy` | Cleanup the old app still needed (e.g. dropping old views) |
| 9 | Tag `vYYYY.M.N` + GitHub Release with auto-generated notes | Release history |

If any step fails the run stops there: later steps (post-deploy migrations, tagging)
don't run. Only one production deploy runs at a time.

## Versioning — CalVer `YYYY.M.N`

`2026.10.0`, `2026.10.1`, … then `2026.11.0` next month. `N` counts releases within
the month — it is **not** the day (the 5th release in October is `2026.10.4`,
whatever the date). It's computed from the existing `v*` git tags, injected at build time as
`VITE_APP_VERSION` (+ `VITE_APP_COMMIT`), shown in **Profile** (`SpendLess ·
v2026.10.0 (a1b2c3d)`) and on `<html data-app-version>`, and tagged after a successful deploy. Local builds show
`dev`. Nothing is committed back to `main`, and `package.json`'s `version` field
isn't used.

## Database migrations

SpendLess shares its Supabase project with other apps, so it does **not** use
`supabase db push` (the project's shared migration history contains other apps'
migrations). Instead `scripts/db-migrate.sh` records SpendLess migrations in
`spendless.schema_migrations` and applies new files in filename order — each in one
transaction with its bookkeeping row, so a failure leaves nothing half-applied.

- **`supabase/migrations/`** — runs *before* the new app goes live. Only additive or
  backward-compatible changes (new tables/columns, new functions).
- **`supabase/post-deploy/`** — runs *after* the new app is live. Destructive changes
  the old app still depended on (drop a column/view, tighten a constraint).
- File names: `<YYYYMMDDHHMMSS>_<snake_case_name>.sql`; never edit a file after it
  has been deployed — add a new one.
- Everything must live in the `spendless` schema. `scripts/check-migrations.mjs` (run
  in CI) fails the build otherwise; a file can opt out only with an explicit
  `-- migration-guard: allow-public <reason>` comment. The one built-in exception is
  storage: policies on `storage.objects` named `spendless-…` (buckets are
  project-wide, so ours are `spendless-avatars` and `spendless-product-images`).
- Files before `20261003000000` were applied by the old Bolt workflow; the runner
  skips them (`--from-scratch` applies everything for a brand-new database).

Try locally against any Postgres: `SUPABASE_DB_URL=… scripts/db-migrate.sh --dry-run supabase/migrations`.

## Catalogue jobs (manual)

[`.github/workflows/catalog-jobs.yml`](../.github/workflows/catalog-jobs.yml) runs
one-off data jobs on the shared Compare catalogue (`docs/compare-data.md`). It is
manual only (Actions → *Catalog jobs* → *Run workflow*), runs in the `production`
environment with `SUPABASE_DB_URL`, and is a **dry run unless "apply" is ticked**.

Pick the job with the *job* input:

- **add-branches** (the default) — adds or updates a city's public in-store branches
  from a reviewed list (`scripts/seed/branches/karachi.json`, set by *branches_file*;
  `scripts/seed/add-branches.ts`). The dry run lists new, changed and unchanged
  branches, and public branches in the city that aren't in the list. *apply* writes
  them in one transaction. It never deletes and never touches a private or online
  store; re-running an unchanged list writes nothing. Sources and checks:
  `docs/data-sources.md`.
- **promote-store** — needs *store_id*, *region* and *chain*. Makes one private
  store, and its owner's products priced there, public in a city
  (`scripts/seed/promote-store.ts`). Only with the owner's consent. Run it after the catalogue migrations are deployed: first as a dry run
  (it prints how many names it could parse), then with *apply*. Re-running is a
  no-op once the store is public.
- **close-branch** — needs *store_id* (a shared in-store shop). The undo for a shop
  the *Shared shops* job made (or any shared branch): it closes the shop and gives
  everyone who moved into it their own shop back — their private copy reopens, My
  stores and planned list items point at it again, and their suggestions are declined,
  so the nightly job never makes that shop again (`scripts/seed/close-branch.ts`).
  Prices copied to the closed shop stay with it, unseen. The dry run (rolled back)
  prints the same counts.

## Shared shops (nightly)

[`.github/workflows/shared-branches.yml`](../.github/workflows/shared-branches.yml)
runs `scripts/seed/promote-suggestions.ts` every night at 02:43 Karachi time (21:43
UTC) in the `production` environment with `SUPABASE_DB_URL`. People suggest their own
in-store shop as a shared one in the app; once enough different people suggested the
same shop, this makes it a shared shop and moves each person's shop into it (rules in
`docs/compare-data.md`). One transaction per run; the log (public) prints counts and
the names of shops that became shared, nothing about who suggested what.

- **Repository variables** — set them on GitHub: the repository's *Settings → Secrets
  and variables → Actions*, the **Variables** tab (not Secrets), *New repository
  variable* ([direct link](https://github.com/mjawaids/price-tracker/settings/variables/actions)).
  - `SHARED_BRANCHES_MIN_PEOPLE` — how many different people a new shared shop needs:
    a whole number from 2 to 50. Unset = the script's default, **3**. Any other value
    makes the run stop with an error and change nothing. Change it here, never in app
    copy (the app says "enough people").
  - `SHARED_BRANCHES_PAUSED` — exactly `true` (lowercase) makes the nightly run a dry
    run only; `True` or anything else doesn't pause it. Delete it (or change it) to
    resume. It pauses only the nightly run: a manual run with *apply* ticked still
    writes.
  - They can also be set on the `production` environment (*Settings → Environments →
    production → Environment variables*), since the job runs in it. If both are set,
    the environment's value wins, so keep each in one place.
- **Run by hand:** *Actions → Shared shops → Run workflow*. Unticked *apply* (the
  default) does everything and rolls it back, so the counts show what would happen.
- **Undo a shop:** *Catalog jobs* → `close-branch` (above).
- **GitHub disables scheduled workflows after 60 days without repository activity.**
  If it stops, open *Actions → Shared shops* and click *Enable workflow*.

## Price import (daily)

[`.github/workflows/price-import.yml`](../.github/workflows/price-import.yml) runs
`scripts/import/run.ts` every day at 03:17 Karachi time (22:17 UTC) in the `production`
environment with `SUPABASE_DB_URL`. It reads the online stores in
`scripts/import/sources.ts` politely and writes their prices, one transaction per store.
Sources, rules and exclusions are in `docs/data-sources.md`.

- **Run by hand:** *Actions → Price import → Run workflow*.
  - *source*: `all` or one store id.
  - *dry run*: ticked by default; it fetches and parses but writes nothing.
  - *max pages*: optional, a smaller per-store request cap.
- **Check how it went:**
  - the job log ends with a per-store summary;
  - `spendless.import_runs` has one row per store per run (`ok`, `partial` = stopped at
    its page cap, `blocked` = the store refused us, `failed` = an error);
  - read it with read-only SQL.
- **A failed run** (an error, not a block) makes the job fail, and GitHub emails you.
  A store that blocks us shows a warning in the log and is retried the next day; it
  is never worked around.
- **GitHub disables scheduled workflows after 60 days without repository activity.**
  If the import stops, open *Actions → Price import* and click *Enable workflow*.
- **Stop one store:** remove it from `scripts/import/sources.ts` and merge. Its last
  prices fade by recency; to retire them at once, ask for a one-off job.

## One-time setup

### 1. Supabase (project "Universal Project for Apps", ref `xutrdyjoqthxqwejarpz`)
1. **Access token** — <https://supabase.com/dashboard/account/tokens> → *Generate new
   token* (name it `spendless-github-actions`). Save as `SUPABASE_ACCESS_TOKEN`.
   If Supabase offers permission scopes (scoped tokens, `sbp_fc…`), scope it to this
   project only and grant just **Data API Config → Read**: the pipeline only checks
   that `spendless` is in the exposed schemas (step 4 below), and adds it only when
   it's missing, which needs **Read-write** (and a role in the organization that may
   change project settings). Without the scope picker you get a classic token with
   your account's full access; that works too. In the *Expose the spendless schema*
   step a `401` means the token itself is wrong (copy it again); a `403` means it
   lacks the permission — add the schema by hand (step 4) and re-run.
2. **Database connection string** — open the project → **Connect** (top bar) →
   *Connection string* → **Session pooler** (GitHub's runners need IPv4, which the
   direct connection doesn't offer) → copy the URI and put the database password in
   place of `[YOUR-PASSWORD]`. Save as `SUPABASE_DB_URL`.

   **Where's the password?** Supabase never shows it again after it's set, and the
   SpendLess app never needed it (it uses the anon key; Bolt used its own Supabase
   connection), so it isn't in this repo. Look in:
   - other apps in this shared project that connect to Postgres directly (servers,
     ORMs like Prisma/Drizzle, scripts) — their `.env` or hosting env vars, usually
     `DATABASE_URL`, `POSTGRES_URL`, `DIRECT_URL` or `SUPABASE_DB_URL`. The password is
     the part between `postgres.xutrdyjoqthxqwejarpz:` and `@`;
   - your password manager / browser's saved passwords for supabase.com.

   If you can't find it, **reset it**: left sidebar **Database** → **Settings** →
   *Reset database password* (it's not under Project Settings). Only apps that use
   the password directly (above) need the new one; apps using API keys or
   supabase-js aren't affected. A new password can take a few minutes to work through
   the pooler (brief "password authentication failed" errors are expected). Letters
   and numbers only avoids URL-encoding it in the connection string. A wrong password
   is harmless: the deploy stops at the first migration step before changing anything.
3. **API values** — Project Settings → **API Keys**: the `anon` / publishable key →
   `VITE_SUPABASE_ANON_KEY`. Project URL (`https://xutrdyjoqthxqwejarpz.supabase.co`,
   also on Project Settings → Integrations → **Data API**) → `VITE_SUPABASE_URL`.
4. **Exposed schemas** — Project Settings → Integrations → **Data API** → *Exposed
   schemas* must list `spendless` alongside the existing ones (it does in production
   since the first deploy). The pipeline checks this after the migrations and adds it
   if the token may; otherwise add it here and re-run the failed job. Only add it once
   the schema exists: exposing a missing schema breaks the Data API for every app.

### 2. Netlify (project `velvety-rabanadas-f4e189`, spendless.ibexoft.com)
1. **Personal access token** — avatar → *User settings* → *Applications* → *Personal
   access tokens* → *New access token*. Save as `NETLIFY_AUTH_TOKEN`.
2. **Site ID** — Project configuration → General → *Project details* → *Project ID*:
   `9b45f560-1ff2-4e8a-a0a4-fbd3afdf3696`. Save as `NETLIFY_SITE_ID`.
3. **No Git builds on Netlify** — Project configuration → Build & deploy →
   *Continuous deployment*: there should be no linked repository (there isn't today;
   Bolt deployed through the API). If one is ever linked, stop its builds so Netlify
   and GitHub don't both deploy.
4. **Google Analytics** — if the live site uses GA, copy the Measurement ID (Project
   configuration → Environment variables, or Google Analytics → Admin → Data streams).
   Save as `VITE_GA_MEASUREMENT_ID` (optional).

### 3. GitHub (repository Settings)
1. **Environments** → *New environment* `production` → *Deployment branches and tags*:
   **Selected branches** → add `main`. (Optional: *Required reviewers* to approve each
   deploy by hand.)
2. In the `production` environment add:
   - **Environment secrets**: `NETLIFY_AUTH_TOKEN`, `SUPABASE_ACCESS_TOKEN`,
     `SUPABASE_DB_URL`, `VITE_SUPABASE_ANON_KEY`
   - **Environment variables**: `NETLIFY_SITE_ID`, `SUPABASE_PROJECT_REF`
     (`xutrdyjoqthxqwejarpz`), `VITE_SUPABASE_URL`, `VITE_GA_MEASUREMENT_ID`
     (optional), `PRODUCTION_URL` (optional, defaults to `https://spendless.ibexoft.com`)
3. *Actions → General → Workflow permissions*: if the release step fails with a
   permissions error, choose **Read and write permissions**.
4. **Protect `main`** (free for public repos): *Settings* → *Rules* → **Rulesets** →
   *New ruleset* → **New branch ruleset**:
   - Ruleset name `Protect main`, Enforcement status **Active**
   - Target branches → *Add target* → **Include default branch**
   - ☑ **Restrict deletions** and ☑ **Block force pushes**
   - ☑ **Require a pull request before merging** — Required approvals **0** (you
     can't approve your own PRs; the PR still runs the checks)
   - ☑ **Require status checks to pass** → *Add checks* → **Checks** (it appears in
     the list once the workflow has run at least once, e.g. on the first PR)
   - Optional: *Bypass list* → *Repository admin*, so you can still push in an emergency
   - **Create**

### 4. Leave Bolt
1. In Bolt, open the SpendLess project's settings/integrations and disconnect
   **GitHub** and **Netlify** so Bolt can't push to `main` or deploy over the pipeline.
2. GitHub → your *Settings* → *Applications* → *Installed GitHub Apps* /
   *Authorized OAuth Apps*: remove Bolt's access to this repository if it's listed.
3. Netlify → *User settings* → *Applications* → *OAuth* / authorized applications:
   revoke Bolt if it's listed.
4. The repo no longer contains Bolt's `.bolt/` folder.

## How users get a new version
The app is a PWA, so a service worker serves the app shell from its cache. After a
deploy, an open app finds the new `sw.js` (hourly, when the user returns to it, or on
reconnect), installs it in the background and shows **"A new version is ready ·
Update"**; tapping it switches over and reloads. If the app was in the background for
30+ minutes it switches without asking, and any fresh launch runs the new build. See
`src/components/shell/UpdatePrompt.tsx`.

This only works if `sw.js` and `index.html` are never served stale. `public/_headers`
sets `Cache-Control: no-cache` on `/`, `/index.html`, `/sw.js`, `/site.webmanifest` and
`/share-target-sw.js` (the "Share to SpendLess" handler `sw.js` imports), and
`immutable` on the content-hashed `/assets/*` and the versioned reader folders `/ocr/*`
and `/pdf/*` (the PDF reader's folder also gets a `Content-Security-Policy` for the
pdf.js worker: its own files only, no other connections). The public domain is behind
**Cloudflare**: keep its *Browser Cache TTL* on **Respect Existing Headers** and don't
add Cache Rules that cache HTML or `sw.js` at the edge (or purge the cache after each
deploy if you do).

"Share to SpendLess" is a POST to `/share-receipt` that the service worker answers. If
one reaches Netlify instead (no service worker in control yet, e.g. straight after a
deploy), `public/_redirects` sends it back to `/?share=failed` and the app says so. The
deploy's smoke test checks the manifest's `share_target`, that `sw.js` imports the
handler, the handler's and the PDF reader's headers, and that fallback.

Rolling back is a new deploy too: users get the previous build through the same prompt.

## Rolling back
- **App**: Netlify → *Deploys* → open the previous good deploy → **Publish deploy**.
  (Or revert the commit on `main` — the pipeline deploys the revert as a new version.)
- **Database**: migrations are forward-only. Write a new migration that undoes the
  change. Supabase's daily backups are the last resort.

## Adding another service later
Add a step to the `deploy` job in `.github/workflows/ci-cd.yml`:
- before **Deploy to Netlify** if the new app needs it first (e.g. edge functions,
  storage buckets — name buckets `spendless-…`),
- after **Smoke test production** if it depends on the new app being live (e.g. cache
  purge, notifications).
Put its credentials in the `production` environment, add a check for them in
*Check required configuration*, and document it here.
