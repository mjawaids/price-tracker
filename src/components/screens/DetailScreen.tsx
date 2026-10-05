import { useEffect, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useCompare } from '../../contexts/CompareContext';
import { useLists } from '../../contexts/ListsContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { CATEGORIES, resolveCategory, catTint, catInk } from '../../lib/categories';
import { ITEM_TYPE_BY_ID } from '../../lib/compare/itemTypes';
import { deliveryLabel, freshness } from '../../lib/compare/describe';
import { Btn, EmptyState, Icon, Thumb, Toast } from '../ui';
import { StoreName } from './compareParts';
import { productSizeText, sectionLabel, unitPriceText, usePriced } from './compareHelpers';
import { PriceSheet } from './compareSheets';

export default function DetailScreen() {
  const app = useApp();
  const compare = useCompare();
  const lists = useLists();
  const priced = usePriced();
  const { compact } = useBreakpoint();
  const big = !compact;
  const p = compare.productById(String(app.params.id ?? ''));
  const [priceOpen, setPriceOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  const back = () => (app.canGoBack ? app.back() : app.tab('prices'));
  if (!p) {
    return <EmptyState icon="box" title="Product not found" body="It may have been removed, or it isn’t sold in your city." cta="Back to prices" onCta={back} />;
  }

  const mine = priced(p.id);
  const considered = new Set(mine.map((x) => x.store.id));
  const others = priced(p.id, true).filter((x) => !considered.has(x.store.id));
  const outOfStock = compare.pricesFor(p.id).filter((x) => !x.isAvailable && compare.storeById(x.storeId));
  const best = mine[0];
  const cat = resolveCategory(p.category ?? undefined);
  const typeName = p.itemType ? ITEM_TYPE_BY_ID.get(p.itemType)?.name : null;
  const size = productSizeText(p);

  // Pins this exact product on the item, so Where to buy prices it as-is.
  const addToList = () => {
    // Long product names rarely match the aisle dictionary; the catalogue knows the aisle.
    const aisle = (p.itemType && ITEM_TYPE_BY_ID.get(p.itemType)?.category) || (CATEGORIES.some((c) => c.id === cat.id) ? cat.id : null);
    const r = lists.addProductItem(p.name, p.id, aisle);
    if (!r.added.length && !r.merged.length) return setToast('Make a list first, then add this to it');
    setToast(`${r.merged.length ? 'Already there — one more on' : 'Added to'} ${lists.activeList?.name ?? 'your list'}`);
  };

  const row = (x: (typeof mine)[number], i: number, highlight: boolean) => {
    const f = freshness(x.price.observedAt);
    const per = unitPriceText(p, x.price.price!, compare.fmt);
    return (
      <div
        key={x.store.id}
        className="flex items-center gap-3 rounded-2xl"
        style={{
          padding: '12px 14px',
          background: highlight && i === 0 ? 'var(--accent-wash)' : 'var(--surface)',
          boxShadow: highlight && i === 0 ? 'inset 0 0 0 1.5px var(--accent)' : 'inset 0 0 0 1px var(--line)',
        }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <StoreName store={x.store} className="font-bold text-[15px]" />
            {highlight && i === 0 && (
              <span className="bg-accent text-accent-on text-[10.5px] font-extrabold rounded-full shrink-0" style={{ padding: '2px 7px' }}>
                BEST
              </span>
            )}
          </div>
          <div className={`text-[12px] mt-px ${f.old ? 'text-warn-ink' : 'text-ink-soft'}`}>
            {deliveryLabel(x.store.deliveryRule, compare.fmt, x.store.kind)} · {x.price.mine ? 'your price, ' : ''}
            {f.label}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-mono text-[17px] font-bold">{compare.fmt(x.price.price!)}</div>
          {per && <div className="font-mono text-[11.5px] text-ink-soft">{per}</div>}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-full flex flex-col">
      <div className="sticky top-0 z-20 bg-paper flex items-center" style={{ padding: '14px 16px' }}>
        <button type="button" onClick={back} aria-label="Back" className="grid place-items-center rounded-full bg-surface shadow-[inset_0_0_0_1px_var(--line)]" style={{ width: 44, height: 44 }}>
          <Icon name="back" size={20} stroke={2.2} />
        </button>
      </div>

      <div style={{ padding: big ? '4px 28px 0' : '4px 20px 0', maxWidth: big ? 640 : '100%', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <div className="flex justify-center" style={{ padding: '4px 0 20px' }}>
          <Thumb product={p} size={big ? 200 : 168} radius={28} />
        </div>
        <div className="inline-flex items-center gap-1.5 font-bold text-[12.5px] rounded-full" style={{ background: catTint(cat.hue, 0.94, 0.05), color: catInk(cat.hue), padding: '4px 11px' }}>
          {typeName ?? cat.name}
        </div>
        <h1 className="font-display font-extrabold text-[28px] tracking-[-0.025em] leading-[1.08]" style={{ margin: '10px 0 2px' }}>
          {p.name}
        </h1>
        <div className="text-ink-soft text-[15px]">
          {[p.brand, size].filter(Boolean).join(' · ')}
          {p.ownerId && <span> · your product</span>}
        </div>

        {best ? (
          <div className="flex items-baseline gap-2.5 mt-[18px] flex-wrap">
            <div className="font-mono text-[32px] font-bold tracking-[-0.04em]">{compare.fmt(best.price.price!)}</div>
            <div className="text-[13.5px] text-ink-soft">
              <span className="text-accent-ink font-bold">lowest at your stores</span>
              {mine.length > 1 && ` · up to ${compare.fmt(mine[mine.length - 1].price.price!)}`}
            </div>
          </div>
        ) : (
          <div className="mt-[18px] text-ink-soft text-sm">No price at your stores yet — add one if you’ve seen it.</div>
        )}

        {mine.length > 0 && (
          <>
            <div className={`mt-6 ${sectionLabel}`}>At your stores</div>
            <div className="mt-2.5 flex flex-col gap-2">{mine.map((x, i) => row(x, i, true))}</div>
          </>
        )}
        {others.length > 0 && (
          <>
            <div className={`mt-6 ${sectionLabel}`}>Other stores</div>
            <div className="mt-2.5 flex flex-col gap-2">{others.map((x, i) => row(x, i, false))}</div>
          </>
        )}
        {outOfStock.length > 0 && (
          <p className="text-[12.5px] text-ink-soft mt-3">
            Out of stock lately at {outOfStock.map((x) => compare.storeById(x.storeId)!.name).join(', ')}.
          </p>
        )}
        <p className="text-[12.5px] text-ink-soft mt-4 leading-relaxed">
          Add it to a list and tap <strong className="text-ink">Where to buy</strong> — we’ll find the cheapest split for the whole list, delivery included.
        </p>
      </div>

      <div className="flex-1" />
      <div
        className="sticky bottom-0 z-10 flex items-center gap-2.5 safe-bottom w-full"
        style={{ padding: '14px 18px 18px', background: 'linear-gradient(transparent, var(--paper) 22%)', maxWidth: big ? 640 : '100%', margin: '0 auto', boxSizing: 'border-box' }}
      >
        <Btn variant="ghost" size="lg" icon="tag" onClick={() => setPriceOpen(true)} disabled={!compare.online} className="whitespace-nowrap">
          Add price
        </Btn>
        <Btn size="lg" icon="plus" onClick={addToList} className="flex-1 whitespace-nowrap">
          Add to list
        </Btn>
      </div>
      <PriceSheet product={priceOpen ? p : null} onClose={() => setPriceOpen(false)} onDone={setToast} />
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50" style={{ width: 'min(440px, calc(100vw - 32px))' }}>
          <Toast message={toast} icon="check" />
        </div>
      )}
    </div>
  );
}
