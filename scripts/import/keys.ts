// Match keys for public products that no imported listing keys (see refreshMatchKeys).
// Run by run.ts before the stores, so listings are matched against current keys.
import { learnBrands, parseProductName } from '../../src/lib/compare/productName.ts';
import { ITEM_TYPE_BY_ID } from '../../src/lib/compare/itemTypes.ts';
import { lastJson, runFile, runWithJson } from './db.ts';
import { matchKey, sizeFields } from './normalize.ts';

interface Row {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  variant: string | null;
  item_type: string | null;
  size_value: number | string | null;
  size_unit: 'g' | 'ml' | 'pc' | null;
  pack_count: number | null;
}

/**
 * Public products no listing keys: ones with no key yet, and the ones sold at a public
 * store we don't import (the promoted Panda Mart rows). They're read again from the
 * name with the current parser and the catalogue's brands (as imported listings are),
 * so their keys match listings read the same way:
 * - a missing brand or item type (and then category) is filled from the name; a stored
 *   one stays (the parser misreads some flavours as the item: "Rani Juice … Orange");
 * - variant, size and pack follow the name when it reads as the product's type, else
 *   the stored ones stay;
 * - the key is worked out from those fields.
 */
export async function refreshMatchKeys(dbUrl: string): Promise<string> {
  const read = lastJson<{ rows: Row[]; brands: string[] }>(await runFile(dbUrl, 'backfill-read.sql'));
  if (!read.rows.length) return '[keys] nothing to refresh';
  const brands = [...read.brands, ...learnBrands(read.rows.map((r) => r.name))];
  const data = read.rows.map((r) => {
    const parsed = parseProductName(r.name, { categoryHint: r.category, brands: r.brand ? [...brands, r.brand] : brands });
    const brand = (r.brand ?? parsed.brand)?.slice(0, 60) || null;
    const itemType = r.item_type ?? parsed.itemType?.id ?? null;
    const category = r.category ?? (itemType ? (ITEM_TYPE_BY_ID.get(itemType)?.category ?? null) : null);
    const confidence = parsed.confidence + (!parsed.brand && brand ? 0.3 : 0);
    const stored = {
      variant: r.variant,
      size_value: r.size_value == null ? null : Number(r.size_value),
      size_unit: r.size_unit,
      pack_count: r.pack_count ?? 1,
    };
    const sameType = (parsed.itemType?.id ?? null) === itemType;
    const fields = !sameType
      ? stored
      : { variant: parsed.variant?.slice(0, 80) || null, ...(parsed.size ? sizeFields(parsed.size) : stored) };
    const key = matchKey(
      { brand, item_type: itemType, ...fields, size_value: sameType && parsed.size?.mixed ? null : fields.size_value },
      confidence,
      r.name,
    );
    return { id: r.id, brand, item_type: itemType, category, ...fields, match_key: key };
  });
  const out = lastJson<{ updated: number; keyed: number }>(await runWithJson(dbUrl, 'backfill-write.sql', 'backfill.json', data));
  return `[keys] ${data.length} public products not from a listing (e.g. Panda Mart): ${out.keyed} keyed, ${out.updated} updated`;
}
