// Shared shops from suggestions (nightly). People suggest their own in-store shop as a
// shared one (spendless.branch_suggestions); once enough different people suggest the
// same shop (city + chain/shop name + area), it becomes a shared in-store shop and each
// person's shop moves into it: their prices are copied there (their names are never
// shown), My stores and planned list items follow, and their private copy is closed.
// A suggestion for a shop that's already shared moves on the next run.
//
//   SUPABASE_DB_URL=… node --experimental-strip-types scripts/seed/promote-suggestions.ts \
//     [--min-people N] [--apply]
//
// Without --apply it runs everything in a transaction and rolls it back: the same
// counts, nothing written. Run by .github/workflows/shared-branches.yml (nightly, with
// the repo variable SHARED_BRANCHES_MIN_PEOPLE); see docs/compare-data.md.
//
// The log is public (Actions): it prints counts and the names of shops that became
// shared, never who suggested what.
import { appendFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { lastJson, psql } from '../import/db.ts';

/** People needed for a new shared shop, unless --min-people says otherwise. */
const DEFAULT_MIN_PEOPLE = 3;
/** Most new shared shops in one run (the rest wait for the next). */
const MAX_NEW = 5;
/** An account counts once it's this old … */
const ACCOUNT_DAYS = 7;
/** … and so is the shop it suggests … */
const SHOP_DAYS = 7;
/** … with prices for this many products there … */
const MIN_PRODUCTS = 3;
/** … seen in this many days (also how far back prices are copied). */
const WINDOW_DAYS = 60;
/** A suggestion waits this long before it moves (time to withdraw a mistake). */
const COOL_HOURS = 24;

interface Result {
  open: number;
  groups: number;
  waiting: number;
  capped: number;
  attached: number;
  created: number;
  declined: number;
  moved: number;
  prices_copied: number;
  prices_held: number;
  picks_swapped: number;
  plan_items: number;
  removed: number;
  new_shops: string[];
}

function fail(msg: string): never {
  console.error(`promote-suggestions: ${msg}`);
  process.exit(1);
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

const here = resolve(import.meta.dirname);
const apply = process.argv.includes('--apply');
const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) fail('SUPABASE_DB_URL must be set');

const minRaw = (arg('min-people') ?? '').trim() || String(DEFAULT_MIN_PEOPLE);
if (!/^\d{1,2}$/.test(minRaw) || Number(minRaw) < 2 || Number(minRaw) > 50) fail('--min-people must be a whole number from 2 to 50');
const minPeople = Number(minRaw);

const vars: Record<string, string | number> = {
  min_people: minPeople,
  max_new: MAX_NEW,
  account_days: ACCOUNT_DAYS,
  shop_days: SHOP_DAYS,
  min_products: MIN_PRODUCTS,
  window_days: WINDOW_DAYS,
  cool_hours: COOL_HOURS,
  commit: apply ? 'on' : 'off',
};
const out = await psql(dbUrl as string, [...Object.entries(vars).flatMap(([k, v]) => ['-v', `${k}=${v}`]), '-f', join(here, 'promote-suggestions.sql')]).catch(
  (e: Error) => fail(e.message),
);
const r = lastJson<Result>(out);
if (!r || typeof r.open !== 'number') fail('no result from the database');

const lines = [
  apply ? 'Shared shops' : 'Shared shops (dry run — rolled back, nothing written)',
  `Open suggestions: ${r.open} for ${r.groups} shop(s) · waiting: ${r.waiting}${r.capped ? ` · ${r.capped} more ready (next run)` : ''}`,
  `New shared shops: ${r.created} · moved into a shared shop: ${r.moved} (${r.attached} already shared) · declined: ${r.declined}`,
  `Prices copied: ${r.prices_copied} (${r.prices_held} held for a check) · My stores swapped: ${r.picks_swapped} · list items re-pointed: ${r.plan_items} · removed (shop deleted or now online): ${r.removed}`,
  ...r.new_shops.map((n) => `  + ${n}`),
];
console.log(lines.join('\n'));
const summary = process.env.GITHUB_STEP_SUMMARY;
if (summary) appendFileSync(summary, `### ${lines[0]}\n\n${lines.slice(1).map((l) => (l.startsWith('  + ') ? `- ${l.slice(4)}` : `${l}  `)).join('\n')}\n`);
