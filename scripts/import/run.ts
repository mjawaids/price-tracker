// Daily store price import: read each online store's public listings politely, turn
// them into catalogue products and system price reports, one transaction per store.
//
//   SUPABASE_DB_URL=… node --experimental-strip-types scripts/import/run.ts [--source <id>|all] [--max-pages N]
//   node --experimental-strip-types scripts/import/run.ts --dry-run [--source <id>|all] [--max-pages N]
//
// A dry run fetches and parses but never touches the database. Run daily by
// .github/workflows/price-import.yml; sources and their rules: docs/data-sources.md.
// The log is public (GitHub Actions): counts and a short sample of store listings only.
import { randomUUID } from 'node:crypto';
import { learnBrands } from '../../src/lib/compare/productName.ts';
import { blinkPages } from './adapters/blink-pages.ts';
import { hydri } from './adapters/hydri.ts';
import { imtiazMenu } from './adapters/imtiaz-menu.ts';
import { magentoGraphql } from './adapters/magento-graphql.ts';
import type { AdapterContext, AdapterResult, KnownListing } from './adapters/types.ts';
import { lastJson, runFile, runWithJson } from './db.ts';
import { Blocked, CapReached, PoliteClient } from './http.ts';
import { refreshMatchKeys } from './keys.ts';
import { normalize, type Normalized } from './normalize.ts';
import { SOURCES, type Source } from './sources.ts';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

const dryRun = process.argv.includes('--dry-run');
const which = (arg('source') ?? 'all').trim();
const maxPagesArg = arg('max-pages');
const maxPages = maxPagesArg ? Number(maxPagesArg) : null;
const dbUrl = process.env.SUPABASE_DB_URL ?? '';
// Readers stop after this long and keep what they read; the workflow's timeout is 300 minutes.
const READ_BUDGET_MS = 240 * 60_000;
const startedRun = Date.now();

function fail(msg: string): never {
  console.error(`import: ${msg}`);
  process.exit(1);
}

if (maxPages != null && !(Number.isInteger(maxPages) && maxPages > 0)) fail('--max-pages must be a positive whole number');
const chosen = which === 'all' ? SOURCES.filter((s) => !s.paused) : SOURCES.filter((s) => s.id === which);
if (!chosen.length) fail(`unknown --source "${which}" (one of: all, ${SOURCES.map((s) => s.id).join(', ')})`);
if (!dryRun && !dbUrl) fail('SUPABASE_DB_URL must be set (or use --dry-run)');

interface Outcome {
  source: string;
  status: AdapterResult['status'] | 'failed';
  summary: string;
}

async function adapterFor(src: Source, ctx: AdapterContext): Promise<AdapterResult> {
  const a = src.adapter;
  switch (a.kind) {
    case 'magento-graphql':
      return magentoGraphql(ctx, a.options);
    case 'hydri':
      return hydri(ctx);
    case 'imtiaz-menu':
      return imtiazMenu(ctx, a.options);
    case 'blink-pages':
      return blinkPages(ctx, a.options);
  }
}

const pct = (n: number, of: number) => `${Math.round((n / Math.max(1, of)) * 100)}%`;

async function runSource(src: Source): Promise<Outcome> {
  const startedAt = new Date().toISOString();
  const log = (s: string) => console.log(`[${src.id}] ${s}`);
  const cap = Math.min(src.maxPages, maxPages ?? Infinity);

  // What we already know (rolling refresh) and the catalogue's brands.
  let known = new Map<string, KnownListing>();
  let dbBrands: string[] = [];
  if (!dryRun) {
    const read = lastJson<{
      listings: { id: string; url: string | null; included: boolean; active: boolean; checked_at: string; name: string | null; category: string | null }[];
      brands: string[];
    }>(
      await runFile(dbUrl, 'read.sql', { store_id: src.store.id }),
    );
    known = new Map(
      read.listings.map((l) => [
        l.id,
        { url: l.url, included: l.included, active: l.active, checkedAt: l.checked_at, sourceName: l.name, sourceCategory: l.category },
      ]),
    );
    dbBrands = read.brands;
  }

  // Adapters stop at `cap` content pages; the client's hard limit leaves room for robots.txt and sitemaps.
  const http = new PoliteClient(src.store.website, { maxRequests: cap + 100 });
  let result: AdapterResult;
  try {
    await http.init(log);
    result = await adapterFor(src, { http, log, maxPages: cap, known, deadline: startedRun + READ_BUDGET_MS });
  } catch (e) {
    if (e instanceof Blocked) result = { listings: [], gone: [], full: false, status: 'blocked', note: e.code };
    else if (e instanceof CapReached) result = { listings: [], gone: [], full: false, status: 'partial', note: 'request-cap' };
    else throw e;
  }

  // Parse names into products.
  const brands = [...dbBrands, ...learnBrands(result.listings.map((l) => l.name))];
  const rows = result.listings.map((l) => normalize(l, brands)).filter((n): n is Normalized => n != null);
  // A key shared by two differently named listings of one store isn't specific enough
  // to trust: those listings don't match on it. Two listings with the exact same name
  // (case and spaces aside) are the store listing one item twice: they keep the key
  // and share a product (write.sql).
  const byKey = new Map<string, Set<string>>();
  for (const r of rows) {
    const k = r.product?.match_key;
    if (k) byKey.set(k, (byKey.get(k) ?? new Set()).add(r.source_name.toLowerCase()));
  }
  let collisions = 0;
  for (const r of rows) {
    if (r.product?.match_key && byKey.get(r.product.match_key)!.size > 1) {
      r.product.match_key = '';
      collisions++;
    }
  }
  if (collisions) log(`${collisions} listings share a match key with another listing here; matched on their own`);
  const included = rows.filter((r) => r.included);
  const keyed = included.filter((r) => r.product?.match_key);
  const typed = included.filter((r) => r.product?.item_type);
  const sized = included.filter((r) => r.product?.size_value);
  const inStock = included.filter((r) => r.available);

  // Never treat a thin read as the whole catalogue (a site glitch would mark everything gone).
  const knownActive = [...known.values()].filter((k) => k.active && k.included).length;
  let full = result.full && result.status === 'ok' && rows.length > 0;
  if (full && rows.length < knownActive * 0.5) {
    full = false;
    result.note = result.note ?? 'shrunk';
  }

  const summary =
    `${rows.length} listings · ${included.length} imported (${inStock.length} in stock) · ${rows.length - included.length} left out` +
    ` · type ${pct(typed.length, included.length)} · size ${pct(sized.length, included.length)} · match key ${pct(keyed.length, included.length)}` +
    ` · ${result.gone.length} gone · ${http.requests} requests · ${result.status}${result.note ? ` (${result.note})` : ''}`;
  log(summary);
  if (result.status === 'blocked') console.log(`::warning::${src.id}: the store refused us (${result.note}); stopped for today.`);

  if (dryRun) {
    for (const r of included.slice(0, 6)) {
      log(`  ✓ ${r.source_name} · Rs ${r.price} · ${r.product?.category ?? '?'} · ${r.product?.match_key || '(no key)'}`);
    }
    const outAisles = new Map<string, number>();
    for (const r of rows.filter((x) => !x.included)) outAisles.set(r.source_category ?? '(none)', (outAisles.get(r.source_category ?? '(none)') ?? 0) + 1);
    const top = [...outAisles].sort((a, b) => b[1] - a[1]).slice(0, 6);
    if (top.length) log(`  left out: ${top.map(([a, n]) => `${a} (${n})`).join(' · ')}`);
    return { source: src.id, status: result.status, summary };
  }

  const seenIds = new Set(rows.map((r) => r.external_id));
  const batch = {
    store: src.store,
    run: { source: src.id, started_at: startedAt, status: result.status, pages: http.requests, note: result.note ?? '' },
    full,
    rows: [
      ...rows.map((r) => ({
        external_id: r.external_id,
        url: r.url,
        source_name: r.source_name,
        source_category: r.source_category,
        included: r.included,
        price: r.price,
        available: r.available,
        gone: false,
        new_product_id: r.included ? randomUUID() : null,
        ...(r.product ?? {}),
      })),
      ...result.gone.filter((id) => !seenIds.has(id)).map((id) => ({ external_id: id, gone: true })),
    ],
  };
  const out = lastJson<Record<string, number>>(await runWithJson(dbUrl, 'write.sql', 'batch.json', batch));
  log(`written: ${Object.entries(out).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
  return { source: src.id, status: result.status, summary };
}

async function main() {
  console.log(`${dryRun ? 'Dry run' : 'Import'}: ${chosen.map((s) => s.id).join(', ')}${maxPages ? ` · max ${maxPages} pages each` : ''}`);
  if (which === 'all') for (const s of SOURCES.filter((x) => x.paused)) console.log(`[${s.id}] paused: ${s.paused}`);
  if (!dryRun) console.log(await refreshMatchKeys(dbUrl));

  // Different sites, so they run side by side; each one is polite on its own and
  // a failure in one doesn't stop the others.
  const outcomes = await Promise.all(
    chosen.map(async (src): Promise<Outcome> => {
      const startedAt = new Date().toISOString();
      try {
        return await runSource(src);
      } catch (e) {
        const note = (e instanceof Error ? e.message : String(e)).slice(0, 200);
        console.log(`::error::${src.id}: ${note}`);
        if (!dryRun) {
          await runFile(dbUrl, 'failed.sql', { source: src.id, started_at: startedAt, note }).catch(() => {});
        }
        return { source: src.id, status: 'failed', summary: note };
      }
    }),
  );

  console.log('\nSummary');
  for (const o of outcomes) console.log(`  ${o.source.padEnd(11)} ${o.status.padEnd(8)} ${o.summary}`);
  if (outcomes.some((o) => o.status === 'failed')) process.exit(1);
}

await main();
