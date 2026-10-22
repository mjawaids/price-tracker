// "Where to buy eggs" (lazy, from an item's details on a list with a plan): the item's
// price at each of your stores, cheapest first, or "Anywhere" (out of the plan). Only
// this item moves; Re-plan on the plan banner reworks the whole list.
import { useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useCompare } from '../../contexts/CompareContext';
import { useLists } from '../../contexts/ListsContext';
import type { LineOption } from '../../lib/compare/optimizer';
import { deliveryLabel } from '../../lib/compare/describe';
import type { ListItem } from '../../types';
import { trackUserAction } from '../../utils/analytics';
import { AgeChip, Icon, Sheet, StoreDot } from '../ui';
import { splitStoreName } from './compareHelpers';
import { planStoreOf } from './priceCheckHelpers';

const track = (action: string, details?: Record<string, unknown>) => {
  if (typeof window !== 'undefined' && typeof window.gtag !== 'undefined') trackUserAction(action, details);
};

function Radio({ on }: { on: boolean }) {
  return on ? (
    <span aria-hidden className="shrink-0 grid place-items-center rounded-full bg-accent text-accent-on" style={{ width: 22, height: 22 }}>
      <Icon name="check" size={13} stroke={3.2} />
    </span>
  ) : (
    <span aria-hidden className="shrink-0 rounded-full shadow-[inset_0_0_0_2px_var(--ink-faint)]" style={{ width: 22, height: 22 }} />
  );
}

export function PlanStoreSheet({ item, onClose, onDone }: { item: ListItem | null; onClose: () => void; onDone: (message: string) => void }) {
  const compare = useCompare();
  const lists = useLists();
  const app = useApp();
  const { planFor } = compare;
  const current = item ? planStoreOf(compare, item) : null;

  // The cheapest option at each store you shop at, cheapest first.
  const options = useMemo(() => {
    if (!item) return [];
    const best = new Map<string, LineOption>();
    for (const o of planFor([item]).resolved[0]?.options ?? []) {
      const b = best.get(o.storeId);
      if (!b || o.total < b.total) best.set(o.storeId, o);
    }
    return [...best.values()].filter((o) => compare.storeById(o.storeId)).sort((a, b) => a.total - b.total);
    // storeById reads the latest catalogue.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, planFor]);

  // Stores the rest of the list is already planned at ("on your plan").
  const onPlan = useMemo(
    () => new Set(lists.todo.filter((i) => i.id !== item?.id).map((i) => planStoreOf(compare, i)).filter((s): s is string => !!s)),
    // planStoreOf reads the latest catalogue.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lists.todo, item?.id],
  );

  if (!item) return null;
  const planned = item.planProductId ? compare.productById(item.planProductId) : undefined;
  const others = options.filter((o) => o.storeId !== current);
  // The banner's button: Re-plan once something is ticked (as in ListsScreen).
  const replan = lists.done.length > 0;

  const pick = (o: LineOption) => {
    if (o.storeId !== current) {
      lists.setItemPlan(item.id, { storeId: o.storeId, productId: o.productId, price: o.total });
      track('plan_item_moved', { to: 'store', from: 'list' });
      onDone(`${item.name} moves to ${splitStoreName(compare.storeById(o.storeId)?.name ?? '')[0]}`);
    } else onClose();
  };
  const anywhere = () => {
    lists.setItemPlan(item.id, null);
    track('plan_item_moved', { to: 'anywhere', from: 'list' });
    onDone(`${item.name} is no longer part of the plan`);
  };

  return (
    <Sheet open onClose={onClose} title={`Where to buy ${item.name}`}>
      <div className="flex flex-col gap-3">
        <p className="m-0 -mt-1 text-[14px] text-ink-soft leading-snug break-words">
          {planned ? `${planned.name} · prices at your stores` : 'Prices at your stores'}
        </p>

        {options.length > 0 && (
          <div role="radiogroup" aria-label={`Store for ${item.name}`} className="rounded-[18px] bg-surface shadow-card overflow-hidden">
            {options.map((o, i) => {
              const store = compare.storeById(o.storeId)!;
              const [name, area] = splitStoreName(store.name);
              const on = o.storeId === current;
              const note = on
                ? 'planned here now'
                : onPlan.has(o.storeId)
                  ? 'on your plan'
                  : store.kind === 'online'
                    ? deliveryLabel(store.deliveryRule, compare.fmt, store.kind)
                    : 'another stop';
              const product = o.productId !== item.planProductId ? compare.productById(o.productId)?.name : undefined;
              const seen = compare.priceAt(o.storeId, o.productId)?.observedAt;
              return (
                <button
                  key={o.storeId}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => pick(o)}
                  className={`w-full flex items-center gap-3 text-left ${on ? 'bg-accent-wash' : ''}`}
                  style={{ padding: '10px 14px', minHeight: 64, borderTop: i ? '1px solid var(--line)' : 'none' }}
                >
                  <StoreDot store={store} size={12} />
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-[15.5px] leading-snug break-words">{name}</span>
                      {i === 0 && options.length > 1 && (
                        <span className="rounded-full bg-ok-wash text-ok-ink text-[11.5px] font-extrabold" style={{ padding: '2px 8px' }}>
                          Cheapest
                        </span>
                      )}
                    </span>
                    <span className="block text-[13px] text-ink-soft leading-snug break-words">{area ? `${area} · ${note}` : note}</span>
                    {product && <span className="block text-[12.5px] text-ink-soft leading-snug line-clamp-2 break-words">{product}</span>}
                  </span>
                  <span className="shrink-0 flex flex-col items-end gap-[3px]">
                    <span className="font-mono text-[15px] font-bold">{compare.fmt(o.total)}</span>
                    {seen && <AgeChip observedAt={seen} />}
                  </span>
                  <Radio on={on} />
                </button>
              );
            })}
          </div>
        )}

        {!others.length && (
          <div className="flex items-center gap-3 rounded-btn bg-[var(--backdrop)]" style={{ padding: '10px 6px 10px 14px' }}>
            <span className="flex-1 text-[13.5px] leading-snug text-ink-soft">No other store has a price for this yet.</span>
            <button
              type="button"
              onClick={() => {
                onClose();
                app.go('contribute');
              }}
              className="shrink-0 font-extrabold text-[13.5px] text-accent-ink"
              style={{ minHeight: 44, padding: '0 8px' }}
            >
              Add a price
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={anywhere}
          className="flex items-center gap-3 text-left rounded-[18px] bg-surface shadow-[inset_0_0_0_1.5px_var(--line)]"
          style={{ padding: '10px 14px', minHeight: 60 }}
        >
          <span aria-hidden className="shrink-0 rounded-full bg-[var(--ink-faint)]" style={{ width: 12, height: 12 }} />
          <span className="flex-1 min-w-0">
            <span className="block font-bold text-[15.5px]">Anywhere</span>
            <span className="block text-[13px] text-ink-soft">Not part of the plan · stays on your list</span>
          </span>
        </button>

        <p className="m-0 mx-1 mb-1 text-[13px] leading-snug text-ink-soft">
          Only {item.name} moves. To rework the whole list, use <strong className="text-ink">{replan ? 'Re-plan' : 'Change'}</strong> on the plan banner.
        </p>
      </div>
    </Sheet>
  );
}
