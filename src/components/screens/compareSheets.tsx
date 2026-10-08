// Sheets for Compare: which product an item means, city + my stores, a store
// form and "add a price". All writes go through CompareContext (own rows only).
import { useEffect, useMemo, useState } from 'react';
import { useCompare } from '../../contexts/CompareContext';
import { useLists } from '../../contexts/ListsContext';
import { ListItem } from '../../types';
import { CatalogProduct, CatalogStore, PreferenceMode, StoreDeliveryRule } from '../../lib/compare/types';
import { ITEM_TYPE_BY_ID, tokens, typeFamily } from '../../lib/compare/itemTypes';
import { expand, resolveItem } from '../../lib/compare/resolve';
import { similarSize } from '../../lib/compare/units';
import { deliveryLabel, itemTypeName, modeLabel } from '../../lib/compare/describe';
import { AgeChip, Btn, Chip, ConfirmSheet, Icon, Sheet, ToggleTrack } from '../ui';
import { Field, NumIn, TextIn } from './manageParts';
import { ProductRow, StoreName } from './compareParts';
import { branchArea, groupByChain, HELD_MESSAGE, isBranch, sectionLabel, storeMatches, toPicks, unitPriceText, usePriced } from './compareHelpers';
import { ChainGroup, StorePickerSheet, StoreSearch } from './storePicker';
import { ShareShopRow, SuggestShopSheet } from './suggestSheet';

const MAX_ROWS = 40;

// ── Which product does a list item mean? ─────────────────────────────────────
export function ItemChoiceSheet({
  item,
  onClose,
  onDone,
}: {
  item: ListItem | null;
  onClose: () => void;
  /** Called with a short confirmation to show as a toast. */
  onDone?: (message: string) => void;
}) {
  const compare = useCompare();
  const lists = useLists();
  const priced = usePriced();
  const ctx = compare.resolveContext;
  const resolved = useMemo(
    () => (item ? resolveItem(ctx, { id: item.id, name: item.name, quantity: item.quantity, unit: item.unit, productId: item.productId }) : null),
    [ctx, item],
  );
  const [refId, setRefId] = useState<string | null>(null);
  const [mode, setMode] = useState<PreferenceMode>('any_size');
  const [q, setQ] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRefId(resolved?.reference?.product.id ?? null);
    setMode(resolved?.status === 'pinned' ? 'exact' : resolved?.mode ?? 'any_size');
    setQ('');
    // Reset only when a different item opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  const ref = refId ? ctx.profiles.get(refId) ?? null : null;
  const typeId = resolved?.itemType?.id ?? ref?.itemType ?? null;

  // Candidates: products of this type (and its sub-types), else name matches.
  const candidates = useMemo(() => {
    if (!resolved) return [];
    const words = tokens(q || '');
    let pool = typeId ? [...typeFamily(typeId)].flatMap((id) => ctx.byType.get(id) || []) : [];
    if (!pool.length) {
      const nameWords = tokens(resolved.item.name);
      pool = [...ctx.profiles.values()].filter((p) => nameWords.some((w) => p.words.has(w)));
    }
    if (words.length) pool = pool.filter((p) => words.every((w) => [...p.words].some((x) => x.startsWith(w))));
    const best = (id: string) => priced(id)[0]?.price.price ?? Infinity;
    return pool.sort((a, b) => best(a.product.id) - best(b.product.id)).slice(0, MAX_ROWS);
    // priced reads the latest prices through the context.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved, typeId, q, ctx]);

  const acceptable = useMemo(() => (ref ? new Set(expand(ctx, ref, mode).map((p) => p.product.id)) : new Set<string>()), [ctx, ref, mode]);
  const cheapestId = useMemo(() => {
    let best: string | null = null;
    let bestPrice = Infinity;
    for (const id of acceptable) {
      const p = priced(id)[0]?.price.price;
      if (p != null && p < bestPrice) {
        best = id;
        bestPrice = p;
      }
    }
    return best;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acceptable]);
  const usualId = resolved ? compare.preferences.get(resolved.key)?.refProductId ?? null : null;

  if (!item || !resolved) return null;
  const title = `Which ${itemTypeName(resolved).toLowerCase()}?`;

  const justOnce = () => {
    if (!ref) return;
    lists.pinProduct(item.id, ref.product.id);
    onDone?.(`${item.name}: ${ref.product.name} this time`);
    onClose();
  };
  const saveUsual = async () => {
    if (!ref || saving) return;
    setSaving(true);
    const ok = await compare.setUsual(item.name, mode, ref.product.id, mode === 'exact' ? [ref.product.id] : [ref.product.id]);
    setSaving(false);
    if (!ok) {
      onDone?.('Couldn’t save — check your connection and try again');
      return;
    }
    if (item.productId) lists.pinProduct(item.id, null);
    onDone?.(`Saved as your usual for “${item.name}”`);
    onClose();
  };

  const brand = ref?.brand ?? null;
  const modes: { id: PreferenceMode; label: string; hint: string }[] = [
    { id: 'exact', label: modeLabel('exact', brand), hint: ref ? ref.product.name : 'Only the product you pick' },
    { id: 'brand_size', label: modeLabel('brand_size', brand), hint: brand ? `Any ${brand} around this size` : 'Same brand, around this size' },
    { id: 'any_size', label: modeLabel('any_size', brand), hint: 'The cheapest one around this size — saves the most' },
  ];

  return (
    <Sheet
      open
      onClose={onClose}
      title={title}
      footer={
        <div className="flex flex-col gap-2">
          <div className="flex gap-2.5">
            <Btn variant="ghost" onClick={justOnce} disabled={!ref} className="flex-1 whitespace-nowrap min-h-[52px]">
              Just this time
            </Btn>
            <Btn onClick={() => void saveUsual()} disabled={!ref || saving || !compare.online} className="flex-[1.3] whitespace-nowrap min-h-[52px]">
              {saving ? 'Saving…' : 'Save as my usual'}
            </Btn>
          </div>
          {usualId && (
            <button
              type="button"
              onClick={async () => {
                if (await compare.clearUsual(resolved.key)) onDone?.(`Cleared your usual for “${item.name}”`);
                onClose();
              }}
              className="text-[13.5px] font-bold text-ink-soft"
              style={{ minHeight: 40 }}
            >
              Forget my usual
            </button>
          )}
        </div>
      }
    >
      <p className="m-0 -mt-1 mb-4 text-[14px] leading-relaxed text-ink-soft">
        Pick once and we’ll use it every time you write “{item.name}”.
      </p>
      <div role="radiogroup" aria-label="How strict" className="flex flex-col gap-2 mb-5">
        {modes.map((m) => {
          const on = mode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setMode(m.id)}
              className="flex items-center gap-3 text-left rounded-[14px]"
              style={{
                padding: '12px 14px',
                minHeight: 56,
                background: on ? 'var(--accent-wash)' : 'var(--surface)',
                boxShadow: on ? 'inset 0 0 0 2px var(--accent)' : 'inset 0 0 0 1.5px var(--line)',
              }}
            >
              <span
                aria-hidden
                className="shrink-0 rounded-full bg-surface"
                style={{ width: 20, height: 20, boxShadow: on ? 'inset 0 0 0 6px var(--accent)' : 'inset 0 0 0 2px var(--line)' }}
              />
              <span className="flex flex-col">
                <span className="font-extrabold text-[15px]">{m.label}</span>
                <span className={`text-[13px] ${on ? 'text-accent-ink' : 'text-ink-soft'}`}>{m.hint}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between mb-2">
        <span className={sectionLabel}>{typeId ? `${ITEM_TYPE_BY_ID.get(typeId)?.name ?? 'Products'} at your stores` : 'Products'}</span>
      </div>
      <label htmlFor="choice-search" className="sr-only">
        Search products
      </label>
      <div className="flex items-center gap-2.5 bg-surface rounded-[14px] shadow-[inset_0_0_0_1.5px_var(--line)] mb-3" style={{ padding: '0 14px', height: 48 }}>
        <Icon name="search" size={18} stroke={2.2} color="var(--ink-soft)" />
        <input
          id="choice-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value.slice(0, 60))}
          placeholder="Search brand or size"
          className="flex-1 bg-transparent border-0 outline-none text-[16px]"
        />
      </div>
      {candidates.length === 0 ? (
        <div className="text-center text-[14px] text-ink-soft leading-relaxed py-8 px-4">
          No products for “{item.name}” at your stores yet. Add one from <strong className="text-ink">Compare → Contribute</strong>.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {candidates.map((c) => {
            const offers = priced(c.product.id);
            const best = offers[0];
            const similar = !ref || mode === 'exact' || acceptable.has(c.product.id) || similarSize(c.size, ref.size);
            const per = best ? unitPriceText(c.product, best.price.price!, compare.fmt) : null;
            return (
              <ProductRow
                key={c.product.id}
                product={c.product}
                selected={c.product.id === refId}
                dim={!similar || !best}
                onClick={() => setRefId(c.product.id)}
                sub={
                  best
                    ? offers
                        .slice(0, 2)
                        .map((o) => `${compare.fmt(o.price.price!)} at ${o.store.name}`)
                        .join(' · ')
                    : 'No price at your stores yet'
                }
                age={best?.price.observedAt}
                trailing={
                  <span className="shrink-0 flex flex-col items-end gap-0.5">
                    {per && <span className="font-mono text-[12.5px] font-bold">{per}</span>}
                    {c.product.id === cheapestId && <span className="text-[10.5px] font-extrabold text-accent-ink">CHEAPEST</span>}
                    {c.product.id === usualId && <span className="text-[10.5px] font-extrabold text-ink-soft">USUAL</span>}
                  </span>
                }
              />
            );
          })}
        </div>
      )}
    </Sheet>
  );
}

// ── City picker ──────────────────────────────────────────────────────────────
function CityList({ value, onPick }: { value: string | null; onPick: (id: string) => void }) {
  const compare = useCompare();
  const regions = [...compare.regions].sort((a, b) => Number(b.status === 'live') - Number(a.status === 'live') || a.sortOrder - b.sortOrder);
  const row = (id: string, name: string, live: boolean) => {
    const on = value === id;
    return (
      <button
        key={id}
        type="button"
        onClick={() => onPick(id)}
        aria-pressed={on}
        className="text-left rounded-[14px] flex items-center gap-3"
        style={{
          padding: '12px 14px',
          minHeight: 52,
          background: on ? 'var(--accent-wash)' : 'var(--surface)',
          boxShadow: on ? 'inset 0 0 0 1.5px var(--accent)' : 'inset 0 0 0 1.5px var(--line)',
        }}
      >
        <Icon name="pin" size={17} color="var(--ink-soft)" stroke={2} />
        <span className="flex-1 font-semibold text-[15px]">{name}</span>
        {live && <span className="text-[11px] font-extrabold rounded-full bg-accent text-accent-on" style={{ padding: '3px 8px' }}>LIVE</span>}
      </button>
    );
  };
  if (!regions.length) {
    return <div className="text-[14px] text-ink-soft py-6 text-center">Connect to the internet to choose your city.</div>;
  }
  return (
    <div className="flex flex-col gap-2">
      {regions.map((r) => row(r.id, r.name, r.status === 'live'))}
      {row('other', 'Another city', false)}
    </div>
  );
}

export function RegionSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const compare = useCompare();
  return (
    <Sheet open={open} onClose={onClose} title="Your city">
      <p className="m-0 -mt-1 mb-4 text-[13.5px] leading-relaxed text-ink-soft">
        Shared store prices are live in some cities. Anywhere else, Compare works with your own stores and prices.
      </p>
      <CityList
        value={compare.regionChosen ? compare.region?.id ?? 'other' : null}
        onPick={(id) => {
          compare.setRegion(id);
          onClose();
        }}
      />
    </Sheet>
  );
}

// ── Setup: city, then the stores to compare ──────────────────────────────────
export function StoresSheet({ open, onClose, onAddStore }: { open: boolean; onClose: () => void; onAddStore: () => void }) {
  const compare = useCompare();
  const needsCity = !compare.region && compare.regions.length > 0 && !compare.regionChosen;
  const [step, setStep] = useState<'city' | 'stores'>(needsCity ? 'city' : 'stores');
  const all = compare.stores.filter((s) => s.status === 'active');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [q, setQ] = useState('');
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const startPicks = () => new Set(compare.myStoreIds.length ? compare.consideredStores.map((s) => s.id) : compare.defaultStoreIds);

  useEffect(() => {
    if (!open) return;
    setStep(needsCity ? 'city' : 'stores');
    setPicked(startPicks());
    setQ('');
    setOpened(new Set());
    // Reset when opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Stores arrive after the city is chosen.
  useEffect(() => {
    if (step === 'stores' && !compare.myStoreIds.length) setPicked(new Set(compare.defaultStoreIds));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, all.length]);

  const toggle = (id: string) =>
    setPicked((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const save = async () => {
    setSaving(true);
    // The default set = no explicit picks, so new online stores in the city are included automatically.
    await compare.setMyStores(toPicks([...picked], compare.defaultStoreIds));
    setSaving(false);
    onClose();
  };

  const checkRow = (s: CatalogStore, i: number, inGroup = false) => {
    const on = picked.has(s.id);
    return (
      <button
        key={s.id}
        type="button"
        role="checkbox"
        aria-checked={on}
        onClick={() => toggle(s.id)}
        className="w-full flex items-center gap-3 text-left"
        style={{ padding: '12px 14px', minHeight: 60, borderTop: i ? '1px solid var(--line)' : 'none' }}
      >
        <span
          aria-hidden
          className={`grid place-items-center shrink-0 rounded-[8px] ${on ? 'bg-accent text-accent-on' : ''}`}
          style={{ width: 24, height: 24, boxShadow: on ? 'none' : 'inset 0 0 0 2px var(--line)' }}
        >
          {on && <Icon name="check" size={14} stroke={3} />}
        </span>
        <span className="flex-1 min-w-0 flex flex-col">
          {inGroup ? <span className="font-bold text-[15px] truncate">{branchArea(s)}</span> : <StoreName store={s} className="font-bold text-[15px]" />}
          <span className="text-[12.5px] text-ink-soft truncate">
            {s.ownerId ? 'Your store · only you see it' : inGroup ? s.address || 'In store' : deliveryLabel(s.deliveryRule, compare.fmt, s.kind)}
          </span>
        </span>
      </button>
    );
  };

  const group = (title: string, stores: CatalogStore[]) =>
    stores.length > 0 && (
      <div className="flex flex-col gap-2">
        <div className={sectionLabel}>{title}</div>
        <div className="flex flex-col rounded-[16px] bg-surface shadow-card overflow-hidden">{stores.map((s, i) => checkRow(s, i))}</div>
      </div>
    );

  const words = tokens(q);
  const searching = words.length > 0;
  const branches = all.filter(isBranch);
  const branchGroups = groupByChain(branches.filter((s) => storeMatches(s, words)));
  const isOpen = (chain: string) => searching || opened.has(chain) || branchGroups.length === 1;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={step === 'city' ? 'Where do you shop?' : 'Stores you shop at'}
      footer={
        step === 'stores' ? (
          <div className="flex gap-2.5">
            <Btn variant="ghost" size="lg" onClick={onClose} className="flex-1">
              Skip
            </Btn>
            <Btn size="lg" onClick={() => void save()} disabled={saving || !picked.size || !compare.online} className="flex-[1.4]">
              {saving ? 'Saving…' : 'Save'}
            </Btn>
          </div>
        ) : (
          <Btn variant="ghost" size="lg" full onClick={onClose}>
            Skip for now
          </Btn>
        )
      }
    >
      {step === 'city' ? (
        <>
          <p className="m-0 -mt-1 mb-4 text-[14px] leading-relaxed text-ink-soft">Pick your city so we compare stores near you.</p>
          <CityList
            value={null}
            onPick={(id) => {
              compare.setRegion(id);
              setStep('stores');
            }}
          />
        </>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="m-0 -mt-1 text-[14px] leading-relaxed text-ink-soft">We’ll compare prices at these. Change them any time.</p>
          {compare.region && (
            <button
              type="button"
              onClick={() => setStep('city')}
              className="flex items-center gap-3 rounded-[16px] bg-surface text-left shadow-[inset_0_0_0_1.5px_var(--line)]"
              style={{ padding: '12px 14px', minHeight: 56 }}
            >
              <Icon name="pin" size={19} stroke={2.2} color="var(--accent-ink)" />
              <span className="flex-1 flex flex-col">
                <span className="font-extrabold text-[15px]">{compare.region.name}</span>
                <span className="text-[12.5px] text-ink-soft">{compare.isLive ? 'Shared prices are live here' : 'Your own stores and prices'}</span>
              </span>
              <span className="font-extrabold text-[13.5px] text-accent-ink">Change</span>
            </button>
          )}
          {compare.refreshing && !all.length ? (
            <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading stores">
              {[0, 1, 2].map((i) => (
                <div key={i} className="skeleton rounded-[16px]" style={{ height: 60 }} />
              ))}
            </div>
          ) : !all.length ? (
            <div className="text-[14px] text-ink-soft leading-relaxed text-center py-4">
              No stores yet{compare.region ? ` in ${compare.region.name}` : ''}. Add the ones you shop at and their prices — only you see them.
            </div>
          ) : (
            <>
              {group('Deliver to you', all.filter((s) => s.kind === 'online'))}
              {group('Your shops', all.filter((s) => s.kind === 'physical' && s.ownerId))}
              {branches.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className={sectionLabel}>In a shop near you</div>
                  <p className="m-0 text-[13px] leading-snug text-ink-soft">Tick the branches you go to — Where to buy compares them too.</p>
                  <StoreSearch id="stores-branch-search" value={q} onChange={setQ} label="Search branches by name or area" />
                  {branchGroups.map((g) => {
                    const n = g.stores.filter((s) => picked.has(s.id)).length;
                    return (
                      <ChainGroup
                        key={g.chain}
                        chain={g.chain}
                        count={g.stores.length}
                        note={n ? `${n} ticked` : null}
                        open={isOpen(g.chain)}
                        onToggle={() =>
                          setOpened((cur) => {
                            const next = new Set(cur);
                            if (isOpen(g.chain)) next.delete(g.chain);
                            else next.add(g.chain);
                            return next;
                          })
                        }
                      >
                        {g.stores.map((s, i) => checkRow(s, i, true))}
                      </ChainGroup>
                    );
                  })}
                  {searching && !branchGroups.length && <p className="m-0 text-[14px] text-ink-soft">No branches match “{q.trim()}”.</p>}
                </div>
              )}
            </>
          )}
          <button type="button" onClick={onAddStore} className="flex items-center gap-2 font-extrabold text-[14px] text-accent-ink self-start" style={{ minHeight: 44 }}>
            <Icon name="plus" size={18} stroke={2.6} />
            Add a store that’s missing
          </button>
        </div>
      )}
    </Sheet>
  );
}

/** One choice of several (a radio-style row): the store's delivery, what's wrong with a price. */
function OptionRow({ on, label, desc, onClick }: { on: boolean; label: string; desc: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className="text-left rounded-[14px] flex items-center gap-3"
      style={{
        padding: '10px 14px',
        background: on ? 'var(--accent-wash)' : 'var(--surface)',
        boxShadow: on ? 'inset 0 0 0 1.5px var(--accent)' : 'inset 0 0 0 1.5px var(--line)',
      }}
    >
      <span aria-hidden className="shrink-0 bg-paper rounded-full" style={{ width: 18, height: 18, boxShadow: on ? '0 0 0 5px var(--accent) inset' : 'inset 0 0 0 2px var(--line)' }} />
      <span>
        <span className="block font-bold text-[14.5px]">{label}</span>
        <span className="block text-[12px] text-ink-soft">{desc}</span>
      </span>
    </button>
  );
}

// ── A store of your own ──────────────────────────────────────────────────────
const RULES: { id: StoreDeliveryRule['type']; label: string; desc: string }[] = [
  { id: 'none', label: 'No delivery', desc: 'In store or pickup only' },
  { id: 'free', label: 'Always free', desc: 'Never charges delivery' },
  { id: 'over', label: 'Free over an amount', desc: 'Free above a minimum, else a fee' },
  { id: 'flat', label: 'Flat fee', desc: 'The same fee on every order' },
];

export function StoreFormSheet({
  target,
  initialName = '',
  initialKind = 'physical',
  initialAddress = '',
  onClose,
  onSaved,
}: {
  target: 'new' | CatalogStore | null;
  /** Prefill for a new store (e.g. the shop named on a receipt, and the area it prints). */
  initialName?: string;
  initialKind?: CatalogStore['kind'];
  initialAddress?: string;
  onClose: () => void;
  onSaved?: (s: CatalogStore) => void;
}) {
  const compare = useCompare();
  const store = target && target !== 'new' ? target : null;
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'online' | 'physical'>('physical');
  const [rule, setRule] = useState<StoreDeliveryRule['type']>('none');
  const [fee, setFee] = useState('');
  const [threshold, setThreshold] = useState('');
  const [minOrder, setMinOrder] = useState('');
  const [address, setAddress] = useState('');
  const [website, setWebsite] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [sharing, setSharing] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [delError, setDelError] = useState('');

  useEffect(() => {
    const r = store?.deliveryRule;
    setName(store?.name ?? initialName);
    setKind(store?.kind ?? initialKind);
    setRule(r?.type ?? 'none');
    setFee(r && 'fee' in r ? String(r.fee) : '');
    setThreshold(r && 'threshold' in r ? String(r.threshold) : '');
    setMinOrder(r?.minOrder ? String(r.minOrder) : '');
    setAddress(store?.address ?? initialAddress);
    setWebsite(store?.website ?? '');
    setError('');
    setSaving(false);
    setSharing(false);
    setConfirmDel(false);
    setDeleting(false);
    setDelError('');
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!target) return null;
  const readonly = !!store && !store.ownerId;
  // Suggesting your shop as a shared one: its own sheet, back to this one after.
  if (store && sharing) return <SuggestShopSheet store={store} onClose={() => setSharing(false)} />;
  // Deleting can't be undone (its prices go with it): asked first, in place of the form.
  if (store && confirmDel) {
    const n = compare.pricesAtStore(store.id).filter((p) => p.price != null).length;
    const del = async () => {
      setDeleting(true);
      setDelError('');
      const ok = await compare.deleteStore(store.id);
      setDeleting(false);
      if (ok) onClose();
      else setDelError('Couldn’t delete — check your connection and try again.');
    };
    return (
      <ConfirmSheet
        open
        title={`Delete ${store.name}?`}
        confirmLabel="Delete store"
        busyLabel="Deleting…"
        busy={deleting}
        error={delError}
        onConfirm={() => void del()}
        onClose={() => {
          setConfirmDel(false);
          setDelError('');
        }}
      >
        <p className="m-0 text-[14.5px] leading-relaxed text-ink-soft">
          {n ? `Its ${n === 1 ? 'price is' : `${n} prices are`} deleted too, and` : 'It’s deleted, and'} planned items on your lists lose this store. This
          can’t be undone.
        </p>
      </ConfirmSheet>
    );
  }

  const n = (v: string) => Math.max(0, Math.min(1e6, parseFloat(v) || 0));
  const buildRule = (): StoreDeliveryRule => {
    const min = minOrder.trim() ? { minOrder: n(minOrder) } : {};
    if (rule === 'free') return { type: 'free', ...min };
    if (rule === 'flat') return { type: 'flat', fee: n(fee), ...min };
    if (rule === 'over') return { type: 'over', threshold: n(threshold), fee: n(fee), ...min };
    return { type: 'none' };
  };

  const save = async () => {
    if (!name.trim()) {
      setError('Give the store a name.');
      return;
    }
    if (website.trim() && !/^https?:\/\/\S+$/i.test(website.trim())) {
      setError('Website must start with https:// (or leave it empty).');
      return;
    }
    setSaving(true);
    setError('');
    const regionId = compare.region?.id ?? null;
    const input = { name, kind, regionId, deliveryRule: buildRule(), address: kind === 'physical' ? address : null, website: website.trim() || null };
    const row = store ? await compare.updateStore(store.id, input) : await compare.addStore(input);
    setSaving(false);
    if (!row) {
      setError('Couldn’t save — check your connection and try again.');
      return;
    }
    onSaved?.(row);
    onClose();
  };

  if (readonly) {
    const st = store!;
    const city = compare.region?.name ?? 'your city';
    if (!isBranch(st)) {
      return (
        <Sheet open onClose={onClose} title={st.name}>
          <p className="m-0 text-[14px] leading-relaxed text-ink-soft">
            {deliveryLabel(st.deliveryRule, compare.fmt, st.kind)}. This is a shared store in {city}; its details come from the store.
          </p>
        </Sheet>
      );
    }
    // A shared in-store branch: where it is, and whether Where to buy compares it (picked,
    // or in the default set once the user's own shop moved into it).
    const base = compare.myStoreIds.length ? compare.myStoreIds : compare.defaultStoreIds;
    const inMine = base.includes(st.id);
    const toggleMine = async () => {
      setSaving(true);
      setError('');
      const ok = await compare.setMyStores(toPicks(inMine ? base.filter((id) => id !== st.id) : [...base, st.id], compare.defaultStoreIds));
      setSaving(false);
      if (ok) onClose();
      else setError('Couldn’t save — check your connection and try again.');
    };
    return (
      <Sheet
        open
        onClose={onClose}
        title={st.name}
        footer={
          <Btn full size="lg" variant={inMine ? 'ghost' : 'primary'} icon={inMine ? undefined : 'plus'} onClick={() => void toggleMine()} disabled={saving || !compare.online}>
            {saving ? 'Saving…' : inMine ? 'Remove from My stores' : 'Add to My stores'}
          </Btn>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="flex gap-3 items-start text-[14.5px] leading-snug">
            <Icon name="pin" size={18} stroke={2.2} color="var(--accent-ink)" className="shrink-0 mt-0.5" />
            <span>{st.address || `${st.chain ?? st.name} branch in ${city} (no street address published)`}</span>
          </div>
          {st.phone && (
            <div className="flex gap-3 items-center text-[14.5px]">
              <Icon name="smartphone" size={18} stroke={2.2} color="var(--accent-ink)" className="shrink-0" />
              <span className="font-mono">{st.phone}</span>
            </div>
          )}
          <p className="m-0 text-[13.5px] leading-relaxed text-ink-soft">
            A shared in-store branch in {city}. Its prices come from shoppers’ receipts and prices.{' '}
            {inMine ? 'Where to buy compares it.' : 'Add it to My stores and Where to buy compares it too.'}
          </p>
          {error && (
            <div role="alert" className="text-[13px]" style={{ color: 'var(--danger)' }}>
              {error}
            </div>
          )}
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={store ? 'Edit your store' : 'Add a store'}
      footer={
        <div className="flex gap-2.5">
          {store && (
            <Btn variant="ghost" icon="trash" onClick={() => setConfirmDel(true)} disabled={!compare.online}>
              Delete
            </Btn>
          )}
          <Btn full size="lg" onClick={() => void save()} disabled={saving || !compare.online}>
            {saving ? 'Saving…' : store ? 'Save changes' : 'Add store'}
          </Btn>
        </div>
      }
    >
      <p className="m-0 -mt-1 mb-4 text-[13px] leading-relaxed text-ink-soft">
        Stores you add are private — only you see them and their prices, unless you share a shop.
      </p>
      {store && kind === 'physical' && <ShareShopRow store={store} onShare={() => setSharing(true)} onError={setError} />}
      <Field label="Store name">
        <TextIn value={name} onChange={(e) => setName(e.target.value.slice(0, 80))} placeholder="e.g. Aslam Gosht" />
      </Field>
      <Field label="Type" group>
        <div className="flex gap-2">
          <Chip active={kind === 'physical'} onClick={() => setKind('physical')} className="flex-1 justify-center">
            In store
          </Chip>
          <Chip active={kind === 'online'} onClick={() => setKind('online')} className="flex-1 justify-center">
            Online
          </Chip>
        </div>
      </Field>
      {kind === 'physical' && (
        <Field label="Area (optional)">
          <TextIn value={address} onChange={(e) => setAddress(e.target.value.slice(0, 200))} placeholder="e.g. Gulshan Block 5" />
        </Field>
      )}
      <Field label="Delivery" group>
        <div className="flex flex-col gap-2">
          {RULES.map((o) => (
            <OptionRow key={o.id} on={rule === o.id} label={o.label} desc={o.desc} onClick={() => setRule(o.id)} />
          ))}
        </div>
      </Field>
      {(rule === 'flat' || rule === 'over') && (
        <div className="flex gap-3">
          {rule === 'over' && (
            <div className="flex-1">
              <Field label="Free over">
                <NumIn currency={compare.currency} value={threshold} onChange={(e) => setThreshold(e.target.value)} />
              </Field>
            </div>
          )}
          <div className="flex-1">
            <Field label="Delivery fee">
              <NumIn currency={compare.currency} value={fee} onChange={(e) => setFee(e.target.value)} />
            </Field>
          </div>
        </div>
      )}
      {rule !== 'none' && (
        <Field label="Minimum order (optional)">
          <NumIn currency={compare.currency} value={minOrder} onChange={(e) => setMinOrder(e.target.value)} />
        </Field>
      )}
      {kind === 'online' && (
        <Field label="Website (optional)">
          <TextIn type="url" inputMode="url" value={website} onChange={(e) => setWebsite(e.target.value.slice(0, 300))} placeholder="https://" />
        </Field>
      )}
      {error && (
        <div role="alert" className="text-[13px] mb-2" style={{ color: 'var(--danger)' }}>
          {error}
        </div>
      )}
    </Sheet>
  );
}

// ── Add a price ──────────────────────────────────────────────────────────────

export function PriceSheet({
  product,
  storeId,
  onClose,
  onDone,
}: {
  product: CatalogProduct | null;
  storeId?: string | null;
  onClose: () => void;
  onDone?: (message: string) => void;
}) {
  const compare = useCompare();
  const [store, setStore] = useState<string | null>(null);
  const [price, setPrice] = useState('');
  const [outOfStock, setOutOfStock] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [choosing, setChoosing] = useState(false);
  // Chips for the stores you compare (plus the one picked); any other store via the picker.
  const chipStores = compare.consideredStores.filter((s) => s.status === 'active');
  const pickedStore = store ? compare.storeById(store) : undefined;
  const stores = pickedStore && !chipStores.some((s) => s.id === pickedStore.id) ? [...chipStores, pickedStore] : chipStores;
  const anyStores = compare.stores.some((s) => s.status === 'active');

  // Shows the store's current price, so a correction starts from it.
  const pickStore = (s: string | null) => {
    setStore(s);
    const cur = s && product ? compare.priceAt(s, product.id) : undefined;
    setPrice(cur?.price != null ? String(cur.price) : '');
  };

  useEffect(() => {
    if (!product) return;
    // Default to a store you compare that already sells it, else your first store.
    const considered = new Set(compare.consideredStores.map((x) => x.id));
    const sells = compare.pricesFor(product.id).find((x) => considered.has(x.storeId))?.storeId;
    pickStore(storeId ?? sells ?? compare.consideredStores[0]?.id ?? null);
    setOutOfStock(false);
    setError('');
    setSaving(false);
  }, [product?.id, storeId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!product) return null;

  const save = async () => {
    const value = parseFloat(price);
    if (!store) {
      setError('Pick the store.');
      return;
    }
    if (!outOfStock && !(value > 0 && value < 10_000_000)) {
      setError('Enter the price you saw.');
      return;
    }
    setSaving(true);
    setError('');
    const status = await compare.reportPrice({ storeId: store, productId: product.id, price: outOfStock ? null : value, isAvailable: !outOfStock });
    setSaving(false);
    if (!status) {
      setError('Couldn’t save — check your connection and try again.');
      return;
    }
    const shared = !compare.storeById(store)?.ownerId;
    onDone?.(
      status === 'pending'
        ? HELD_MESSAGE
        : shared
          ? 'Thanks — price saved and shared'
          : 'Price saved',
    );
    onClose();
  };

  return (
    <>
      <Sheet
        open={!choosing}
        onClose={onClose}
        title="Add a price"
        footer={
          <Btn full size="lg" onClick={() => void save()} disabled={saving || !compare.online}>
            {saving ? 'Saving…' : 'Save price'}
          </Btn>
        }
      >
        <div className="font-bold text-[16px] mb-1">{product.name}</div>
        <p className="m-0 mb-4 text-[13px] leading-relaxed text-ink-soft">
          {compare.storeById(store ?? '')?.ownerId ? 'This is your store — only you see the price.' : 'Prices at shared stores help everyone in your city. Your name is never shown.'}
        </p>
        <Field label="Store" group>
          {anyStores ? (
            <div className="flex flex-wrap gap-2">
              {stores.map((s) => (
                <Chip key={s.id} active={store === s.id} onClick={() => pickStore(s.id)}>
                  {s.name}
                </Chip>
              ))}
              <Chip onClick={() => setChoosing(true)} className="text-accent-ink">
                Another store…
              </Chip>
            </div>
          ) : (
            <div className="text-[13.5px] text-ink-soft">Add a store first (Compare → Stores).</div>
          )}
        </Field>
        {!outOfStock && (
          <Field label="Price for one pack">
            <NumIn currency={compare.currency} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" />
          </Field>
        )}
        <button
          type="button"
          role="switch"
          aria-checked={outOfStock}
          onClick={() => setOutOfStock((v) => !v)}
          className="w-full flex items-center justify-between gap-3 text-left mb-2"
          style={{ minHeight: 48 }}
        >
          <span className="font-semibold text-[15px]">Out of stock there</span>
          <ToggleTrack on={outOfStock} />
        </button>
        {error && (
          <div role="alert" className="text-[13px]" style={{ color: 'var(--danger)' }}>
            {error}
          </div>
        )}
      </Sheet>
      <StorePickerSheet
        open={choosing}
        title="Which store?"
        confirmLabel="Use this store"
        current={pickedStore ?? null}
        initialKind={pickedStore?.kind ?? 'physical'}
        onClose={() => setChoosing(false)}
        onPick={(s) => {
          pickStore(s.id);
          setChoosing(false);
        }}
      />
    </>
  );
}

// ── "Wrong price?" on a shared store's price ─────────────────────────────────
type WrongKind = 'price' | 'gone' | 'wrong';
const WRONG: { id: WrongKind; label: string; desc: string }[] = [
  { id: 'price', label: 'It’s a different price', desc: 'Add the price you saw' },
  { id: 'gone', label: 'They don’t sell it any more', desc: 'Not on the shelf, or not stocked now' },
  { id: 'wrong', label: 'It’s wrong, I don’t know the price', desc: 'Left out of plans once someone agrees' },
];

/**
 * Says a shared store's price is wrong: with the right price (a normal report, which
 * may be held), as out of stock, or just "wrong" (a `dispute` report: two people
 * mark the price as disputed, and Where to buy leaves it out until a newer price).
 */
export function WrongPriceSheet({
  product,
  store,
  onClose,
  onDone,
}: {
  product: CatalogProduct;
  store: CatalogStore | null;
  onClose: () => void;
  onDone?: (message: string) => void;
}) {
  const compare = useCompare();
  const [kind, setKind] = useState<WrongKind | null>(null);
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    setKind(null);
    setPrice('');
    setError('');
    setSaving(false);
  }, [store?.id, product.id]);

  const shown = store ? compare.priceAt(store.id, product.id) : undefined;
  if (!store || shown?.price == null) return null;
  const at = { storeId: store.id, productId: product.id };

  const pick = (k: WrongKind) => {
    setKind(k);
    setError('');
  };

  const save = async () => {
    const value = parseFloat(price);
    if (!kind) {
      setError('Pick what’s wrong with it.');
      return;
    }
    if (kind === 'price' && !(value > 0 && value < 10_000_000)) {
      setError('Enter the price you saw.');
      return;
    }
    setSaving(true);
    setError('');
    const status = await compare.reportPrice(
      kind === 'price'
        ? { ...at, price: value }
        : kind === 'gone'
          ? { ...at, price: null, isAvailable: false }
          : { ...at, price: shown.price, source: 'dispute' },
    );
    setSaving(false);
    if (!status) {
      setError('Couldn’t send — check your connection and try again.');
      return;
    }
    onDone?.(
      kind === 'price'
        ? status === 'pending'
          ? HELD_MESSAGE
          : 'Thanks — price saved and shared'
        : kind === 'gone'
          ? 'Thanks — marked as out of stock there'
          : status === 'flagged'
            ? 'Thanks — it’s now marked as wrong and left out of plans'
            : 'Thanks — once someone else says so too, it’s left out of plans',
    );
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="Wrong price?"
      footer={
        <Btn full size="lg" onClick={() => void save()} disabled={saving || !compare.online}>
          {saving ? 'Sending…' : kind === 'price' ? 'Save price' : 'Send'}
        </Btn>
      }
    >
      <div className="font-bold text-[16px] mb-1">{product.name}</div>
      <p className="m-0 mb-4 text-[13px] leading-relaxed text-ink-soft">
        {store.name} · <span className="font-mono font-bold text-ink">{compare.fmt(shown.price)}</span>
        <AgeChip observedAt={shown.observedAt} className="ml-1.5 align-middle" />
      </p>
      <Field label="What’s wrong?" group>
        <div className="flex flex-col gap-2">
          {WRONG.map((o) => (
            <OptionRow key={o.id} on={kind === o.id} label={o.label} desc={o.desc} onClick={() => pick(o.id)} />
          ))}
        </div>
      </Field>
      {kind === 'price' && (
        <Field label="Price for one pack">
          <NumIn currency={compare.currency} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" />
        </Field>
      )}
      {error && (
        <div role="alert" className="text-[13px] mb-2" style={{ color: 'var(--danger)' }}>
          {error}
        </div>
      )}
      <p className="m-0 text-[12.5px] leading-relaxed text-ink-soft">Your name is never shown.</p>
    </Sheet>
  );
}
