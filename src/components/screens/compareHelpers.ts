// Non-component helpers for the Compare screens (kept apart for fast refresh).
import { useCompare } from '../../contexts/CompareContext';
import { CatalogProduct, CatalogStore, CurrentPrice } from '../../lib/compare/types';
import { ITEM_TYPE_BY_ID } from '../../lib/compare/itemTypes';
import { productSize, sizeLabel, unitPrice } from '../../lib/compare/units';

export const sectionLabel = 'font-mono text-[11px] font-bold tracking-[0.12em] uppercase text-ink-soft';

/** Available prices for a product at the stores being considered, cheapest first. */
export function usePriced() {
  const compare = useCompare();
  const considered = new Set(compare.consideredStores.map((s) => s.id));
  return (productId: string, all = false): { store: CatalogStore; price: CurrentPrice }[] =>
    compare
      .pricesFor(productId)
      .filter((p) => p.isAvailable && p.price != null && p.price > 0 && (all || considered.has(p.storeId)))
      .map((price) => ({ store: compare.storeById(price.storeId)!, price }))
      .filter((x) => !!x.store)
      .sort((a, b) => a.price.price! - b.price.price!);
}

/** "800 g", or the free-text unit when there's no parsed size. */
export function productSizeText(p: CatalogProduct): string {
  return sizeLabel(productSize(p)) || p.unitLabel || '';
}

/** "Rs 26 / 100 g" for a product at a price, using its item type's display unit. */
export function unitPriceText(p: CatalogProduct, price: number, fmt: (n: number) => string): string | null {
  const display = p.itemType ? ITEM_TYPE_BY_ID.get(p.itemType)?.display : undefined;
  const u = unitPrice(price, productSize(p), display);
  return u ? `${fmt(Math.round(u.value))} / ${u.label}` : null;
}
