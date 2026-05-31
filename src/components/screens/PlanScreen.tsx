import { useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { optimizeCart, deliveryLabel } from '../../utils/optimizer';
import { storeHue } from '../../lib/categories';
import { Icon, Thumb, EmptyState } from '../ui';

function Row({
  label,
  value,
  bold,
  accent,
  faint,
}: {
  label: string;
  value: string;
  bold?: boolean;
  accent?: boolean;
  faint?: boolean;
}) {
  return (
    <div className="flex justify-between items-baseline" style={{ padding: bold ? '7px 0 0' : '3px 0' }}>
      <span
        className={bold ? 'font-bold' : 'font-medium'}
        style={{ fontSize: bold ? 15 : 13, color: faint && !bold ? 'var(--ink-soft)' : 'var(--ink)' }}
      >
        {label}
      </span>
      <span
        className="font-mono font-bold"
        style={{ fontSize: bold ? 17 : 13.5, color: accent ? 'var(--accent-ink)' : 'var(--ink)' }}
      >
        {value}
      </span>
    </div>
  );
}

export default function PlanScreen() {
  const app = useApp();
  const { compact } = useBreakpoint();
  const big = !compact;
  const lines = app.cartLines();
  const plan = useMemo(() => optimizeCart(lines, app.products, app.stores), [lines, app.products, app.stores]);

  if (!plan) {
    return (
      <EmptyState
        icon="spark"
        title="Nothing to plan yet"
        body="Add some products to your cart and we’ll split them across stores for the lowest total."
        cta="Browse products"
        onCta={() => app.tab('browse')}
      />
    );
  }

  return (
    <div style={{ paddingBottom: 40, maxWidth: big ? 860 : '100%', margin: '0 auto' }}>
      <div
        className="sticky top-0 z-20 bg-paper flex items-center gap-3"
        style={{ padding: big ? '20px 28px 6px' : '14px 16px' }}
      >
        {!big && (
          <button
            type="button"
            onClick={() => (app.canGoBack ? app.back() : app.tab('cart'))}
            className="grid place-items-center rounded-full bg-surface shadow-[inset_0_0_0_1px_var(--line)]"
            style={{ width: 42, height: 42 }}
          >
            <Icon name="back" size={20} stroke={2.2} />
          </button>
        )}
        <h1 className="m-0 font-display font-extrabold text-[22px] tracking-[-0.02em]">Your shopping plan</h1>
      </div>

      {/* summary — total prominent, savings whispered */}
      <div
        className="bg-ink text-paper rounded-[22px]"
        style={{ margin: big ? '6px 28px 4px' : '6px 18px 4px', padding: '20px 22px' }}
      >
        <div className="font-mono text-[11px] tracking-[0.14em] uppercase opacity-60">Estimated total</div>
        <div className="flex items-end justify-between mt-1">
          <div className="font-mono text-[42px] font-bold tracking-[-0.04em] leading-none">{app.fmt(plan.grandTotal)}</div>
          <div className="text-right text-[12.5px] opacity-70 leading-snug">
            {plan.itemsTotal > 0 && <div>{app.fmt(plan.itemsTotal)} items</div>}
            <div>+ {app.fmt(plan.deliveryTotal)} delivery</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-3.5 text-[13px] opacity-90">
          <span className="inline-flex items-center justify-center rounded-full bg-accent text-accent-on" style={{ width: 20, height: 20 }}>
            <Icon name="check" size={13} stroke={3} />
          </span>
          Split across {plan.storeCount} {plan.storeCount === 1 ? 'store' : 'stores'} for the lowest total
          {plan.savings > 0.01 && (
            <span className="ml-auto font-mono opacity-70">saved {app.fmt(plan.savings)}</span>
          )}
        </div>
      </div>

      {/* per-store lists */}
      <div
        className="grid gap-3.5"
        style={{ gridTemplateColumns: big ? '1fr 1fr' : '1fr', padding: big ? '16px 28px 0' : '16px 18px 0' }}
      >
        {plan.perStore.map(({ store, items, subtotal, delivery, total }) => (
          <div key={store.id} className="bg-surface rounded-[20px] overflow-hidden shadow-card">
            <div className="flex items-center gap-2.5 border-b border-line" style={{ padding: '15px 16px 13px' }}>
              <span
                className="shrink-0"
                style={{ width: 13, height: 13, borderRadius: store.type === 'online' ? 4 : 999, background: `oklch(0.6 0.16 ${storeHue(store)})` }}
              />
              <div className="flex-1">
                <div className="font-display font-bold text-[18px]">{store.name}</div>
                <div className="text-[12px] text-ink-faint flex items-center gap-1.5">
                  <Icon name={store.type === 'online' ? 'truck' : 'pin'} size={13} stroke={1.8} color="var(--ink-faint)" />
                  {deliveryLabel(store, app.fmt)}
                </div>
              </div>
              <span className="font-mono text-[12px] text-ink-faint">
                {items.length} item{items.length > 1 ? 's' : ''}
              </span>
            </div>
            <div>
              {items.map(({ product, qty, unit, line }) => (
                <div key={product.id} className="flex items-center gap-2.5" style={{ padding: '10px 16px' }}>
                  <Thumb product={product} size={38} radius={9} label={false} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{product.name}</div>
                    <div className="text-[11.5px] text-ink-faint font-mono">
                      {qty} × {app.fmt(unit)}
                    </div>
                  </div>
                  <div className="font-mono text-sm font-bold">{app.fmt(line)}</div>
                </div>
              ))}
            </div>
            <div className="border-t border-dashed border-line" style={{ padding: '12px 16px 14px', background: 'color-mix(in oklch, var(--surface) 60%, var(--paper))' }}>
              <Row label="Subtotal" value={app.fmt(subtotal)} faint />
              <Row label="Delivery" value={delivery === 0 ? 'Free' : app.fmt(delivery)} faint accent={delivery === 0} />
              <Row label="Store total" value={app.fmt(total)} bold />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
