// Match keys for public products that no imported listing keys (see refreshMatchKeys).
// Run by run.ts before the stores, so listings are matched against current keys.
import { learnBrands, parseProductName } from '../../src/lib/compare/productName.ts';
import { lastJson, runFile, runWithJson } from './db.ts';
import { matchKey, sizeFields } from './normalize.ts';

/**
 * Public products no listing keys: ones with no key yet, and the ones sold at a public
 * store we don't import (the promoted Panda Mart rows). Their variant, size, pack and
 * key are read again from the name with the current parser, so they match imported
 * listings read the same way. Brand and item type stay as stored; when the name no
 * longer reads as that type, the stored fields stay too and only the key is worked out.
 */
export async function refreshMatchKeys(dbUrl: string): Promise<string> {
  const rows = lastJson<
    {
      id: string; name: string; brand: string | null; category: string | null; variant: string | null; item_type: string | null;
      size_value: number | string | null; size_unit: 'g' | 'ml' | 'pc' | null; pack_count: number | null;
    }[]
  >(await runFile(dbUrl, 'backfill-read.sql'));
  if (!rows.length) return '[keys] nothing to refresh';
  const brands = learnBrands(rows.map((r) => r.name));
  const data = rows.map((r) => {
    const parsed = parseProductName(r.name, { categoryHint: r.category, brands: r.brand ? [...brands, r.brand] : brands });
    const confidence = parsed.confidence + (!parsed.brand && r.brand ? 0.3 : 0);
    const stored = {
      variant: r.variant,
      size_value: r.size_value == null ? null : Number(r.size_value),
      size_unit: r.size_unit,
      pack_count: r.pack_count ?? 1,
    };
    const sameType = (parsed.itemType?.id ?? null) === r.item_type;
    const fields = !sameType
      ? stored
      : { variant: parsed.variant?.slice(0, 80) || null, ...(parsed.size ? sizeFields(parsed.size) : stored) };
    const key = matchKey(
      { brand: r.brand, item_type: r.item_type, ...fields, size_value: sameType && parsed.size?.mixed ? null : fields.size_value },
      confidence,
      r.name,
    );
    return { id: r.id, ...fields, match_key: key };
  });
  const out = lastJson<{ updated: number; keyed: number }>(await runWithJson(dbUrl, 'backfill-write.sql', 'backfill.json', data));
  return `[keys] ${data.length} public products not from a listing (e.g. Panda Mart): ${out.keyed} keyed, ${out.updated} updated`;
}
