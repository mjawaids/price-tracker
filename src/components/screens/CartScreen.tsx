import { useApp } from '../../contexts/AppContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { priceRange } from '../../utils/optimizer';
import { Thumb, Btn, Stepper, EmptyState } from '../ui';

export default function CartScreen() {
  const app = useApp();
  const { compact } = useBreakpoint();
  const big = !compact;
  const lines = app.cartLines();

  if (!lines.length) {
    return (
      <EmptyState
        icon="cart"
        title="Your cart is empty"
        body="Browse products and tap + to add them. We’ll figure out the cheapest places to buy once you’re ready."
        cta="Start browsing"
        onCta={() => app.tab('browse')}
      />
    );
  }

  const est = lines.reduce((a, l) => {
    const p = app.productById(l.id);
    const r = p ? priceRange(p) : null;
    return a + (r ? r.min * l.qty : 0);
  }, 0);
  const totalItems = lines.reduce((a, l) => a + l.qty, 0);

  return (
    <div className="min-h-full flex flex-col" style={{ maxWidth: big ? 720 : '100%', margin: '0 auto' }}>
      <div style={{ padding: big ? '24px 28px 8px' : '18px 18px 8px' }}>
        <h1 className="m-0 font-display font-extrabold text-[28px] tracking-[-0.02em]">Your cart</h1>
        <div className="text-ink-faint text-sm font-mono">
          {totalItems} items · {lines.length} products
        </div>
      </div>

      <div className="flex flex-col gap-2.5" style={{ padding: big ? '8px 28px' : '8px 18px' }}>
        {lines.map((l) => {
          const p = app.productById(l.id);
          if (!p) return null;
          const r = priceRange(p);
          return (
            <div key={l.id} className="flex items-center gap-3 bg-surface rounded-[18px] p-3 shadow-card">
              <Thumb product={p} size={56} radius={13} />
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => app.go('detail', { id: p.id })}>
                <div className="font-bold text-[15px]">{p.name}</div>
                <div className="text-[12.5px] text-ink-faint">
                  {p.unit ? `${p.unit} · ` : ''}
                  {r ? `from ${app.fmt(r.min)}` : 'no prices'}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Stepper value={l.qty} onChange={(n) => app.setQty(l.id, n)} size="sm" />
                <div className="font-mono text-sm font-bold">{r ? app.fmt(r.min * l.qty) : '—'}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex-1" />
      <div
        className="sticky bottom-0 z-10 safe-bottom w-full"
        style={{ padding: '16px 18px 18px', background: 'linear-gradient(transparent, var(--paper) 24%)' }}
      >
        <div className="flex justify-between items-baseline mb-3 px-1">
          <span className="text-sm text-ink-soft">Items subtotal</span>
          <span className="font-mono text-[18px] font-bold">~{app.fmt(est)}</span>
        </div>
        <Btn full size="lg" icon="spark" onClick={() => app.go('plan')}>
          Build my cheapest plan
        </Btn>
      </div>
    </div>
  );
}
