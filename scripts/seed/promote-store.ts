// Make one private store — and its owner's products priced there — public, with
// the owner's consent. Used once to seed Karachi with the existing Panda Mart import.
//
//   SUPABASE_DB_URL=… node --experimental-strip-types scripts/seed/promote-store.ts \
//     --store-id <uuid> --region karachi --chain "Panda Mart" [--apply]
//
// Without --apply it only reads, parses and reports (nothing is written).
// Run through .github/workflows/catalog-jobs.yml (manual) — see docs/compare-data.md.
//
// Product names are parsed into brand / item type / variant / size here, in TS
// (src/lib/compare), and sent to a fixed SQL file as one JSON value; no SQL is
// built from strings.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { learnBrands, parseProductName } from '../../src/lib/compare/productName.ts';
import { resolveCategory, CATEGORIES } from '../../src/lib/categories.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9-]{2,40}$/;
const CHAIN = /^[\p{L}\p{N} &'().-]{1,60}$/u;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

const storeId = arg('store-id') ?? '';
const region = arg('region') ?? 'karachi';
const chain = (arg('chain') ?? '').trim();
const apply = process.argv.includes('--apply');
const dbUrl = process.env.SUPABASE_DB_URL;

if (!UUID.test(storeId)) fail('--store-id must be a store uuid');
if (!SLUG.test(region)) fail('--region must be a region id like "karachi"');
if (!CHAIN.test(chain)) fail('--chain must be 1–60 letters, digits, spaces or & \' ( ) . -');
if (!dbUrl) fail('SUPABASE_DB_URL must be set');

function fail(msg: string): never {
  console.error(`promote-store: ${msg}`);
  process.exit(1);
}

const here = resolve(import.meta.dirname);
const psql = (args: string[], cwd?: string) =>
  execFileSync('psql', [dbUrl!, '-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1', ...args], {
    cwd,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });

// ── Read ─────────────────────────────────────────────────────────────────────
interface Row {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
}
const read = JSON.parse(psql(['-v', `store_id=${storeId}`, '-f', join(here, 'promote-store-read.sql')])) as {
  store: { id: string; owner_id: string | null; name: string; kind: string; region_id: string | null } | null;
  products: Row[];
};
if (!read.store) fail(`no store ${storeId}`);
if (!read.store.owner_id) {
  console.log(`"${read.store.name}" is already public — nothing to do.`);
  process.exit(0);
}
console.log(`Store: ${read.store.name} (${read.store.kind}) → public in ${region}, chain "${chain}"`);
console.log(`Products priced there: ${read.products.length}`);

// ── Parse ────────────────────────────────────────────────────────────────────
// The store's own category names → our canonical category ids (hints for parsing).
const STORE_CATEGORY: Record<string, string> = {
  'fruits & vegetables': 'fruits-veg', 'meat & seafood': 'meat', 'dairy products': 'dairy',
  'bakery & breakfast': 'bakery', 'everyday grocery': 'grains', 'oil & ghee': 'cooking-oil',
  'spices & dressings': 'spices', 'noodles & pasta': 'grains', 'ice cream & frozen': 'frozen',
  'ready to cook & eat': 'frozen', 'snacks & confectionery': 'snacks', 'chocolate & desserts': 'snacks',
  'tea & coffee': 'beverages', 'beverages': 'beverages', 'mother & baby': 'baby', 'pharmacy': 'pharmacy',
  'health & pharmacy': 'pharmacy', 'personal care': 'personal-care', 'cosmetics & fragrances': 'personal-care',
  'cleaning & laundry': 'household', 'household essentials': 'household',
};
const canonical = new Set(CATEGORIES.map((c) => c.id));
const hintFor = (category: string | null) => {
  if (!category) return null;
  const mapped = STORE_CATEGORY[category.trim().toLowerCase()];
  if (mapped) return mapped;
  const r = resolveCategory(category);
  return canonical.has(r.id) ? r.id : null;
};

const brands = learnBrands(read.products.map((p) => p.name));
const out = read.products.map((p) => {
  const hint = hintFor(p.category);
  const parsed = parseProductName(p.name, { categoryHint: hint, brands });
  return {
    row: p,
    parsed,
    data: {
      id: p.id,
      name: parsed.name.slice(0, 160),
      brand: (p.brand?.trim() || parsed.brand)?.slice(0, 60) ?? null,
      variant: parsed.variant,
      item_type: parsed.itemType?.id ?? null,
      category: parsed.itemType?.category ?? hint ?? p.category,
      size_value: parsed.size?.value ?? null,
      size_unit: parsed.size?.unit ?? null,
      pack_count: parsed.size?.pack ?? 1,
    },
  };
});

const pct = (n: number) => `${Math.round((n / Math.max(1, out.length)) * 100)}%`;
const typed = out.filter((o) => o.parsed.itemType).length;
const sized = out.filter((o) => o.parsed.size).length;
const branded = out.filter((o) => o.data.brand).length;
const high = out.filter((o) => o.parsed.confidence >= 0.7).length;
console.log(`Learned brands: ${brands.length}`);
console.log(`Item type found: ${typed} (${pct(typed)}) · size: ${sized} (${pct(sized)}) · brand: ${branded} (${pct(branded)})`);
console.log(`High confidence (≥ 0.7): ${high} (${pct(high)})`);
console.log('Sample without an item type:');
for (const o of out.filter((x) => !x.parsed.itemType).slice(0, 15)) console.log(`  - ${o.row.name} [${o.row.category ?? ''}]`);

if (!apply) {
  console.log('\nDry run — nothing written. Re-run with --apply to make it public.');
  process.exit(0);
}

// ── Write (one transaction) ──────────────────────────────────────────────────
const dir = mkdtempSync(join(tmpdir(), 'spendless-promote-'));
try {
  writeFileSync(join(dir, 'data.json'), JSON.stringify(out.map((o) => o.data)));
  const result = psql(
    [
      '--single-transaction',
      '-v', `store_id=${storeId}`,
      '-v', `region=${region}`,
      '-v', `chain=${chain}`,
      '-f', join(here, 'promote-store-write.sql'),
    ],
    dir,
  ).trim();
  const [products, prices] = result.split('\n').pop()!.split('|');
  console.log(`\nDone: ${products} public products, ${prices} current prices at ${read.store.name}.`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
