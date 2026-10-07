// Non-component helpers for the Compare screens (kept apart for fast refresh).
import { useCompare } from '../../contexts/CompareContext';
import { CatalogProduct, CatalogStore, CurrentPrice } from '../../lib/compare/types';
import { ITEM_TYPE_BY_ID, tokens } from '../../lib/compare/itemTypes';
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

/** A shared in-store branch (a public physical store): it counts in plans only once picked. */
export const isBranch = (s: CatalogStore) => s.ownerId == null && s.kind === 'physical';

/** Does a store match a search? Every word must start a word of its name, chain or address. */
export function storeMatches(s: CatalogStore, words: string[]): boolean {
  if (!words.length) return true;
  const have = tokens(`${s.name} ${s.chain ?? ''} ${s.address ?? ''}`);
  return words.every((w) => have.some((x) => x.startsWith(w)));
}

/** Stores grouped by chain (else their name): chains A–Z, branches A–Z. */
export function groupByChain(stores: CatalogStore[]): { chain: string; stores: CatalogStore[] }[] {
  const m = new Map<string, CatalogStore[]>();
  for (const s of stores) {
    const k = s.chain || s.name;
    m.set(k, [...(m.get(k) ?? []), s]);
  }
  return [...m]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([chain, list]) => ({ chain, stores: [...list].sort((a, b) => a.name.localeCompare(b.name)) }));
}

/** "Gulshan" from "Imtiaz · Gulshan": a branch's own part of its name. */
export const branchArea = (s: CatalogStore) => (s.chain && s.name.startsWith(`${s.chain} · `) ? s.name.slice(s.chain.length + 3) : s.name);

/** My-stores picks to save: none when they're exactly the default set (so new online stores join on their own). */
export function toPicks(ids: string[], defaultIds: string[]): string[] {
  const unique = [...new Set(ids)];
  const defaults = new Set(defaultIds);
  return unique.length === defaults.size && unique.every((id) => defaults.has(id)) ? [] : unique;
}
