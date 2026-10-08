// Picking a store once a city has many: Online / In a shop, a search over name, chain
// and address, and shared in-store branches grouped by chain. Used by receipts
// ("Where was this?"), Add a price ("Another store…"), My stores and the Stores screen.
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useCompare } from '../../contexts/CompareContext';
import { tokens } from '../../lib/compare/itemTypes';
import type { CatalogStore } from '../../lib/compare/types';
import { Btn, Icon, SegmentedControl, Sheet, StoreDot } from '../ui';
import { branchArea, groupByChain, isBranch, sectionLabel, storeMatches } from './compareHelpers';

export function StoreSearch({
  id,
  value,
  onChange,
  label = 'Search shops by name or area',
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 bg-surface rounded-[14px] shadow-[inset_0_0_0_1.5px_var(--line)]" style={{ padding: '0 12px', height: 50 }}>
      <Icon name="search" size={19} color="var(--ink-soft)" stroke={2.2} />
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type="search"
        value={value}
        maxLength={60}
        onChange={(e) => onChange(e.target.value)}
        placeholder={label}
        className="flex-1 min-w-0 bg-transparent outline-none border-none font-sans text-base"
      />
    </div>
  );
}

/** A chain's branches in one card: "Imtiaz · 14 branches", opened on tap. */
export function ChainGroup({
  chain,
  count,
  note,
  open,
  onToggle,
  children,
}: {
  chain: string;
  count: number;
  /** e.g. "1 picked". */
  note?: string | null;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[16px] bg-surface shadow-[inset_0_0_0_1.5px_var(--line)] overflow-hidden">
      <button type="button" onClick={onToggle} aria-expanded={open} className="w-full flex items-center gap-3 text-left" style={{ padding: '10px 14px', minHeight: 56 }}>
        <span className="grid place-items-center shrink-0 rounded-[10px] bg-accent-wash text-accent-ink" style={{ width: 32, height: 32 }}>
          <Icon name="store" size={17} stroke={2.2} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-bold text-[15px] truncate">{chain}</span>
          <span className="block text-[12.5px] text-ink-soft">
            {count} {count === 1 ? 'branch' : 'branches'}
            {note ? ` · ${note}` : ''}
          </span>
        </span>
        <Icon name="chevD" size={17} stroke={2.2} className={`shrink-0 text-ink-soft transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="border-t border-line">{children}</div>}
    </div>
  );
}

const sub = (s: CatalogStore) => (s.ownerId ? 'Only you see its prices' : s.address || (s.kind === 'online' ? 'Online prices' : 'In-store prices'));

/** Pick one store (radio list). */
export function StorePickerSheet({
  open,
  title = 'Where was this?',
  current,
  initialKind = 'online',
  initialQuery = '',
  preferChain = null,
  confirmLabel = 'Use this shop',
  onClose,
  onPick,
  onAddStore,
}: {
  open: boolean;
  title?: string;
  current: CatalogStore | null;
  initialKind?: CatalogStore['kind'];
  initialQuery?: string;
  /** Chain to list first (e.g. the one on a receipt). */
  preferChain?: string | null;
  confirmLabel?: string;
  onClose: () => void;
  onPick: (s: CatalogStore) => void;
  /** Shows "Add a shop that isn't listed" (the caller opens the store form). */
  onAddStore?: (q: string, kind: CatalogStore['kind']) => void;
}) {
  const compare = useCompare();
  const [kind, setKind] = useState<CatalogStore['kind']>(initialKind);
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<string | null>(null);
  const [opened, setOpened] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!open) return;
    setKind(current?.kind ?? initialKind);
    setQ(current ? '' : initialQuery);
    setPicked(current?.id ?? null);
    setOpened(new Set());
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const words = tokens(q);
  const searching = words.length > 0;
  const { online, branches, mine } = useMemo(() => {
    const hits = compare.stores.filter((s) => s.status !== 'closed' && storeMatches(s, words));
    const want = preferChain?.toLowerCase() ?? null;
    const first = (a: CatalogStore, b: CatalogStore) =>
      Number((b.chain ?? b.name).toLowerCase() === want) - Number((a.chain ?? a.name).toLowerCase() === want) || a.name.localeCompare(b.name);
    return {
      online: hits.filter((s) => s.kind === 'online').sort(first),
      branches: groupByChain(hits.filter(isBranch)).sort(
        (a, b) => Number(b.chain.toLowerCase() === want) - Number(a.chain.toLowerCase() === want),
      ),
      mine: hits.filter((s) => s.kind === 'physical' && !!s.ownerId).sort(first),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compare.stores, q, preferChain]);

  const chosen = picked ? compare.storeById(picked) : undefined;
  const name = `store-pick-${title.replace(/\W+/g, '-').toLowerCase()}`;
  const option = (s: CatalogStore, inGroup = false) => (
    <label
      key={s.id}
      className={`flex items-center gap-3 cursor-pointer ${inGroup ? 'border-t border-line first:border-t-0' : 'rounded-[16px] bg-surface'}`}
      style={{
        padding: '10px 14px',
        minHeight: 60,
        boxShadow: inGroup ? (picked === s.id ? 'inset 0 0 0 2px var(--accent)' : 'none') : picked === s.id ? 'inset 0 0 0 2px var(--accent)' : 'inset 0 0 0 1.5px var(--line)',
      }}
    >
      <input type="radio" name={name} checked={picked === s.id} onChange={() => setPicked(s.id)} className="m-0 shrink-0" style={{ width: 20, height: 20, accentColor: 'var(--accent)' }} />
      {!inGroup && <StoreDot store={s} size={11} />}
      <span className="flex-1 min-w-0">
        <span className="block font-bold text-[15px] truncate">{inGroup ? branchArea(s) : s.name}</span>
        <span className="block text-[12.5px] text-ink-soft truncate">{sub(s)}</span>
      </span>
    </label>
  );
  // Open: while searching, a group holding the pick, the preferred chain, or the only one.
  const isOpen = (chain: string, list: CatalogStore[]) =>
    searching || opened.has(chain) || list.some((s) => s.id === picked) || chain.toLowerCase() === preferChain?.toLowerCase() || branches.length === 1;
  const toggle = (chain: string, list: CatalogStore[]) =>
    setOpened((cur) => {
      const next = new Set(cur);
      if (isOpen(chain, list)) next.delete(chain);
      else next.add(chain);
      return next;
    });
  const nothing = kind === 'online' ? !online.length : !branches.length && !mine.length;
  // A search that finds nothing here but something on the other tab ("zamzama" under Online).
  const elsewhere = kind === 'online' ? branches.reduce((n, g) => n + g.stores.length, 0) + mine.length : online.length;
  const otherKind: CatalogStore['kind'] = kind === 'online' ? 'physical' : 'online';

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <Btn full size="lg" onClick={() => chosen && onPick(chosen)} disabled={!chosen}>
          {confirmLabel}
        </Btn>
      }
    >
      <div className="flex flex-col gap-3">
        <SegmentedControl
          label="Kind of shop"
          value={kind}
          onChange={setKind}
          options={[
            { id: 'online', label: 'Online' },
            { id: 'physical', label: 'In a shop' },
          ]}
        />
        <StoreSearch id={`${name}-search`} value={q} onChange={setQ} />
        {kind === 'online' ? (
          online.length > 0 && (
            <div role="radiogroup" aria-label="Online shops" className="flex flex-col gap-2">
              {online.map((s) => option(s))}
            </div>
          )
        ) : (
          <>
            {branches.length > 0 && (
              <div role="radiogroup" aria-labelledby={`${name}-shared`} className="flex flex-col gap-2">
                <h3 id={`${name}-shared`} className={`m-0 mt-1 ${sectionLabel}`}>
                  Shared shops
                </h3>
                {branches.map((g) => (
                  <ChainGroup key={g.chain} chain={g.chain} count={g.stores.length} open={isOpen(g.chain, g.stores)} onToggle={() => toggle(g.chain, g.stores)}>
                    {g.stores.map((s) => option(s, true))}
                  </ChainGroup>
                ))}
              </div>
            )}
            {mine.length > 0 && (
              <div role="radiogroup" aria-labelledby={`${name}-mine`} className="flex flex-col gap-2">
                <h3 id={`${name}-mine`} className={`m-0 mt-1 ${sectionLabel}`}>
                  Your shops
                </h3>
                {mine.map((s) => option(s))}
              </div>
            )}
          </>
        )}
        {nothing && (
          <div className="flex flex-col items-start gap-1">
            <p className="m-0 text-[14px] text-ink-soft">
              No {kind === 'online' ? 'online shops' : 'shops'} match{q.trim() ? ` “${q.trim()}”` : ''}.
            </p>
            {searching && elsewhere > 0 && (
              <button type="button" onClick={() => setKind(otherKind)} className="font-bold text-[14.5px] text-accent-ink" style={{ minHeight: 48 }}>
                See {elsewhere} in {otherKind === 'online' ? 'Online' : 'In a shop'}
              </button>
            )}
          </div>
        )}
        {onAddStore && (
          <>
            <button
              type="button"
              onClick={() => onAddStore(q.trim(), kind)}
              disabled={!compare.online}
              className="flex items-center gap-3 text-left rounded-[16px] text-accent-ink font-bold text-[14.5px] shadow-[inset_0_0_0_1.5px_var(--line)] disabled:opacity-40"
              style={{ padding: '12px 14px', minHeight: 56 }}
            >
              <Icon name="plus" size={18} stroke={2.4} />
              Add a shop that isn’t listed
            </button>
            <p className="m-0 text-[12.5px] text-ink-soft leading-relaxed">A shop you add is just yours — only you see its prices, until you share it.</p>
          </>
        )}
      </div>
    </Sheet>
  );
}
