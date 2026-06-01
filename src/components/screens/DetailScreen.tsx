import { useApp } from '../../contexts/AppContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { priceMap, priceRange, deliveryLabel } from '../../utils/optimizer';
import { resolveCategory, catTint, catInk, storeHue } from '../../lib/categories';
import { Icon, Thumb, Btn, Stepper, EmptyState } from '../ui';

export default function DetailScreen() {
  const app = useApp();
  const { compact } = useBreakpoint();
  const big = !compact;
  const p = app.productById(String(app.params.id ?? ''));

  if (!p) {
    return <EmptyState icon="box" title="Product not found" body="This product may have been removed." cta="Back to browse" onCta={() => app.tab('browse')} />;
  }

  const r = priceRange(p);
  const cat = resolveCategory(p.category);
  const q = app.qty(p.id);
  const rows = Object.entries(priceMap(p))
    .map(([sid, price]) => ({ store: app.storeById(sid), price }))
    .filter((row) => row.store)
    .sort((a, b) => a.price - b.price);

  return (
    <div className="min-h-full flex flex-col">
      <div className="sticky top-0 z-20 bg-paper flex items-center justify-between" style={{ padding: '14px 16px' }}>
        <button
          type="button"
          onClick={() => (app.canGoBack ? app.back() : app.tab('browse'))}
          className="grid place-items-center rounded-full bg-surface shadow-[inset_0_0_0_1px_var(--line)]"
          style={{ width: 42, height: 42 }}
        >
          <Icon name="back" size={20} stroke={2.2} />
        </button>
        <button
          type="button"
          className="grid place-items-center rounded-full bg-surface shadow-[inset_0_0_0_1px_var(--line)]"
          style={{ width: 42, height: 42 }}
        >
          <Icon name="heart" size={20} stroke={2.2} />
        </button>
      </div>

      <div style={{ padding: big ? '4px 28px 0' : '4px 20px 0', maxWidth: big ? 640 : '100%', margin: '0 auto' }}>
        <div className="flex justify-center" style={{ padding: '8px 0 22px' }}>
          <Thumb product={p} size={big ? 230 : 190} radius={28} />
        </div>

        <div
          className="inline-flex items-center gap-1.5 font-bold text-[12.5px] rounded-full"
          style={{ background: catTint(cat.hue, 0.94, 0.05), color: catInk(cat.hue), padding: '4px 11px' }}
        >
          {cat.name}
        </div>
        <h1 className="font-display font-extrabold text-[30px] tracking-[-0.025em] leading-[1.05]" style={{ margin: '10px 0 2px' }}>
          {p.name}
        </h1>
        {p.unit && <div className="text-ink-faint text-[15px]">{p.unit}</div>}

        {r ? (
          <div className="flex items-baseline gap-2.5 mt-[18px]">
            <div className="font-mono text-[34px] font-bold tracking-[-0.04em]">{app.fmt(r.min)}</div>
            <div className="text-[13.5px] text-ink-faint">
              <span className="text-accent-ink font-bold">lowest</span> · up to {app.fmt(r.max)} across {r.count}{' '}
              {r.count === 1 ? 'store' : 'stores'}
            </div>
          </div>
        ) : (
          <div className="mt-[18px] text-ink-faint text-sm">No prices yet — add them in Manage › Prices.</div>
        )}

        {rows.length > 0 && (
          <>
            <div className="mt-[22px] font-mono text-[11px] tracking-[0.12em] text-ink-faint uppercase">Where to buy</div>
            <div className="mt-2.5 flex flex-col gap-2">
              {rows.map(({ store, price }, i) => {
                const best = i === 0;
                return (
                  <div
                    key={store!.id}
                    className="flex items-center gap-3 rounded-2xl"
                    style={{
                      padding: '13px 15px',
                      background: best ? 'var(--accent-wash)' : 'var(--surface)',
                      boxShadow: best ? 'inset 0 0 0 1.5px var(--accent)' : 'inset 0 0 0 1px var(--line)',
                    }}
                  >
                    <span
                      className="shrink-0"
                      style={{
                        width: 11,
                        height: 11,
                        borderRadius: store!.type === 'online' ? 3 : 999,
                        background: `oklch(0.6 0.16 ${storeHue(store!)})`,
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[15px]">{store!.name}</span>
                        {best && (
                          <span className="bg-accent text-accent-on text-[10.5px] font-extrabold rounded-full" style={{ padding: '2px 7px' }}>
                            BEST
                          </span>
                        )}
                        <span className="text-[11px] text-ink-faint font-mono uppercase">{store!.type}</span>
                      </div>
                      <div className="text-[12px] text-ink-soft mt-px flex items-center gap-1.5">
                        <Icon name="truck" size={13} color="var(--ink-faint)" stroke={1.8} />
                        {deliveryLabel(store!, app.fmt)}
                      </div>
                    </div>
                    <div className="font-mono text-[17px] font-bold">{app.fmt(price)}</div>
                  </div>
                );
              })}
            </div>
            <p className="text-[12.5px] text-ink-faint mt-3.5 leading-relaxed">
              We’ll pick the cheapest split for your whole cart — including delivery — when you build your plan.
            </p>
          </>
        )}
      </div>

      <div className="flex-1" />
      <div
        className="sticky bottom-0 z-10 flex items-center gap-3.5 safe-bottom w-full"
        style={{ padding: '14px 18px 18px', background: 'linear-gradient(transparent, var(--paper) 22%)', maxWidth: big ? 640 : '100%', margin: '0 auto' }}
      >
        {q > 0 ? (
          <>
            <div className="bg-surface rounded-btn shadow-[inset_0_0_0_1.5px_var(--line)]" style={{ padding: '8px 10px' }}>
              <Stepper value={q} onChange={(n) => app.setQty(p.id, n)} />
            </div>
            <Btn full size="lg" onClick={() => app.go('cart')}>
              View cart · {app.fmt(app.cartTotalGuess())}
            </Btn>
          </>
        ) : (
          <Btn full size="lg" icon="plus" onClick={() => app.add(p.id)} disabled={!r}>
            Add to cart
          </Btn>
        )}
      </div>
    </div>
  );
}
