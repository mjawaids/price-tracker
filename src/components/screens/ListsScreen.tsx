import { Suspense, lazy, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useLists } from '../../contexts/ListsContext';
import { useCompare } from '../../contexts/CompareContext';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useHint } from '../../hooks/useHint';
import { ADD_PLACEHOLDERS } from '../../lib/hints';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { ListItem } from '../../types';
import { STARTER_ITEMS, normalizeName } from '../../lib/groceryDictionary';
import { formatQty, parseQuickAdd } from '../../utils/quickAdd';
import { trackUserAction } from '../../utils/analytics';
import { CoachMark, Icon, TipRow, Toast } from '../ui';
import {
  AddBar,
  AllDone,
  DoneSection,
  EmptyList,
  ItemGroup,
  ItemRow,
  ListSkeleton,
  OfflineBanner,
  OftenStrip,
  ShoppingProgress,
  SuggestionPanel,
  SyncBadge,
} from './listParts';
import { groupByCategory, groupByStore } from './listHelpers';
import { ItemSheet, ListSwitcherSheet } from './listSheets';
import { PlanBanner, StoreSectionHeader, WhereToBuyChip } from './listCompare';
import { deliveryFeeFor } from '../../lib/compare/optimizer';
import { InstallPill } from '../shell/Install';

// Compare's item sheet loads on first use (keeps Lists' start-up small).
const ItemChoiceSheet = lazy(() => import('./compareSheets').then((m) => ({ default: m.ItemChoiceSheet })));

const TOAST_MS = 4500;
const PLACEHOLDER_MS = 3800;
const isTouch = () => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;

interface ToastState {
  id: number;
  message: string;
  undo?: ListItem[];
}

const track = (action: string, details?: Record<string, unknown>) => {
  if (typeof window !== 'undefined' && typeof window.gtag !== 'undefined') trackUserAction(action, details);
};

export default function ListsScreen() {
  const app = useApp();
  const lists = useLists();
  const { compact, isDesktop } = useBreakpoint();
  const { settings, updateSettings } = useSettings();
  const grouped = settings.groupListsByAisle !== false;
  const compare = useCompare();
  const [choiceFor, setChoiceFor] = useState<string | null>(null);
  const [view, setView] = useState<'stores' | 'aisles'>('stores');
  const [focusStore, setFocusStore] = useState<string | null>(null);

  const [draft, setDraft] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  // The sidebar's "New list" opens this screen with { newList: true }.
  const [switcherOpen, setSwitcherOpen] = useState(!!app.params.newList);
  const [doneOpen, setDoneOpen] = useState(true);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const onboarding = useOnboarding();
  const { markHintSeen } = onboarding;
  const [inputFocused, setInputFocused] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast((cur) => (cur?.id === toast.id ? null : cur)), TOAST_MS);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = useCallback((message: string, undo?: ListItem[]) => setToast({ id: Date.now(), message, undo }), []);

  const add = useCallback(
    (texts: string[]) => {
      const wasDone = new Set(lists.done.map((i) => normalizeName(i.name)));
      const r = lists.addItems(texts);
      setDraft('');
      setFresh(new Set(r.added.map((i) => i.id)));
      if (r.added.length + r.merged.length === 0) return;
      track('list_item_added', { count: r.added.length + r.merged.length });
      if (texts.length > 1) {
        showToast(`Added ${r.added.length + r.merged.length} items`);
      } else if (r.merged.length === 1 && !r.added.length) {
        const m = r.merged[0];
        const q = formatQty(m.quantity, m.unit);
        showToast(
          wasDone.has(normalizeName(m.name))
            ? `${m.name} is back on your list`
            : `${m.name} was already on your list${q ? ` — now ${q}` : ''}`,
        );
      }
      inputRef.current?.focus();
    },
    [lists, showToast],
  );

  const toggle = useCallback(
    (item: ListItem) => {
      const prev = lists.toggle(item.id);
      markHintSeen('tick');
      if (prev && !prev.done) {
        track('list_item_ticked');
        showToast(`${item.name} is in your cart`, [prev]);
      }
    },
    [lists, showToast, markHintSeen],
  );

  const remove = useCallback(
    (item: ListItem) => {
      const prev = lists.deleteItem(item.id);
      setOpenId(null);
      if (prev) showToast(`${item.name} deleted`, [prev]);
    },
    [lists, showToast],
  );

  const clearDone = useCallback(() => {
    markHintSeen('clear');
    const prev = lists.clearDone();
    if (prev.length) showToast(`Cleared ${prev.length} ${prev.length === 1 ? 'item' : 'items'}`, prev);
  }, [lists, showToast, markHintSeen]);

  const openDetails = (id: string) => {
    markHintSeen('details');
    markHintSeen('aisles');
    setOpenId(id);
  };
  const openSwitcher = () => {
    markHintSeen('switcher');
    setSwitcherOpen(true);
  };
  const pickOften = (n: string) => {
    markHintSeen('often');
    add([n]);
  };

  const undo = () => {
    if (toast?.undo) lists.restore(toast.undo);
    setToast(null);
  };

  const compareItem = () => {
    const id = openId;
    setOpenId(null);
    setChoiceFor(id);
  };
  const openPlan = () => {
    markHintSeen('whereToBuy');
    app.go('plan', { listId: lists.activeList?.id });
  };
  const hideWhereToBuy = () => {
    updateSettings({ features: { ...settings.features, whereToBuy: false } });
    showToast('Where to buy is off — turn it back on in Profile → Shopping features');
  };

  const parsed = parseQuickAdd(draft);
  const suggestions = useMemo(() => (parsed ? lists.suggestions(draft) : []), [parsed, draft, lists]);
  const often = useMemo(() => lists.often(compact ? 6 : 8), [lists, compact]);
  const groups = useMemo(
    () => (grouped ? groupByCategory(lists.todo) : lists.todo.length ? [{ id: 'all', name: undefined, dot: undefined, items: lists.todo }] : []),
    [grouped, lists.todo],
  );
  const starters = STARTER_ITEMS.filter((n) => !lists.todo.some((i) => normalizeName(i.name) === normalizeName(n)));

  // ── Where to buy ─────────────────────────────────────────────────────────────
  // The plan for the chip runs on a deferred copy of the list, so typing stays smooth.
  const featureOn = settings.features.whereToBuy !== false;
  const deferredTodo = useDeferredValue(lists.todo);
  const { planFor } = compare;
  const chipPlan = useMemo(
    () => (featureOn && compare.ready && deferredTodo.length ? planFor(deferredTodo) : null),
    [featureOn, compare.ready, deferredTodo, planFor],
  );
  const coverable = chipPlan?.set.coverable.length ?? 0;
  // Outside live cities it waits until you have prices at your own stores.
  const showChip = featureOn && compare.ready && lists.todo.length > 0 && (compare.isLive || !compare.regionChosen || coverable > 0);
  const chipTitle =
    chipPlan && chipPlan.set.savings > 0.5 ? `Save ~${compare.fmt(chipPlan.set.savings)} · Where to buy` : 'Where to buy';
  const chipSub = coverable
    ? `${coverable} of ${lists.todo.length} ${lists.todo.length === 1 ? 'item' : 'items'} priced at your stores`
    : compare.regionChosen
      ? 'See prices at stores near you'
      : 'Pick your city to compare stores';

  const planned = featureOn && lists.todo.some((i) => i.planStoreId);
  const byStore = planned && view === 'stores';
  const storeSections = useMemo(
    () => (byStore ? groupByStore(lists.todo, compare.storeById) : []),
    // storeById reads the latest catalogue.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [byStore, lists.todo, compare.stores],
  );
  const planTotal = storeSections.reduce(
    (a, sec) => a + sec.subtotal + (sec.store?.kind === 'online' ? deliveryFeeFor(sec.store.deliveryRule, sec.subtotal) : 0),
    0,
  );
  const visibleSections = focusStore ? storeSections.filter((sec) => sec.store?.id === focusStore) : storeSections;
  const plannedLine = (item: ListItem) => {
    const product = item.planProductId ? compare.productById(item.planProductId) : undefined;
    if (!product || item.planPrice == null) return undefined;
    const q = formatQty(item.quantity, item.unit);
    return { product: q ? `${q} · ${product.name}` : product.name, price: compare.fmt(item.planPrice) };
  };

  const total = lists.items.length;
  const doneCount = lists.done.length;
  const isEmpty = lists.ready && total === 0;
  const allDone = total > 0 && lists.todo.length === 0;
  const minutes = useMemo(() => {
    const times = lists.done.map((i) => (i.doneAt ? Date.parse(i.doneAt) : NaN)).filter((t) => !Number.isNaN(t));
    if (times.length < 2) return null;
    return Math.round((Math.max(...times) - Math.min(...times)) / 60000);
  }, [lists.done]);
  const openItem = lists.items.find((i) => i.id === openId) || null;
  const offline = lists.syncStatus === 'offline';
  const listName = lists.activeList?.name || 'Groceries';

  // ── Tips (one at a time; order = priority) ──────────────────────────────────
  const firstGroup = groups[0];
  const hPaste = useHint('paste', !compact && lists.ready);
  const hTick = useHint('tick', lists.ready && lists.todo.length >= 1 && doneCount === 0);
  const hAisles = useHint('aisles', grouped && groups.length >= 2);
  const hDetails = useHint('details', lists.todo.length >= 3);
  const hClear = useHint('clear', doneCount >= 1);
  const hSwipe = useHint('swipe', compact && isTouch() && lists.todo.length >= 5);
  const hOften = useHint('often', often.length > 0 && total > 0 && !parsed);
  const hSwitcher = useHint('switcher', lists.lists.length === 1 && lists.todo.length >= 6);
  const hWhere = useHint('whereToBuy', showChip && !planned);
  const hSections = useHint('storeSections', byStore);
  const hFocus = useHint('focusStore', byStore && storeSections.length >= 2 && !focusStore);

  // Rotating placeholder teaches quick-add tricks (paused while typing/focused).
  const rotate = onboarding.tipsOn && !inputFocused && !draft;
  useEffect(() => {
    if (!rotate) return;
    const t = setInterval(() => setPlaceholderIdx((i) => (i + 1) % ADD_PLACEHOLDERS.length), PLACEHOLDER_MS);
    return () => clearInterval(t);
  }, [rotate]);

  const header = (
    <header className="flex flex-col gap-1.5" style={{ padding: compact ? '18px 16px 10px 20px' : '26px 0 8px' }}>
      <div className="flex items-center justify-between gap-2">
        <h1 className="m-0 min-w-0">
          <button
            type="button"
            onClick={openSwitcher}
            aria-label={`${listName}. Switch list`}
            className="flex items-center gap-1.5 bg-transparent text-ink font-display font-extrabold tracking-[-0.03em] max-w-full"
            style={{ fontSize: compact ? 30 : 34, minHeight: 44 }}
          >
            <span className="truncate">{listName}</span>
            <Icon name="chevD" size={22} stroke={2.4} className="shrink-0" />
          </button>
        </h1>
        <div className="shrink-0 flex items-center gap-2">
          {compact && <InstallPill />}
          <button
            type="button"
            aria-label="List options"
            onClick={openSwitcher}
            className="shrink-0 grid place-items-center rounded-[14px] bg-surface text-ink-soft shadow-[inset_0_0_0_1px_var(--line)]"
            style={{ width: 44, height: 44 }}
          >
            <Icon name="more" size={20} stroke={2.4} />
          </button>
        </div>
      </div>
      {doneCount > 0 && lists.todo.length > 0 ? (
        <ShoppingProgress done={doneCount} total={total} />
      ) : (
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-[13px] font-bold text-ink-soft">
            {!lists.ready ? 'Loading…' : isEmpty ? 'Nothing yet' : allDone ? 'All done' : `${lists.todo.length} to buy`}
          </span>
          <SyncBadge status={lists.syncStatus} pending={lists.pending} />
        </div>
      )}
      {offline && (
        <div className="mt-1.5">
          <OfflineBanner pending={lists.pending} />
        </div>
      )}
      {hSwitcher.show && (
        <CoachMark className="mt-2" text={hSwitcher.text} onDismiss={hSwitcher.dismiss} onHideAll={hSwitcher.hideAll} arrowLeft={60} />
      )}
      {showChip && !planned && !isDesktop && (
        <div className="mt-2 flex flex-col gap-2">
          <WhereToBuyChip title={chipTitle} sub={chipSub} onOpen={openPlan} onHide={hideWhereToBuy} />
          {hWhere.show && <CoachMark text={hWhere.text} onDismiss={hWhere.dismiss} onHideAll={hWhere.hideAll} arrowLeft={30} />}
        </div>
      )}
      {planned && (
        <div className="mt-2 flex flex-col gap-2">
          {view === 'stores' && (
            <PlanBanner
              total={compare.fmt(planTotal)}
              stores={storeSections.filter((sec) => sec.store).length}
              onChange={openPlan}
              onClear={() => {
                if (lists.activeList) lists.clearPlan(lists.activeList.id);
                setFocusStore(null);
              }}
            />
          )}
          <div role="tablist" aria-label="Group items by" className="self-start flex p-[3px] rounded-[12px] bg-[var(--backdrop)]">
            {(['stores', 'aisles'] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                onClick={() => {
                  setView(v);
                  setFocusStore(null);
                  markHintSeen('storeSections');
                }}
                className={`rounded-[10px] text-[13.5px] ${view === v ? 'bg-surface font-extrabold shadow-[0_1px_2px_rgba(41,33,24,0.08)]' : 'font-semibold text-ink-soft'}`}
                style={{ minHeight: 40, padding: '0 16px' }}
              >
                {v === 'stores' ? 'Stores' : 'Aisles'}
              </button>
            ))}
          </div>
          {hSections.show && <TipRow text={hSections.text} onDismiss={hSections.dismiss} />}
        </div>
      )}
    </header>
  );

  const addArea = (
    <div className="relative flex flex-col gap-2.5">
      {parsed && (
        <div className={compact ? '' : 'absolute left-0 right-0 top-full mt-2 z-20'}>
          <SuggestionPanel
            exactLabel={`Add “${draft.trim()}”`}
            onExact={() => add([draft])}
            suggestions={suggestions}
            onPick={(name) => {
              // Keep a typed quantity: "2 mi" → pick Milk → "2 Milk".
              const qtyPrefix = parsed.quantity ? `${parsed.quantity}${parsed.unit ? ` ${parsed.unit}` : ''} ` : '';
              add([`${qtyPrefix}${name}`]);
            }}
          />
        </div>
      )}
      {hOften.show && compact && <TipRow icon="history" text={hOften.text} onDismiss={hOften.dismiss} />}
      {!parsed && compact && often.length > 0 && total > 0 && <OftenStrip names={often} onPick={pickOften} />}
      <AddBar
        value={draft}
        onChange={(v) => {
          setDraft(v);
          if (v) setToast(null);
        }}
        onSubmit={() => add([draft])}
        onPasteLines={(lines) => {
          markHintSeen('paste');
          add(lines);
        }}
        onFocusChange={setInputFocused}
        placeholder={rotate ? ADD_PLACEHOLDERS[placeholderIdx] : ADD_PLACEHOLDERS[0]}
        inputRef={inputRef}
        trailingHint="Enter ↵"
      />
      {hPaste.show && <TipRow text={hPaste.text} onDismiss={hPaste.dismiss} />}
      {!parsed && !compact && often.length > 0 && <OftenStrip names={often} onPick={pickOften} label="Often bought" />}
      {hOften.show && !compact && <TipRow icon="history" text={hOften.text} onDismiss={hOften.dismiss} />}
    </div>
  );

  // Tips that point at the first group render right under it.
  const groupCoach = hTick.show ? (
    <CoachMark text={hTick.text} onDismiss={hTick.dismiss} onHideAll={hTick.hideAll} arrowLeft={22} />
  ) : hDetails.show ? (
    <CoachMark text={hDetails.text} onDismiss={hDetails.dismiss} onHideAll={hDetails.hideAll} arrowLeft={90} />
  ) : hSwipe.show ? (
    <CoachMark text={hSwipe.text} onDismiss={hSwipe.dismiss} onHideAll={hSwipe.hideAll} arrowLeft={160} />
  ) : hAisles.show ? (
    <TipRow text={hAisles.text} onDismiss={hAisles.dismiss} />
  ) : null;

  const storesEl = (
    <div className="flex flex-col gap-[18px]">
      {visibleSections.map((sec, idx) => (
        <section key={sec.store?.id ?? 'anywhere'} aria-label={sec.store?.name ?? 'Anywhere'} className="flex flex-col gap-2">
          <StoreSectionHeader
            store={sec.store}
            count={sec.items.length}
            done={0}
            subtotal={sec.subtotal}
            fmt={compare.fmt}
            focused={focusStore === sec.store?.id}
            onFocus={
              sec.store && storeSections.length > 1
                ? () => {
                    markHintSeen('focusStore');
                    setFocusStore((cur) => (cur === sec.store!.id ? null : sec.store!.id));
                  }
                : undefined
            }
          />
          <ul className="list-none m-0 p-0 flex flex-col gap-px bg-[var(--line)] rounded-[18px] overflow-hidden shadow-card">
            {sec.items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                fresh={fresh.has(item.id)}
                planned={plannedLine(item)}
                onToggle={() => toggle(item)}
                onOpen={() => openDetails(item.id)}
                onDelete={() => remove(item)}
                onSwiped={() => markHintSeen('swipe')}
              />
            ))}
          </ul>
          {idx === 0 && hFocus.show && <CoachMark text={hFocus.text} onDismiss={hFocus.dismiss} onHideAll={hFocus.hideAll} arrow="up" arrowLeft={250} />}
        </section>
      ))}
    </div>
  );

  const groupsEl = byStore ? storesEl : (
    <div className={isDesktop && grouped ? 'columns-2 gap-[18px]' : 'flex flex-col gap-[18px]'}>
      {groups.map((g) => (
        <div key={g.id} className={isDesktop && grouped ? 'break-inside-avoid mb-[18px]' : ''}>
          <ItemGroup name={g.name} dot={g.dot} count={g.items.length}>
            {g.items.map((item, idx) => (
              <ItemRow
                key={item.id}
                item={item}
                fresh={fresh.has(item.id)}
                showAisle={!grouped}
                nudge={hSwipe.show && g === firstGroup && idx === 0}
                onToggle={() => toggle(item)}
                onOpen={() => openDetails(item.id)}
                onDelete={() => remove(item)}
                onSwiped={() => markHintSeen('swipe')}
              />
            ))}
          </ItemGroup>
          {g === firstGroup && groupCoach && <div className="mt-3">{groupCoach}</div>}
        </div>
      ))}
    </div>
  );

  const doneEl = doneCount > 0 && (
    <div className="flex flex-col gap-2.5">
      {hClear.show && <TipRow icon="checkCircle" text={hClear.text} onDismiss={hClear.dismiss} />}
      <DoneSection count={doneCount} open={doneOpen} onToggleOpen={() => setDoneOpen((o) => !o)} onClear={clearDone}>
        {lists.done.map((item) => (
          <ItemRow key={item.id} item={item} onToggle={() => toggle(item)} onOpen={() => openDetails(item.id)} onDelete={() => remove(item)} />
        ))}
      </DoneSection>
    </div>
  );

  const body = !lists.ready ? (
    <ListSkeleton />
  ) : isEmpty ? (
    <EmptyList starters={starters} onPick={(n) => add([n])} />
  ) : (
    <>
      {groupsEl}
      {allDone && <AllDone minutes={minutes} />}
    </>
  );

  const toastEl = toast && (
    <Toast message={toast.message} actionLabel={toast.undo ? 'Undo' : undefined} onAction={undo} icon={toast.undo ? undefined : 'check'} />
  );

  const sheets = (
    <>
      <ItemSheet item={openItem} onClose={() => setOpenId(null)} onDelete={remove} onCompare={featureOn ? compareItem : undefined} />
      {choiceFor && (
        <Suspense fallback={null}>
          <ItemChoiceSheet item={lists.items.find((i) => i.id === choiceFor) ?? null} onClose={() => setChoiceFor(null)} onDone={(m) => showToast(m)} />
        </Suspense>
      )}
      <ListSwitcherSheet open={switcherOpen} startCreating={!!app.params.newList} onClose={() => setSwitcherOpen(false)} />
    </>
  );

  if (compact) {
    return (
      <div className="min-h-full flex flex-col">
        {header}
        <main className="flex-1 flex flex-col gap-[18px]" style={{ padding: '6px 16px 20px' }}>
          {body}
          {doneEl}
        </main>
        <div className="sticky bottom-0 z-10 bg-paper border-t border-line" style={{ padding: '10px 16px 12px' }}>
          {toastEl && <div className="absolute left-4 right-4 bottom-full mb-3">{toastEl}</div>}
          {addArea}
        </div>
        {sheets}
      </div>
    );
  }

  return (
    <div className="min-h-full" style={{ padding: '0 32px 40px' }}>
      <div className={isDesktop ? 'grid gap-7 items-start' : 'flex flex-col'} style={isDesktop ? { gridTemplateColumns: 'minmax(0,1fr) 300px', maxWidth: 1100 } : { maxWidth: 720 }}>
        <div className="flex flex-col gap-[18px] min-w-0">
          {header}
          {addArea}
          {body}
          {!isDesktop && doneEl}
        </div>
        {isDesktop && (
          <aside className="flex flex-col gap-4 sticky top-6" style={{ marginTop: 26 }}>
            {doneEl || (
              <div className="rounded-card bg-surface shadow-card text-sm text-ink-soft" style={{ padding: 16 }}>
                Ticked items collect here while you shop.
              </div>
            )}
            {showChip && !planned && (
              <div className="flex flex-col gap-2">
                <WhereToBuyChip big title={chipTitle} sub={chipSub} onOpen={openPlan} onHide={hideWhereToBuy} />
                {hWhere.show && <CoachMark text={hWhere.text} onDismiss={hWhere.dismiss} onHideAll={hWhere.hideAll} arrowLeft={30} />}
              </div>
            )}
          </aside>
        )}
      </div>
      {toastEl && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50" style={{ width: 'min(440px, calc(100vw - 32px))' }}>
          {toastEl}
        </div>
      )}
      {sheets}
    </div>
  );
}
