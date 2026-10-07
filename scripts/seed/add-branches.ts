// Add or update a city's public in-store branches from a reviewed list file
// (scripts/seed/branches/<city>.json, taken from each chain's own website).
//
//   SUPABASE_DB_URL=… node --experimental-strip-types scripts/seed/add-branches.ts \
//     [--file scripts/seed/branches/karachi.json] [--apply]
//
// Without --apply it only reads and reports what would change (nothing is written).
// Run through .github/workflows/catalog-jobs.yml (manual, job "add-branches") — see
// docs/compare-data.md. Branches keep fixed ids, so a re-run updates them in place.
// It never deletes: a branch that closed gets "status": "closed" in the file. It never
// touches a private store or an online store, even if an id collides.
//
// The list goes to fixed SQL files as one JSON value; no SQL is built from strings.
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { lastJson, psql } from '../import/db.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9-]{2,40}$/;
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f]/;
const STATUSES = new Set(['active', 'closed']);
const MAX_BRANCHES = 500;

interface Branch {
  id: string;
  chain: string;
  area: string;
  name: string;
  address: string | null;
  phone: string | null;
  status: 'active' | 'closed';
}
interface ListFile {
  region: string;
  city: string;
  branches: Branch[];
}
interface StoreRow {
  id: string;
  name: string;
  chain: string | null;
  kind: 'online' | 'physical';
  address: string | null;
  phone: string | null;
  status: string;
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

function fail(msg: string): never {
  console.error(`add-branches: ${msg}`);
  process.exit(1);
}

const here = resolve(import.meta.dirname);
const repo = resolve(here, '../..');
const apply = process.argv.includes('--apply');
const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) fail('SUPABASE_DB_URL must be set');

// ── The list file (only from scripts/seed/branches/) ─────────────────────────
const branchesDir = realpathSync(join(here, 'branches'));
let file: string;
try {
  file = realpathSync(resolve(repo, arg('file') ?? 'scripts/seed/branches/karachi.json'));
} catch {
  fail('--file not found');
}
if (!file.startsWith(branchesDir + sep) || !file.endsWith('.json')) fail('--file must be a .json file in scripts/seed/branches/');

const text = (v: unknown, max: number, what: string, nullable = false): string | null => {
  if (v == null && nullable) return null;
  if (typeof v !== 'string') fail(`${what} must be text`);
  const t = v.replace(/\s+/g, ' ').trim();
  if (!t) {
    if (nullable) return null;
    fail(`${what} is empty`);
  }
  if (t.length > max) fail(`${what} is longer than ${max} characters`);
  if (CONTROL.test(t)) fail(`${what} has control characters`);
  return t;
};

let raw: unknown;
try {
  raw = JSON.parse(readFileSync(file, 'utf8'));
} catch {
  fail('the list file is not valid JSON');
}
const doc = raw as Partial<ListFile>;
const region = typeof doc.region === 'string' && SLUG.test(doc.region) ? doc.region : fail('"region" must be a city id like "karachi"');
const city = text(doc.city, 60, '"city"') as string;
if (!Array.isArray(doc.branches) || !doc.branches.length || doc.branches.length > MAX_BRANCHES) {
  fail(`"branches" must list 1–${MAX_BRANCHES} branches`);
}
const ids = new Set<string>();
const names = new Set<string>();
const branches: Branch[] = doc.branches.map((b, i) => {
  const at = `branch ${i + 1}`;
  if (!b || typeof b !== 'object') fail(`${at} must be an object`);
  if (typeof b.id !== 'string' || !UUID.test(b.id)) fail(`${at}: "id" must be a uuid`);
  const id = b.id.toLowerCase();
  if (ids.has(id)) fail(`${at}: id ${id} is listed twice`);
  ids.add(id);
  const name = text(b.name, 80, `${at} "name"`) as string;
  if (names.has(name.toLowerCase())) fail(`${at}: name "${name}" is listed twice`);
  names.add(name.toLowerCase());
  const status = b.status ?? 'active';
  if (!STATUSES.has(status)) fail(`${at}: "status" must be "active" or "closed"`);
  return {
    id,
    chain: text(b.chain, 60, `${at} "chain"`) as string,
    area: text(b.area, 80, `${at} "area"`) as string,
    name,
    address: text(b.address, 200, `${at} "address"`, true),
    phone: text(b.phone, 40, `${at} "phone"`, true),
    status,
  };
});

// ── Read the city's public stores (and any store already using these ids) ────
async function withJson<T>(sqlFile: string, data: unknown, vars: Record<string, string>, tx: boolean): Promise<T> {
  const dir = mkdtempSync(join(tmpdir(), 'spendless-branches-'));
  try {
    writeFileSync(join(dir, 'data.json'), JSON.stringify(data));
    const v = Object.entries(vars).flatMap(([k, val]) => ['-v', `${k}=${val}`]);
    const out = await psql(dbUrl as string, [...(tx ? ['--single-transaction'] : []), ...v, '-f', join(here, sqlFile)], dir);
    return lastJson<T>(out);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const read = await withJson<{
  region: { id: string; name: string } | null;
  stores: StoreRow[];
  taken: { id: string; kind: string; private: boolean; region_id: string | null }[];
}>('add-branches-read.sql', branches.map((b) => ({ id: b.id })), { region }, false).catch((e: Error) => fail(e.message));

if (!read.region) fail(`no city "${region}" in spendless.regions`);
for (const t of read.taken) {
  if (t.private) fail(`id ${t.id} belongs to a private store — pick another id`);
  if (t.kind !== 'physical') fail(`id ${t.id} belongs to an online store — pick another id`);
  if (t.region_id !== region) fail(`id ${t.id} is a branch in another city (${t.region_id ?? 'none'})`);
}
// A branch belongs to a chain that already sells online here (its prices sit beside it).
const chains = new Set(read.stores.filter((s) => s.kind === 'online' && s.chain).map((s) => s.chain as string));
for (const b of branches) {
  if (!chains.has(b.chain)) fail(`"${b.name}": chain "${b.chain}" has no public online store in ${region} (known: ${[...chains].join(', ') || 'none'})`);
}

// ── Report ───────────────────────────────────────────────────────────────────
const existing = new Map(read.stores.filter((s) => s.kind === 'physical').map((s) => [s.id, s]));
const fields = ['name', 'chain', 'address', 'phone', 'status'] as const;
const added: Branch[] = [];
const changed: { b: Branch; what: string[] }[] = [];
let same = 0;
for (const b of branches) {
  const s = existing.get(b.id);
  if (!s) {
    added.push(b);
    continue;
  }
  const what = fields.filter((f) => (s[f] ?? null) !== (b[f] ?? null));
  if (what.length) changed.push({ b, what });
  else same++;
}
const notListed = [...existing.values()].filter((s) => !ids.has(s.id));

console.log(`City: ${read.region.name} (${region}) · list: ${branches.length} branches (${file.slice(repo.length + 1)})`);
for (const chain of [...new Set(branches.map((b) => b.chain))]) {
  const n = branches.filter((b) => b.chain === chain);
  console.log(`  ${chain}: ${n.length} (${n.filter((b) => b.address).length} with an address, ${n.filter((b) => b.status === 'closed').length} closed)`);
}
console.log(`New: ${added.length} · changed: ${changed.length} · unchanged: ${same}`);
for (const b of added) console.log(`  + ${b.name}${b.address ? ` — ${b.address}` : ''}${b.status === 'closed' ? ' (closed)' : ''}`);
for (const c of changed) console.log(`  ~ ${c.b.name}: ${c.what.join(', ')}`);
if (notListed.length) {
  console.log(`Public branches here that aren't in the list (left as they are): ${notListed.length}`);
  for (const s of notListed) console.log(`  · ${s.name} [${s.status}]`);
}

if (!apply) {
  console.log('\nDry run — nothing written. Re-run with --apply to write.');
  process.exit(0);
}
if (!added.length && !changed.length) {
  console.log('\nNothing to write.');
  process.exit(0);
}

// ── Write (one transaction) ──────────────────────────────────────────────────
const result = await withJson<{ inserted: number; updated: number }>(
  'add-branches-write.sql',
  branches.map(({ id, chain, name, address, phone, status }) => ({ id, chain, name, address, phone, status })),
  { region, city },
  true,
).catch((e: Error) => fail(e.message));
console.log(`\nDone: ${result.inserted} added, ${result.updated} updated in ${read.region.name}.`);
