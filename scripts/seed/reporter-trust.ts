// Reporter trust (nightly): how much each person's prices count, from how often they
// agree with other people's (0.5–1.2; 1 until there are enough to compare). The
// weights live in spendless.reporter_trust, which no client can read, and the price
// trigger multiplies a person's report weights by theirs. Rules: reporter-trust.sql.
//
//   SUPABASE_DB_URL=… node --experimental-strip-types scripts/seed/reporter-trust.ts [--apply]
//
// Without --apply it runs in a transaction and rolls back (same counts, nothing
// written). Run by .github/workflows/reporter-trust.yml. The log is public: counts only.
import { appendFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { lastJson, psql } from '../import/db.ts';

/** How far back prices are compared. */
const WINDOW_DAYS = 90;
/** Comparable prices needed before a weight moves from 1. */
const MIN_COMPARED = 5;

interface Result {
  people: number;
  compared: number;
  rated: number;
  above: number;
  below: number;
  changed: number;
  reset: number;
}

function fail(msg: string): never {
  console.error(`reporter-trust: ${msg}`);
  process.exit(1);
}

const apply = process.argv.includes('--apply');
const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) fail('SUPABASE_DB_URL must be set');

const vars: Record<string, string | number> = { window_days: WINDOW_DAYS, min_compared: MIN_COMPARED, commit: apply ? 'on' : 'off' };
const here = resolve(import.meta.dirname);
const out = await psql(dbUrl as string, [...Object.entries(vars).flatMap(([k, v]) => ['-v', `${k}=${v}`]), '-f', join(here, 'reporter-trust.sql')]).catch((e: Error) =>
  fail(e.message),
);
const r = lastJson<Result>(out);
if (!r || typeof r.people !== 'number') fail('no result from the database');

const lines = [
  apply ? 'Reporter trust' : 'Reporter trust (dry run — rolled back, nothing written)',
  `People with prices at shared stores: ${r.people} · prices compared: ${r.compared} · with enough to rate: ${r.rated}`,
  `Counting more: ${r.above} · counting less: ${r.below} · weights changed: ${r.changed} · back to default: ${r.reset}`,
];
console.log(lines.join('\n'));
const summary = process.env.GITHUB_STEP_SUMMARY;
if (summary) appendFileSync(summary, `### ${lines[0]}\n\n${lines.slice(1).join('  \n')}\n`);
