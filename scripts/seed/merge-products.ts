// Duplicate public products: merge them, list the likely ones, or undo a merge.
//
//   SUPABASE_DB_URL=… node --experimental-strip-types scripts/seed/merge-products.ts --auto [--apply]
//     The safe merges (same name and size, prices within 25%) and junk names retired.
//     Runs nightly after the price import (.github/workflows/price-import.yml).
//   … merge-products.ts --list
//     The review list: likely duplicates the nightly rule leaves alone. Read only.
//   … merge-products.ts --pairs "<from id>><into id> …" [--apply]
//     Merges the owner approved from that list (at most 50).
//   … merge-products.ts --undo <product id> [--apply]
//     Undoes that product's merge and keeps the pair apart from then on.
//
// Without --apply a merge or undo runs in a transaction and rolls back (same counts,
// nothing written). The manual ones run through .github/workflows/catalog-jobs.yml
// (jobs "merge-products" and "unmerge-product"); see docs/deployment.md.
import { appendFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { psql } from '../import/db.ts';

/** Prices "close" for a merge without review: the dearer at most this × the cheaper. */
const MAX_RATIO = 1.25;
const MAX_PAIRS = 50;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function fail(msg: string): never {
  console.error(`merge-products: ${msg}`);
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

const modes = ['auto', 'list', 'pairs', 'undo'].filter((m) => process.argv.includes(`--${m}`));
if (modes.length !== 1) fail('pick one of --auto, --list, --pairs "<from>><into> …", --undo <product id>');
const mode = modes[0];

/** Every JSON line psql printed, merged into one object (each SQL step prints its own). */
function results(out: string): Record<string, unknown> {
  const all: Record<string, unknown> = {};
  for (const line of out.split('\n')) {
    const t = line.trim();
    if (!t.startsWith('{') && !t.startsWith('[')) continue;
    const v = JSON.parse(t) as unknown;
    if (Array.isArray(v)) all.rows = v;
    else Object.assign(all, v);
  }
  return all;
}

async function run(file: string, vars: Record<string, string>, json?: { name: string; data: unknown }) {
  const dir = json ? mkdtempSync(join(tmpdir(), 'spendless-merge-')) : undefined;
  try {
    if (dir && json) writeFileSync(join(dir, json.name), JSON.stringify(json.data));
    const v = Object.entries(vars).flatMap(([k, val]) => ['-v', `${k}=${val}`]);
    return results(await psql(dbUrl as string, [...v, '-f', join(here, file)], dir).catch((e: Error) => fail(e.message)));
  } finally {
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
}

const n = (v: unknown) => (typeof v === 'number' ? v : 0);
const commit = apply ? 'on' : 'off';
const dry = apply ? '' : ' (dry run — rolled back, nothing written)';
let lines: string[] = [];

if (mode === 'auto') {
  const r = await run('merge-auto.sql', { commit, max_ratio: String(MAX_RATIO) });
  lines = [
    `Duplicate products${dry}`,
    `Merged (same name and size, prices within ${Math.round((MAX_RATIO - 1) * 100)}%): ${n(r.merged)} · junk names retired: ${n(r.retired)}`,
    `Moved: ${n(r.listings)} store listings · ${n(r.items)} list items · ${n(r.preferences)} usuals · prices copied: ${n(r.copies)} · marked out of stock: ${n(r.marked)}`,
  ];
} else if (mode === 'list') {
  type Row = {
    kind: string; from_id: string; into_id: string; from_name: string; into_name: string;
    from_stores: string | null; into_stores: string | null; from_price: number | null; into_price: number | null;
    ratio: number | null; clash: boolean;
  };
  const r = await run('merge-list.sql', { max_ratio: String(MAX_RATIO) });
  const rows = (r.rows ?? []) as Row[];
  const price = (p: number | null) => (p == null ? '—' : `Rs ${p}`);
  const cell = (s: string | null) => (s ?? '—').replace(/\|/g, '/');
  lines = [
    'Likely duplicates for review',
    `${rows.length} pair(s)${rows.length >= 200 ? ' (the first 200)' : ''}. To merge some, run this job again with "merges" set to their ids (from>into), e.g. ${rows[0] ? `${rows[0].from_id}>${rows[0].into_id}` : '<from>><into>'}.`,
    ...rows.map(
      (x) =>
        `  ${x.kind === 'name' ? 'same name' : 'same key'}${x.clash ? ' · pack differs' : ''} · ${x.from_name} (${cell(x.from_stores)}, ${price(x.from_price)}) → ${x.into_name} (${cell(x.into_stores)}, ${price(x.into_price)})${x.ratio ? ` · ${x.ratio}×` : ''}\n    ${x.from_id}>${x.into_id}`,
    ),
  ];
  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (summary) {
    appendFileSync(
      summary,
      [
        `### ${lines[0]}`,
        '',
        lines[1],
        '',
        '| Why | Merge this | Into this | Prices | from>into |',
        '|---|---|---|---|---|',
        ...rows.map(
          (x) =>
            `| ${x.kind === 'name' ? 'same name' : 'same key'}${x.clash ? ', pack differs' : ''} | ${cell(x.from_name)} (${cell(x.from_stores)}) | ${cell(x.into_name)} (${cell(x.into_stores)}) | ${price(x.from_price)} · ${price(x.into_price)} | \`${x.from_id}>${x.into_id}\` |`,
        ),
        '',
      ].join('\n'),
    );
  }
  console.log(lines.join('\n'));
  process.exit(0);
} else if (mode === 'pairs') {
  const raw = (arg('pairs') ?? '').trim().toLowerCase();
  const items = raw.split(/[\s,;]+/).filter(Boolean);
  if (!items.length) fail('--pairs needs "<from id>><into id>" pairs');
  if (items.length > MAX_PAIRS) fail(`at most ${MAX_PAIRS} pairs at a time`);
  const pairs = items.map((it) => {
    const [from, into, extra] = it.split('>');
    if (extra !== undefined || !UUID.test(from ?? '') || !UUID.test(into ?? '') || from === into) fail(`not a pair of two product ids: ${it.slice(0, 80)}`);
    return { from, into };
  });
  const r = await run('merge-pairs.sql', { commit }, { name: 'pairs.json', data: pairs });
  const asked = (r.asked ?? []) as { from: string | null; from_status: string | null; into: string | null; into_status: string | null }[];
  lines = [
    `Approved merges${dry}`,
    `Asked: ${pairs.length} · merged: ${n(r.merged)} (a pair is skipped when either product isn't a public, active one)`,
    `Moved: ${n(r.listings)} store listings · ${n(r.items)} list items · ${n(r.preferences)} usuals · prices copied: ${n(r.copies)} · marked out of stock: ${n(r.marked)}`,
    ...asked.map((a) => `  ${a.from ?? '(not a public product)'}${a.from_status && a.from_status !== 'active' ? ` [${a.from_status}]` : ''} → ${a.into ?? '(not a public product)'}${a.into_status && a.into_status !== 'active' ? ` [${a.into_status}]` : ''}`),
  ];
} else {
  const id = (arg('undo') ?? '').trim().toLowerCase();
  if (!UUID.test(id)) fail('--undo needs the merged product id (uuid)');
  const r = await run('unmerge.sql', { commit, product_id: id });
  lines = [
    `Undo a merge${dry}`,
    `${r.product} is its own product again (it had been merged into ${r.was_merged_into}); the two are kept apart from now on.`,
    `Moved back: ${n(r.listings)} store listings · ${n(r.items)} list items · ${n(r.preferences)} usuals · ${n(r.chained)} earlier merges · copied prices deleted: ${n(r.copies_deleted)}`,
  ];
}

console.log(lines.join('\n'));
const summary = process.env.GITHUB_STEP_SUMMARY;
if (summary) appendFileSync(summary, `### ${lines[0]}\n\n${lines.slice(1).map((l) => (l.startsWith('  ') ? `- ${l.trim()}` : `${l}  `)).join('\n')}\n`);
