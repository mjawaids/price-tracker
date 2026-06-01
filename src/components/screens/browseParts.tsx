import { Product } from '../../types';
import { useApp } from '../../contexts/AppContext';
import { priceRange } from '../../utils/optimizer';
import { resolveCategory } from '../../lib/categories';
import { Icon, Thumb, StoreDot } from '../ui';

// Best-price + best-store summary shared by cards/rows.
export function useBestInfo() {
  const app = useApp();
  return (p: Product) => {
    const r = priceRange(p);
    const store = r?.bestStoreId ? app.storeById(r.bestStoreId) : undefined;
    return { r, store };
  };
}

// ── Aisle card (fixed-width rail card) ───────────────────────────────────────
export function AisleCard({ p, width }: { p: Product; width: number }) {
  const app = useApp();
  const r = priceRange(p);
  const q = app.qty(p.id);
  return (
    <div
      onClick={() => app.go('detail', { id: p.id })}
      className="shrink-0 bg-surface rounded-card p-[11px] shadow-card cursor-pointer flex flex-col gap-[9px]"
      style={{ width }}
    >
      <div className="relative">
        <Thumb product={p} fill radius={13} />
        {q > 0 && (
          <div className="absolute top-[7px] left-[7px] bg-accent text-accent-on font-mono font-bold rounded-full px-[7px] py-px text-[11.5px]">
            ×{q}
          </div>
        )}
      </div>
      <div className="font-bold text-sm leading-[1.12] line-clamp-2">{p.name}</div>
      <div className="flex items-center justify-between mt-auto">
        <div className="font-mono text-base font-bold tracking-[-0.02em]">{r ? app.fmt(r.min) : '—'}</div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            app.add(p.id);
          }}
          className={`grid place-items-center active:scale-95 ${
            q > 0 ? 'bg-accent text-accent-on' : 'bg-accent-wash text-accent-ink'
          }`}
          style={{ width: 32, height: 32, borderRadius: 10 }}
        >
          <Icon name="plus" size={17} stroke={2.8} />
        </button>
      </div>
    </div>
  );
}

// ── Aisle view (category carousels) ──────────────────────────────────────────
export function AisleView({ items, compact }: { items: Product[]; compact: boolean }) {
  // group by resolved category, preserving canonical order then extras
  const groups = new Map<string, { name: string; hue: number; list: Product[] }>();
  for (const p of items) {
    const cat = resolveCategory(p.category);
    if (!groups.has(cat.id)) groups.set(cat.id, { name: cat.name, hue: cat.hue, list: [] });
    groups.get(cat.id)!.list.push(p);
  }
  const cardW = compact ? 150 : 168;
  const pad = compact ? 18 : 28;

  return (
    <div className="pt-1.5 pb-2.5">
      {Array.from(groups.values()).map((g) => (
        <div key={g.name} className="mb-[22px]">
          <div className="flex items-center justify-between pb-2.5" style={{ paddingLeft: pad, paddingRight: pad }}>
            <div className="flex items-center gap-[9px]">
              <span style={{ width: 10, height: 10, borderRadius: 3, background: `oklch(0.62 0.13 ${g.hue})` }} />
              <h3 className="m-0 font-display font-extrabold text-[19px] tracking-[-0.02em]">{g.name}</h3>
            </div>
            <span className="font-mono text-[11.5px] text-ink-faint">{g.list.length}</span>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar" style={{ padding: `2px ${pad}px 4px` }}>
            {g.list.map((p) => (
              <AisleCard key={p.id} p={p} width={cardW} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Receipt row (used by Search results) ─────────────────────────────────────
export function ReceiptRow({ p }: { p: Product }) {
  const app = useApp();
  const r = priceRange(p);
  const store = r?.bestStoreId ? app.storeById(r.bestStoreId) : undefined;
  const q = app.qty(p.id);
  return (
    <div
      onClick={() => app.go('detail', { id: p.id })}
      className="flex items-center gap-3 px-[18px] py-[13px] cursor-pointer"
      style={{ background: q > 0 ? 'var(--accent-wash)' : 'transparent' }}
    >
      <Thumb product={p} size={44} radius={10} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="font-bold text-[15px] whitespace-nowrap">{p.name}</span>
          <span className="flex-1 border-b-[1.5px] border-dotted border-line -translate-y-[3px]" />
          <span className="font-mono text-base font-bold">{r ? app.fmt(r.min) : '—'}</span>
        </div>
        <div className="flex justify-between mt-0.5 font-mono text-[11px] text-ink-faint">
          <span>
            {p.unit ? `${p.unit} · ` : ''}
            {r?.count ?? 0} stores
          </span>
          {store && (
            <span className="inline-flex items-center gap-1">
              <StoreDot store={store} size={6} />
              {store.name}
            </span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          app.add(p.id);
        }}
        className={`grid place-items-center shrink-0 rounded-full active:scale-95 ${
          q > 0 ? 'bg-accent text-accent-on' : 'bg-surface text-ink shadow-[inset_0_0_0_1.5px_var(--line)]'
        }`}
        style={{ width: 34, height: 34 }}
      >
        {q > 0 ? <span className="font-mono font-bold text-[13px]">{q}</span> : <Icon name="plus" size={17} stroke={2.6} />}
      </button>
    </div>
  );
}
