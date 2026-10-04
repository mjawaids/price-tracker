import { useMemo, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { CURRENCIES } from '../../utils/currency';
import { Icon, Sheet } from '../ui';

export function CurrencySheet() {
  const app = useApp();
  const open = app.sheet === 'currency';
  const [query, setQuery] = useState('');
  const close = () => {
    setQuery('');
    app.openSheet(null);
  };

  const filtered = useMemo(() => {
    const t = query.trim().toLowerCase();
    if (!t) return CURRENCIES;
    return CURRENCIES.filter(
      (c) => c.code.toLowerCase().includes(t) || c.name.toLowerCase().includes(t),
    );
  }, [query]);

  return (
    <Sheet open={open} onClose={close} title="Currency">
      <div className="text-[13px] text-ink-soft -mt-1 mb-3">Used for money in Compare when your city has no currency of its own.</div>
      <div
        className="flex items-center gap-2.5 bg-surface rounded-[13px] shadow-[inset_0_0_0_1.5px_var(--line)] mb-3.5"
        style={{ padding: '11px 13px' }}
      >
        <Icon name="search" size={18} color="var(--ink-faint)" stroke={2.2} />
        <input
          type="search"
          aria-label="Search currencies"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search currencies…"
          className="flex-1 bg-transparent outline-none border-none font-sans text-base"
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="grid place-items-center" style={{ width: 36, height: 36 }}>
            <Icon name="x" size={17} color="var(--ink-faint)" />
          </button>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {filtered.length === 0 && (
          <div className="text-center text-ink-faint text-sm py-8">No currencies match “{query}”.</div>
        )}
        {filtered.map((c) => {
          const on = c.code === app.currencyCode;
          return (
            <button
              key={c.code}
              type="button"
              onClick={() => {
                app.setCurrencyCode(c.code);
                close();
              }}
              className="text-left rounded-[14px] flex items-center gap-3"
              style={{
                padding: '13px 15px',
                background: on ? 'var(--accent-wash)' : 'var(--surface)',
                boxShadow: on ? 'inset 0 0 0 1.5px var(--accent)' : 'inset 0 0 0 1.5px var(--line)',
              }}
            >
              <span
                className="grid place-items-center bg-paper font-mono font-bold text-[15px] shrink-0 shadow-[inset_0_0_0_1px_var(--line)]"
                style={{ width: 38, height: 38, borderRadius: 10 }}
              >
                {c.symbol}
              </span>
              <span className="flex-1">
                <div className="font-bold text-[15px]">{c.name}</div>
                <div className="text-[12.5px] text-ink-faint font-mono">{c.code}</div>
              </span>
              {on && (
                <span className="grid place-items-center rounded-full bg-accent text-accent-on" style={{ width: 22, height: 22 }}>
                  <Icon name="check" size={14} stroke={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
