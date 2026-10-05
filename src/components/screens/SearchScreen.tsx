import { useCallback, useMemo, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useCompare } from '../../contexts/CompareContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { tokens } from '../../lib/compare/itemTypes';
import { Icon, Chip } from '../ui';
import { ProductRow } from './compareParts';
import { usePriced } from './compareHelpers';

// Starting points shown before there are recent searches.
const SUGGESTED = ['Milk', 'Atta', 'Eggs', 'Bread', 'Cooking oil', 'Tea'];
const RECENTS_KEY = 'spendless-recent-searches';
const MAX_RECENTS = 8;
const MAX_RESULTS = 60;

function loadRecents(): string[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter((t) => typeof t === 'string').slice(0, MAX_RECENTS);
    }
  } catch {
    /* ignore malformed storage */
  }
  return [];
}

export default function SearchScreen() {
  const app = useApp();
  const compare = useCompare();
  const priced = usePriced();
  const { compact } = useBreakpoint();
  const [q, setQ] = useState('');
  const [recents, setRecents] = useState<string[]>(loadRecents);

  const commitRecent = useCallback((term: string) => {
    const t = term.trim().slice(0, 60);
    if (!t) return;
    setRecents((prev) => {
      const next = [t, ...prev.filter((r) => r.toLowerCase() !== t.toLowerCase())].slice(0, MAX_RECENTS);
      try {
        localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
      } catch {
        /* ignore quota / unavailable storage */
      }
      return next;
    });
  }, []);

  const clearRecents = useCallback(() => {
    setRecents([]);
    try {
      localStorage.removeItem(RECENTS_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  // Every typed word must start a word of the product's name, brand or type.
  const results = useMemo(() => {
    const words = tokens(q);
    if (!words.length) return [];
    const hits = [...compare.resolveContext.profiles.values()].filter((p) => {
      const have = [...p.words, ...(p.itemType ? tokens(p.itemType) : [])];
      return words.every((w) => have.some((x) => x.startsWith(w)));
    });
    const best = (id: string) => priced(id)[0]?.price.price ?? Infinity;
    return hits
      .map((p) => ({ p, best: best(p.product.id) }))
      .sort((a, b) => a.best - b.best)
      .slice(0, MAX_RESULTS)
      .map((x) => x.p.product);
    // priced reads the latest prices through the same context.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, compare.resolveContext]);

  const maxW = compact ? '100%' : 720;
  const pick = (term: string) => {
    setQ(term);
    commitRecent(term);
  };

  return (
    <div>
      <div className="sticky top-0 z-20 bg-paper border-b border-line flex items-center gap-2" style={{ padding: compact ? '14px 16px 12px' : '20px 28px 16px' }}>
        {app.canGoBack && (
          <button
            type="button"
            onClick={app.back}
            aria-label="Back"
            className="grid place-items-center rounded-full bg-surface shadow-[inset_0_0_0_1px_var(--line)] shrink-0"
            style={{ width: 44, height: 44 }}
          >
            <Icon name="back" size={19} stroke={2.2} />
          </button>
        )}
        <div className="flex-1 flex items-center gap-2.5 bg-surface rounded-[14px] shadow-[inset_0_0_0_1.5px_var(--line)]" style={{ maxWidth: maxW, padding: '0 14px', height: 50 }}>
          <Icon name="search" size={20} color="var(--ink-soft)" stroke={2.2} />
          <label htmlFor="product-search" className="sr-only">
            Search products
          </label>
          <input
            id="product-search"
            autoFocus
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value.slice(0, 60))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRecent(q);
            }}
            placeholder="Search products, brands…"
            className="flex-1 bg-transparent outline-none border-none font-sans text-base"
          />
          {q && (
            <button type="button" onClick={() => setQ('')} aria-label="Clear search" className="grid place-items-center" style={{ width: 36, height: 36 }}>
              <Icon name="x" size={18} color="var(--ink-soft)" />
            </button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: maxW, margin: '0 auto', padding: compact ? '18px 16px 28px' : '22px 28px 36px' }}>
        {!q && (
          <>
            {recents.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-mono text-[11px] tracking-[0.12em] text-ink-soft uppercase">Recent</div>
                  <button type="button" onClick={clearRecents} className="font-mono text-[11px] tracking-[0.06em] uppercase text-accent-ink" style={{ minHeight: 36 }}>
                    Clear
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recents.map((r) => (
                    <Chip key={r} onClick={() => pick(r)}>
                      {r}
                    </Chip>
                  ))}
                </div>
              </div>
            )}
            <div className="font-mono text-[11px] tracking-[0.12em] text-ink-soft uppercase mb-3">Try</div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED.map((r) => (
                <Chip key={r} onClick={() => pick(r)}>
                  {r}
                </Chip>
              ))}
            </div>
          </>
        )}

        {q && !results.length && (
          <div className="text-center px-6 py-14">
            <div className="font-display font-bold text-lg">No matches for “{q}”</div>
            <p className="text-sm mt-1.5 text-ink-soft leading-relaxed">Try another word, or add it as your own product from Contribute.</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="flex flex-col gap-2">
            {results.map((p) => (
              <ProductRow
                key={p.id}
                product={p}
                onClick={() => {
                  commitRecent(q);
                  app.go('detail', { id: p.id });
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
