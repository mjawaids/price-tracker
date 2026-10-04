import { ReactNode, useEffect, useMemo, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useLists } from '../../contexts/ListsContext';
import { useCompare } from '../../contexts/CompareContext';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { useHint } from '../../hooks/useHint';
import { Plan } from '../../lib/compare/optimizer';
import { ResolvedItem } from '../../lib/compare/resolve';
import { choiceLabel, deliveryLabel, deliveryNote } from '../../lib/compare/describe';
import { storeLink } from '../../lib/links';
import { Btn, CoachMark, EmptyState, Icon, Toast } from '../ui';
import { ItemChoiceSheet, StoreFormSheet, StoresSheet } from './compareSheets';
import { CompareNotice, FreshnessNote, StoreName } from './compareParts';
import { productSizeText, sectionLabel } from './compareHelpers';

type OptionId = 'cheapest' | 'oneStop' | 'delivered' | 'fewerStops';

function PlanSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-4 pt-3" aria-busy="true" aria-label="Working out your plan">
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton rounded-[16px]" style={{ height: 76 }} />
        ))}
      </div>
      <div className="skeleton rounded-[22px]" style={{ height: 120 }} />
      <div className="skeleton rounded-[20px]" style={{ height: 180 }} />
    </div>
  );
}

export default function PlanScreen() {
  const app = useApp();
  const lists = useLists();
  const compare = useCompare();
  const onboarding = useOnboarding();
  const { compact } = useBreakpoint();
  const listId = (app.params.listId as string) || lists.activeList?.id || '';
  const list = lists.lists.find((l) => l.id === listId) ?? null;
  const { itemsForList } = lists;
  const items = useMemo(() => itemsForList(listId).filter((i) => !i.done), [itemsForList, listId]);

  const [option, setOption] = useState<OptionId>('cheapest');
  const [choiceFor, setChoiceFor] = useState<string | null>(null);
  const [storesOpen, setStoresOpen] = useState(false);
  const [storeForm, setStoreForm] = useState<'new' | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // First "Where to buy": the short walkthrough; no city yet: ask for it.
  const { maybeStartCompareTour } = onboarding;
  useEffect(() => {
    maybeStartCompareTour();
  }, [maybeStartCompareTour]);
  useEffect(() => {
    if (compare.ready && !compare.regionChosen && compare.regions.length) setStoresOpen(true);
  }, [compare.ready, compare.regionChosen, compare.regions.length]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  const { planFor } = compare;
  const result = useMemo(() => planFor(items), [planFor, items]);
  const { set, resolved } = result;
  const byId = useMemo(() => new Map(resolved.map((r) => [r.item.id, r])), [resolved]);

  const options = (
    [
      ['cheapest', set.cheapest],
      ['oneStop', set.oneStop],
      ['delivered', set.delivered],
      ['fewerStops', set.fewerStops],
    ] as [OptionId, Plan | null][]
  ).filter((o): o is [OptionId, Plan] => !!o[1]);
  const current = options.find(([id]) => id === option)?.[1] ?? set.cheapest;

  const assumed = resolved.filter((r) => r.status === 'assumed' && current?.covered.includes(r.item.id));
  const notCompared = resolved.filter((r) => r.status === 'unknown' || r.status === 'unpriced');
  const missingHere = current ? resolved.filter((r) => current.uncovered.includes(r.item.id)) : [];
  const hAssumed = useHint('assumed', assumed.length > 0);
  const hMyStores = useHint('myStores', compare.consideredStores.length > 6 && !compare.myStoreIds.length);

  const baselineStore = set.baseline ? compare.storeById(set.baseline.storeId) : undefined;
  // The baseline prices everything the cheapest plan covers, so it only compares
  // fairly with a plan that covers as much.
  const fullCover = (p: Plan | null) => !!p && !!set.cheapest && p.covered.length >= set.cheapest.covered.length;
  const savings = current && set.baseline && fullCover(current) ? Math.max(0, set.baseline.total - current.total) : 0;
  const dates = current
    ? current.stores.flatMap((s) => s.lines.map((l) => compare.priceAt(s.storeId, l.option.productId)?.observedAt ?? '')).filter(Boolean)
    : [];

  const back = () => (app.canGoBack ? app.back() : app.tab('lists'));
  const use = () => {
    if (!current || !list) return;
    lists.applyPlan(
      list.id,
      current.stores.flatMap((s) => s.lines.map((l) => ({ itemId: l.key, storeId: s.storeId, productId: l.option.productId, price: l.option.total }))),
    );
    compare.recordPlan({
      listId: list.id,
      total: current.total,
      baselineTotal: set.baseline?.total ?? null,
      savings,
      storeCount: current.stores.length,
      itemCount: current.covered.length,
    });
    back();
  };

  const optionText = (id: OptionId, p: Plan) => {
    const n = p.stores.length;
    const first = compare.storeById(p.stores[0]?.storeId ?? '')?.name ?? '';
    const where = n === 1 ? first : `${n} stores`;
    // A choice that leaves items out says so first: its total isn't comparable.
    const sub = fullCover(p) ? where : `${p.covered.length} of ${p.covered.length + p.uncovered.length} items`;
    const label = id === 'cheapest' ? 'Cheapest' : id === 'oneStop' ? 'One stop' : id === 'delivered' ? 'Delivered' : 'Fewer stops';
    return { label, sub, partial: !fullCover(p) };
  };

  const header = (
    <div className="sticky top-0 z-20 bg-paper flex items-center gap-3" style={{ padding: compact ? '14px 16px 8px' : '20px 28px 8px' }}>
      <button
        type="button"
        onClick={back}
        aria-label="Back to your list"
        className="grid place-items-center rounded-full bg-surface shadow-[inset_0_0_0_1px_var(--line)] shrink-0"
        style={{ width: 44, height: 44 }}
      >
        <Icon name="back" size={20} stroke={2.2} />
      </button>
      <div className="min-w-0">
        <h1 className="m-0 font-display font-extrabold text-[22px] tracking-[-0.02em]">Where to buy</h1>
        <div className="text-[13px] text-ink-soft truncate">
          {list?.name ?? 'Your list'} · {items.length} {items.length === 1 ? 'item' : 'items'}
          {compare.region ? ` · ${compare.region.name}` : ''}
        </div>
      </div>
    </div>
  );

  const sheets = (
    <>
      <ItemChoiceSheet item={choiceFor ? items.find((i) => i.id === choiceFor) ?? null : null} onClose={() => setChoiceFor(null)} onDone={setToast} />
      <StoresSheet open={storesOpen} onClose={() => setStoresOpen(false)} onAddStore={() => setStoreForm('new')} />
      <StoreFormSheet target={storeForm} onClose={() => setStoreForm(null)} />
    </>
  );
  const toastEl = toast && (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50" style={{ width: 'min(440px, calc(100vw - 32px))' }}>
      <Toast message={toast} icon="check" />
    </div>
  );

  const wrap = (body: ReactNode) => (
    <div className="min-h-full flex flex-col" style={{ maxWidth: compact ? '100%' : 860, margin: '0 auto' }}>
      {header}
      {body}
      {sheets}
      {toastEl}
    </div>
  );

  if (!compare.ready) return wrap(<PlanSkeleton />);
  if (!items.length) {
    return wrap(<EmptyState icon="lists" title="Nothing to plan yet" body="Add a few items to your list, then come back to see where they’re cheapest." cta="Back to my list" onCta={back} />);
  }
  if (!set.cheapest) {
    const noStores = !compare.consideredStores.length;
    return wrap(
      <div className="flex flex-col gap-4" style={{ padding: compact ? '8px 16px 32px' : '8px 28px 40px' }}>
        {!compare.online && <CompareNotice icon="wifiOff" title="You’re offline" body="Connect to load prices. Your list still works." />}
        <EmptyState
          icon="tag"
          title={noStores ? 'Add the stores you shop at' : 'No prices for these items yet'}
          body={
            noStores
              ? compare.regionChosen && !compare.isLive
                ? `Shared prices aren’t live in ${compare.region?.name ?? 'your city'} yet. Add your stores and the prices you see, and Where to buy works for you right away.`
                : 'Pick your stores, then we’ll compare prices there.'
              : 'None of your stores have prices for these items yet. Add a price you’ve seen — it takes a few seconds.'
          }
          cta={noStores ? 'Choose stores' : 'Add a price'}
          onCta={() => (noStores ? setStoresOpen(true) : app.go('contribute'))}
        />
      </div>,
    );
  }

  return wrap(
    <>
      <div className="flex flex-col gap-4" style={{ padding: compact ? '6px 16px 24px' : '6px 28px 32px' }}>
        {!compare.online && <CompareNotice icon="wifiOff" title="You’re offline" body="This plan uses the prices saved on this device." />}

        {options.length > 1 && (
          <div role="radiogroup" aria-label="Plan options" className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(options.length, compact ? 3 : 4)}, minmax(0, 1fr))` }}>
            {options.map(([id, p]) => {
              const on = current === p;
              const t = optionText(id, p);
              const extra = set.cheapest && p !== set.cheapest && !t.partial ? p.total - set.cheapest.total : 0;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setOption(id)}
                  className="text-left rounded-[16px] flex flex-col"
                  style={{
                    padding: '10px 11px',
                    minHeight: 76,
                    background: on ? 'var(--accent-wash)' : 'var(--surface)',
                    boxShadow: on ? 'inset 0 0 0 2px var(--accent)' : 'inset 0 0 0 1.5px var(--line)',
                  }}
                >
                  <span className={`text-[12px] font-extrabold ${on ? 'text-accent-ink' : 'text-ink-soft'}`}>{t.label}</span>
                  <span className="font-mono text-[15px] font-bold mt-0.5">{compare.fmt(p.total)}</span>
                  <span className={`text-[11.5px] truncate ${t.partial ? 'text-warn-ink font-semibold' : 'text-ink-soft'}`}>
                    {extra > 0.5 ? `+${compare.fmt(extra)} · ${t.sub}` : t.sub}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {current && (
          <div className="bg-ink text-paper rounded-[22px]" style={{ padding: '18px 20px' }}>
            <div className="font-mono text-[11px] tracking-[0.14em] uppercase opacity-70">Estimated total</div>
            <div className="flex items-end justify-between mt-1 gap-3">
              <div className="font-mono text-[38px] font-bold tracking-[-0.04em] leading-none">{compare.fmt(current.total)}</div>
              <div className="text-right text-[12.5px] opacity-75 leading-snug">
                {compare.fmt(current.itemsTotal)} items
                <br />
                {current.deliveryTotal > 0 ? `+ ${compare.fmt(current.deliveryTotal)} delivery` : 'No delivery fees'}
              </div>
            </div>
            {savings > 0.5 && baselineStore && (
              <div className="flex items-center gap-2 mt-3.5 text-[14px] font-semibold">
                <span className="grid place-items-center rounded-full bg-accent text-accent-on shrink-0" style={{ width: 22, height: 22 }}>
                  <Icon name="check" size={13} stroke={3} />
                </span>
                {compare.fmt(savings)} less than buying it all at {baselineStore.name}
              </div>
            )}
          </div>
        )}

        {assumed.length > 0 && (
          <section aria-labelledby="picked" className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 id="picked" className={`m-0 ${sectionLabel}`}>
                We picked these for you
              </h2>
              <button type="button" onClick={() => app.openSheet('help', 'brands')} aria-label="How we pick products" className="grid place-items-center rounded-full text-ink-soft" style={{ width: 40, height: 40 }}>
                <Icon name="bulb" size={17} stroke={2.2} />
              </button>
            </div>
            <div className="rounded-[18px] bg-surface shadow-card overflow-hidden">
              {assumed.map((r, i) => (
                <button
                  key={r.item.id}
                  type="button"
                  onClick={() => {
                    onboarding.markHintSeen('assumed');
                    setChoiceFor(r.item.id);
                  }}
                  className="w-full flex items-center gap-3 text-left"
                  style={{ padding: '12px 14px', minHeight: 56, borderTop: i ? '1px solid var(--line)' : 'none' }}
                >
                  <span className="flex-1 min-w-0">
                    <span className="block font-bold text-[15px]">{r.item.name}</span>
                    <span className="block text-[13px] text-ink-soft truncate">{choiceLabel(r)}</span>
                  </span>
                  <span className="text-[13px] font-extrabold text-accent-ink">Change</span>
                </button>
              ))}
            </div>
            {hAssumed.show && <CoachMark text={hAssumed.text} onDismiss={hAssumed.dismiss} onHideAll={hAssumed.hideAll} arrow="up" />}
          </section>
        )}

        {current && (
          <div className="grid gap-3" style={{ gridTemplateColumns: compact ? '1fr' : '1fr 1fr' }}>
            {current.stores.map((sp) => {
              const store = compare.storeById(sp.storeId);
              if (!store) return null;
              const note = deliveryNote(store.deliveryRule, sp.subtotal, compare.fmt);
              const link = store.kind === 'online' ? storeLink(store.website) : null;
              return (
                <article key={sp.storeId} className="bg-surface rounded-[20px] shadow-card overflow-hidden flex flex-col">
                  <header className="flex items-center gap-2.5 border-b border-line" style={{ padding: '14px 16px 12px' }}>
                    <div className="flex-1 min-w-0">
                      <StoreName store={store} className="font-display font-bold text-[18px]" />
                      <div className="text-[12.5px] text-ink-soft">{deliveryLabel(store.deliveryRule, compare.fmt, store.kind)}</div>
                    </div>
                    {link ? (
                      <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[13px] font-extrabold no-underline text-accent-ink" style={{ minHeight: 44 }}>
                        Open
                        <Icon name="arrowR" size={14} stroke={2.6} />
                        <span className="sr-only">{store.name} (opens in a new tab)</span>
                      </a>
                    ) : (
                      <span className="font-mono text-[12px] text-ink-soft">
                        {sp.lines.length} {sp.lines.length === 1 ? 'item' : 'items'}
                      </span>
                    )}
                  </header>
                  <ul className="list-none m-0" style={{ padding: '4px 16px' }}>
                    {sp.lines.map((l) => {
                      const r = byId.get(l.key) as ResolvedItem | undefined;
                      const product = compare.productById(l.option.productId);
                      const size = product ? productSizeText(product) : '';
                      return (
                        <li key={l.key} className="flex items-start justify-between gap-3" style={{ padding: '8px 0' }}>
                          <button type="button" onClick={() => setChoiceFor(l.key)} className="flex-1 min-w-0 text-left">
                            <span className="block text-[14.5px] font-semibold">{r?.item.name}</span>
                            <span className="block text-[12.5px] text-ink-soft truncate">
                              {product?.name}
                              {size && product && !product.name.toLowerCase().includes(size.toLowerCase().replace(' ', '')) ? ` · ${size}` : ''}
                              {l.option.packs > 1 ? ` · ${l.option.packs} × ${compare.fmt(l.option.unitPrice)}` : ''}
                            </span>
                          </button>
                          <span className="font-mono text-[14px] font-bold shrink-0">{compare.fmt(l.option.total)}</span>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="flex-1" />
                  {note && (
                    <div
                      className={`mx-4 rounded-[12px] text-[13px] font-semibold leading-snug ${note.good ? 'bg-accent-wash text-accent-ink' : 'bg-warn-wash text-warn-ink'}`}
                      style={{ padding: '9px 12px' }}
                    >
                      {note.text}
                    </div>
                  )}
                  <footer className="flex justify-between border-t border-dashed border-line mt-2.5 font-extrabold" style={{ padding: '12px 16px 14px' }}>
                    <span>Store total</span>
                    <span className="font-mono">{compare.fmt(sp.total)}</span>
                  </footer>
                </article>
              );
            })}
          </div>
        )}

        {missingHere.length > 0 && (
          <div className="rounded-btn bg-warn-wash text-warn-ink text-[13.5px] leading-snug" style={{ padding: '12px 14px' }}>
            <strong>Not at these stores:</strong> {missingHere.map((r) => r.item.name).join(', ')} — they stay on your list to buy anywhere.
          </div>
        )}
        {notCompared.length > 0 && (
          <div className="rounded-btn bg-surface shadow-[inset_0_0_0_1.5px_var(--line)] text-[13.5px] leading-snug text-ink-soft" style={{ padding: '12px 14px' }}>
            <strong className="text-ink">Not compared:</strong> {notCompared.map((r) => r.item.name).join(', ')} — no prices at your stores yet. They stay on your list.
          </div>
        )}
        <FreshnessNote dates={dates} onHelp={() => app.openSheet('help', 'prices')} />
        {hMyStores.show && <CoachMark text={hMyStores.text} onDismiss={hMyStores.dismiss} onHideAll={hMyStores.hideAll} arrow="down" arrowLeft={60} />}
      </div>

      <div className="flex-1" />
      <div className="sticky bottom-0 z-10 bg-paper border-t border-line safe-bottom flex flex-col gap-1.5" style={{ padding: '12px 16px 14px' }}>
        <Btn full size="lg" onClick={use} disabled={!current || !list}>
          Use this plan
        </Btn>
        <button
          type="button"
          onClick={() => {
            onboarding.markHintSeen('myStores');
            setStoresOpen(true);
          }}
          className="text-[14px] font-bold text-ink-soft"
          style={{ minHeight: 44 }}
        >
          Stores considered: {compare.consideredStores.length} · Edit
        </button>
      </div>
    </>,
  );
}
