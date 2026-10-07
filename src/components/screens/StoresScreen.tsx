import { useState } from 'react';
import { useCompare } from '../../contexts/CompareContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { useHint } from '../../hooks/useHint';
import { deliveryLabel } from '../../lib/compare/describe';
import { tokens } from '../../lib/compare/itemTypes';
import { CatalogStore } from '../../lib/compare/types';
import { storeLink } from '../../lib/links';
import { Btn, Icon, StoreDot, TipRow } from '../ui';
import { ManageHeader } from './manageParts';
import { CompareNotice } from './compareParts';
import { branchArea, groupByChain, isBranch, sectionLabel, storeMatches } from './compareHelpers';
import { RegionSheet, StoreFormSheet, StoresSheet } from './compareSheets';
import { ChainGroup, StoreSearch } from './storePicker';

/** Compare → Stores: the stores Where to buy compares, plus your own. */
export default function StoresScreen() {
  const compare = useCompare();
  const { compact } = useBreakpoint();
  const [cityOpen, setCityOpen] = useState(false);
  const [pickOpen, setPickOpen] = useState(false);
  const [form, setForm] = useState<'new' | CatalogStore | null>(null);
  const [q, setQ] = useState('');
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const hint = useHint('myStores', compare.ready && compare.stores.length > 1);

  const considered = new Set(compare.consideredStores.map((s) => s.id));
  const active = compare.stores.filter((s) => s.status === 'active');
  const mine = active.filter((s) => s.ownerId);
  const shared = active.filter((s) => !s.ownerId && !isBranch(s));
  const branches = active.filter(isBranch);
  const picking = compare.myStoreIds.length > 0;
  const city = compare.region?.name ?? 'your city';
  const words = tokens(q);
  const branchGroups = groupByChain(branches.filter((s) => storeMatches(s, words)));
  const groupOpen = (chain: string) => words.length > 0 || opened.has(chain) || branchGroups.length === 1;

  const row = (s: CatalogStore) => {
    const link = storeLink(s.website);
    const on = considered.has(s.id);
    return (
      <div key={s.id} className="flex items-center gap-3 bg-surface rounded-[16px] shadow-[inset_0_0_0_1.5px_var(--line)]" style={{ padding: '10px 8px 10px 14px', minHeight: 64 }}>
        <StoreDot store={s} size={13} />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[15px] truncate">{s.name}</div>
          <div className="text-[12.5px] text-ink-soft truncate">
            {s.kind === 'physical' && s.deliveryRule.type === 'none'
              ? 'In store'
              : `${s.kind === 'online' ? 'Online' : 'In store'} · ${deliveryLabel(s.deliveryRule, compare.fmt, s.kind)}`}
            {!on && ' · not compared'}
          </div>
        </div>
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="grid place-items-center rounded-full text-accent-ink"
            style={{ width: 44, height: 44 }}
            aria-label={`Open ${s.name} (opens in a new tab)`}
          >
            <Icon name="share" size={17} stroke={2.2} />
          </a>
        )}
        <button
          type="button"
          onClick={() => setForm(s)}
          className="grid place-items-center rounded-full text-ink-soft"
          style={{ width: 44, height: 44 }}
          aria-label={s.ownerId ? `Edit ${s.name}` : `About ${s.name}`}
        >
          <Icon name={s.ownerId ? 'edit' : 'chevR'} size={17} stroke={2.2} />
        </button>
      </div>
    );
  };

  // A branch inside its chain's card: area, address, and whether Where to buy compares it.
  const branchRow = (s: CatalogStore, i: number) => {
    const on = considered.has(s.id);
    return (
      <button
        key={s.id}
        type="button"
        onClick={() => setForm(s)}
        aria-label={`About ${s.name}`}
        className="w-full flex items-center gap-3 text-left"
        style={{ padding: '10px 8px 10px 14px', minHeight: 60, borderTop: i ? '1px solid var(--line)' : 'none' }}
      >
        <span className="flex-1 min-w-0">
          <span className="block font-bold text-[15px] truncate">{branchArea(s)}</span>
          <span className="block text-[12.5px] text-ink-soft truncate">{s.address || 'In store'}</span>
        </span>
        <span className={`shrink-0 text-[12px] font-bold rounded-full ${on ? 'bg-ok-wash text-ok-ink' : 'text-ink-soft'}`} style={{ padding: on ? '3px 9px' : 0 }}>
          {on ? 'In My stores' : 'Not compared'}
        </span>
        <Icon name="chevR" size={17} stroke={2.2} color="var(--ink-soft)" className="shrink-0" />
      </button>
    );
  };

  return (
    <div className="pb-8" style={{ maxWidth: compact ? '100%' : 860, margin: '0 auto' }}>
      <ManageHeader
        title="Stores"
        sub={compare.ready ? `Comparing ${compare.consideredStores.length} of ${active.length}` : undefined}
        action={
          <Btn size="sm" icon="plus" onClick={() => setForm('new')} disabled={!compare.online}>
            Add
          </Btn>
        }
      />
      <div className="flex flex-col gap-4 px-[18px] md:px-7">
        <button
          type="button"
          onClick={() => setCityOpen(true)}
          className="flex items-center gap-3 bg-surface rounded-[16px] shadow-[inset_0_0_0_1.5px_var(--line)] text-left"
          style={{ padding: '12px 14px', minHeight: 56 }}
        >
          <Icon name="pin" size={19} stroke={2.2} color="var(--accent-ink)" />
          <span className="flex-1 min-w-0">
            <span className="block text-[12px] text-ink-soft">City</span>
            <span className="block font-bold text-[15px] truncate">
              {compare.region?.name ?? (compare.regionChosen ? 'Another city' : 'Choose your city')}
              {compare.isLive && <span className="text-accent-ink font-semibold"> · shared prices on</span>}
            </span>
          </span>
          <Icon name="chevR" size={17} stroke={2.2} color="var(--ink-soft)" />
        </button>

        {!compare.online && <CompareNotice icon="wifiOff" title="You’re offline" body="You can look around; adding or editing stores needs a connection." />}
        {hint.show && <TipRow text={hint.text} onDismiss={hint.dismiss} />}

        <div className="flex items-center gap-3 rounded-[18px] bg-accent-wash" style={{ padding: 14 }}>
          <span className="flex-1 text-[14px] leading-relaxed">
            {picking ? (
              <>
                <strong>Where to buy compares the {compare.consideredStores.length} stores you picked.</strong>
              </>
            ) : branches.length ? (
              <>
                <strong>Where to buy compares the online stores here and your own.</strong> Add the branches you shop at.
              </>
            ) : (
              <>
                <strong>Where to buy compares every store here.</strong> Pick the ones you actually shop at.
              </>
            )}
          </span>
          <Btn size="sm" onClick={() => setPickOpen(true)}>
            Choose
          </Btn>
        </div>

        {!compare.ready ? (
          <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading stores">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton rounded-[16px]" style={{ height: 64 }} />
            ))}
          </div>
        ) : !active.length ? (
          <div className="flex flex-col items-center text-center gap-2 py-10 px-6">
            <span className="grid place-items-center bg-accent-wash text-accent-ink mb-2" style={{ width: 72, height: 72, borderRadius: 22 }}>
              <Icon name="store" size={32} stroke={2} />
            </span>
            <h2 className="m-0 font-display font-extrabold text-[20px]">No stores yet</h2>
            <p className="m-0 max-w-[300px] text-[14.5px] leading-relaxed text-ink-soft">
              Add the shops and delivery apps you buy from. They stay private to you.
            </p>
            <Btn className="mt-3" icon="plus" onClick={() => setForm('new')} disabled={!compare.online}>
              Add your first store
            </Btn>
          </div>
        ) : (
          <>
            {mine.length > 0 && (
              <section className="flex flex-col gap-2" aria-labelledby="own-stores">
                <h2 id="own-stores" className={`m-0 ${sectionLabel}`}>
                  Your stores · only you see these
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">{mine.map(row)}</div>
              </section>
            )}
            {shared.length > 0 && (
              <section className="flex flex-col gap-2" aria-labelledby="shared-stores">
                <h2 id="shared-stores" className={`m-0 ${sectionLabel}`}>
                  {branches.length ? `Online in ${city}` : `In ${city}`}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">{shared.map(row)}</div>
              </section>
            )}
            {branches.length > 0 && (
              <section className="flex flex-col gap-2" aria-labelledby="branch-stores">
                <h2 id="branch-stores" className={`m-0 ${sectionLabel}`}>
                  Branches · {branches.length}
                </h2>
                <p className="m-0 text-[13px] leading-snug text-ink-soft">Shared in-store prices. Add the ones you go to, and Where to buy compares them.</p>
                <StoreSearch id="stores-screen-branch-search" value={q} onChange={setQ} label="Search branches by name or area" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-start">
                  {branchGroups.map((g) => {
                    const n = g.stores.filter((s) => considered.has(s.id)).length;
                    return (
                      <ChainGroup
                        key={g.chain}
                        chain={g.chain}
                        count={g.stores.length}
                        note={n ? `${n} in My stores` : null}
                        open={groupOpen(g.chain)}
                        onToggle={() =>
                          setOpened((cur) => {
                            const next = new Set(cur);
                            if (groupOpen(g.chain)) next.delete(g.chain);
                            else next.add(g.chain);
                            return next;
                          })
                        }
                      >
                        {g.stores.map(branchRow)}
                      </ChainGroup>
                    );
                  })}
                </div>
                {words.length > 0 && !branchGroups.length && <p className="m-0 text-[14px] text-ink-soft">No branches match “{q.trim()}”.</p>}
              </section>
            )}
          </>
        )}
      </div>

      <RegionSheet open={cityOpen} onClose={() => setCityOpen(false)} />
      <StoresSheet
        open={pickOpen}
        onClose={() => setPickOpen(false)}
        onAddStore={() => {
          setPickOpen(false);
          setForm('new');
        }}
      />
      <StoreFormSheet target={form} onClose={() => setForm(null)} />
    </div>
  );
}
