import { useMemo, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { resolveCategory } from '../../lib/categories';
import { Icon, Chip } from '../ui';
import { ReceiptRow } from './browseParts';

const RECENTS = ['Milk', 'Coffee', 'Olive Oil', 'Eggs'];

export default function SearchScreen() {
  const app = useApp();
  const { compact } = useBreakpoint();
  const [q, setQ] = useState('');

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return app.products.filter(
      (p) => p.name.toLowerCase().includes(t) || resolveCategory(p.category).name.toLowerCase().includes(t),
    );
  }, [q, app.products]);

  const maxW = compact ? '100%' : 720;

  return (
    <div>
      <div
        className="sticky top-0 z-20 bg-paper border-b border-line"
        style={{ padding: compact ? '16px 18px 14px' : '20px 28px 16px' }}
      >
        <div
          className="flex items-center gap-2.5 bg-surface rounded-[14px] shadow-[inset_0_0_0_1.5px_var(--line)]"
          style={{ maxWidth: maxW, margin: '0 auto', padding: '12px 14px' }}
        >
          <Icon name="search" size={20} color="var(--ink-faint)" stroke={2.2} />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products…"
            className="flex-1 bg-transparent outline-none border-none font-sans text-base"
          />
          {q && (
            <button type="button" onClick={() => setQ('')} className="grid place-items-center">
              <Icon name="x" size={18} color="var(--ink-faint)" />
            </button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: maxW, margin: '0 auto' }}>
        {!q && (
          <div style={{ padding: compact ? '20px 18px' : '24px 28px' }}>
            <div className="font-mono text-[11px] tracking-[0.12em] text-ink-faint uppercase mb-3">Recent</div>
            <div className="flex flex-wrap gap-2">
              {RECENTS.map((r) => (
                <Chip key={r} onClick={() => setQ(r)}>
                  {r}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {q && results.length === 0 && (
          <div className="text-center text-ink-faint px-[30px] py-[60px]">
            <div className="font-display font-bold text-lg text-ink">No matches for “{q}”</div>
            <p className="text-sm mt-1.5">Try a different term, or add it as a new product in Manage.</p>
          </div>
        )}

        {results.length > 0 && (
          <div
            className="bg-surface overflow-hidden"
            style={{
              borderTop: compact ? '1px solid var(--line)' : 'none',
              borderRadius: compact ? 0 : 18,
              margin: compact ? 0 : '18px 28px',
              boxShadow: compact ? 'none' : 'var(--shadow-card)',
            }}
          >
            {results.map((p) => (
              <div key={p.id} className="border-b border-line last:border-b-0">
                <ReceiptRow p={p} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
