import { useMemo, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { resolveCategory, CATEGORIES } from '../../lib/categories';
import { Icon, Chip } from '../ui';
import { AisleView } from './browseParts';

function BrowseHeader({ cat, setCat }: { cat: string; setCat: (c: string) => void }) {
  const app = useApp();
  const { compact } = useBreakpoint();
  const firstName = app.user.name.split(' ')[0];
  const initials = app.user.name.split(' ').map((p) => p[0]).slice(0, 2).join('');

  // categories present in the catalogue (canonical order + extras)
  const cats = useMemo(() => {
    const present = new Map<string, string>();
    app.products.forEach((p) => {
      const c = resolveCategory(p.category);
      if (!present.has(c.id)) present.set(c.id, c.name);
    });
    const ordered = CATEGORIES.filter((c) => present.has(c.id)).map((c) => ({ id: c.id, name: c.name }));
    const extras = Array.from(present.entries())
      .filter(([id]) => !CATEGORIES.some((c) => c.id === id))
      .map(([id, name]) => ({ id, name }));
    return [...ordered, ...extras];
  }, [app.products]);

  return (
    <div className="sticky top-0 z-20 bg-paper border-b border-line" style={{ paddingTop: compact ? 14 : 22 }}>
      <div
        className="flex items-center justify-between"
        style={{ padding: compact ? '0 18px 12px' : '0 28px 14px' }}
      >
        <div>
          <div className="font-mono text-[11px] tracking-[0.14em] text-ink-faint uppercase">
            Good morning, {firstName}
          </div>
          <h1
            className="mt-px mb-0 font-display font-extrabold tracking-[-0.02em]"
            style={{ fontSize: compact ? 27 : 32 }}
          >
            What are we buying?
          </h1>
        </div>
        {compact && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => app.tab('search')}
              className="grid place-items-center rounded-full bg-surface shadow-[inset_0_0_0_1px_var(--line)]"
              style={{ width: 44, height: 44 }}
            >
              <Icon name="search" size={21} stroke={2.2} />
            </button>
            <button
              type="button"
              onClick={() => app.go('profile')}
              className="grid place-items-center rounded-full bg-accent text-accent-on font-display font-extrabold text-[15px] overflow-hidden"
              style={{ width: 44, height: 44 }}
            >
              {app.user.avatarUrl ? (
                <img src={app.user.avatarUrl} alt={app.user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                initials
              )}
            </button>
          </div>
        )}
      </div>
      <div
        className="flex gap-2 overflow-x-auto no-scrollbar"
        style={{ padding: compact ? '0 18px 14px' : '0 28px 16px' }}
      >
        <Chip active={cat === 'all'} onClick={() => setCat('all')}>
          All
        </Chip>
        {cats.map((c) => (
          <Chip key={c.id} active={cat === c.id} onClick={() => setCat(c.id)}>
            {c.name}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function LocationBanner() {
  const app = useApp();
  const { compact } = useBreakpoint();
  if (app.location) return null;
  return (
    <div style={{ margin: compact ? '14px 18px 0' : '18px 28px 0' }}>
      <button
        type="button"
        onClick={() => app.openSheet('location')}
        className="w-full text-left bg-accent-wash rounded-2xl flex items-center gap-3 shadow-[inset_0_0_0_1.5px_var(--accent)]"
        style={{ padding: '13px 15px' }}
      >
        <span
          className="grid place-items-center bg-accent text-accent-on shrink-0"
          style={{ width: 38, height: 38, borderRadius: 11 }}
        >
          <Icon name="pin" size={19} stroke={2.2} />
        </span>
        <span className="flex-1 min-w-0">
          <div className="font-bold text-[14.5px]">Set your location</div>
          <div className="text-[12.5px] text-accent-ink">See nearby stores &amp; the right currency.</div>
        </span>
        <Icon name="chevR" size={18} color="var(--accent-ink)" />
      </button>
    </div>
  );
}

export default function BrowseScreen() {
  const app = useApp();
  const { compact } = useBreakpoint();
  const [cat, setCat] = useState('all');
  const items = useMemo(
    () => app.products.filter((p) => cat === 'all' || resolveCategory(p.category).id === cat),
    [app.products, cat],
  );

  return (
    <div style={{ paddingBottom: compact ? 12 : 36 }}>
      <BrowseHeader cat={cat} setCat={setCat} />
      <LocationBanner />
      {items.length ? (
        <AisleView items={items} compact={compact} />
      ) : (
        <div className="text-center text-ink-faint py-20 px-8">
          <div className="font-display font-bold text-lg text-ink">No products yet</div>
          <p className="text-sm mt-1.5">Add products and prices in Manage to start browsing.</p>
        </div>
      )}
    </div>
  );
}
