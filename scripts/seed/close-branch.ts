// Undo a shared in-store shop (one made from suggestions, or any shared branch):
// close it and give everyone who moved into it their own shop back.
//
//   SUPABASE_DB_URL=… node --experimental-strip-types scripts/seed/close-branch.ts \
//     --store-id <catalog_stores.id> [--apply]
//
// Without --apply it runs in a transaction and rolls back (same counts, nothing
// written). Run through .github/workflows/catalog-jobs.yml (job "close-branch"); see
// docs/deployment.md. The nightly job then never makes the same shop again.
import { join, resolve } from 'node:path';
import { lastJson, psql } from '../import/db.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(msg: string): never {
  console.error(`close-branch: ${msg}`);
  process.exit(1);
}

const i = process.argv.indexOf('--store-id');
const storeId = (i > 0 ? process.argv[i + 1] : '')?.trim().toLowerCase() ?? '';
if (!UUID.test(storeId)) fail('--store-id must be a store id (uuid)');
const apply = process.argv.includes('--apply');
const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) fail('SUPABASE_DB_URL must be set');

const here = resolve(import.meta.dirname);
const out = await psql(dbUrl, ['-v', `store_id=${storeId}`, '-v', `commit=${apply ? 'on' : 'off'}`, '-f', join(here, 'close-branch.sql')]).catch((e: Error) =>
  fail(e.message),
);
const r = lastJson<{ name: string; moved_back: number; reopened: number; picks: number; plan_items: number; declined: number }>(out);
if (!r || typeof r.moved_back !== 'number') fail('no result from the database');
console.log(
  [
    `${apply ? 'Closed' : 'Would close (dry run — rolled back, nothing written)'}: ${r.name}`,
    `People given their own shop back: ${r.moved_back} (${r.reopened} reopened) · My stores: ${r.picks} · list items: ${r.plan_items} · suggestions declined: ${r.declined}`,
  ].join('\n'),
);
