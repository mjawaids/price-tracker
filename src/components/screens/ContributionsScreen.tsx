import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { useCompare } from '../../contexts/CompareContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import * as api from '../../lib/compare/api';
import { Btn, ConfirmSheet, Icon, IconName, Toast } from '../ui';
import { sectionLabel } from './compareHelpers';
import { Standing, standingOf, useContributionStats } from './contributionHelpers';

const PAGE = 30;

const CHIP: Record<Standing, { label: string; cls: string }> = {
  shared: { label: 'Shared', cls: 'bg-accent-wash text-accent-ink' },
  confirmed: { label: 'Confirmed', cls: 'bg-ok-wash text-ok-ink' },
  held: { label: 'Only you for now', cls: 'bg-warn-wash text-warn-ink' },
  private: { label: 'Private', cls: 'bg-[var(--backdrop)] text-ink-soft' },
  outOfStock: { label: 'Out of stock', cls: 'bg-[var(--backdrop)] text-ink-soft' },
  disputes: { label: 'Said wrong', cls: 'bg-[var(--backdrop)] text-ink-soft' },
  other: { label: 'Not counted', cls: 'bg-[var(--backdrop)] text-ink-soft' },
};

type Counts = Record<'shared' | 'held' | 'private' | 'outOfStock' | 'disputes' | 'other', number>;

const dayKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};
function dayLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const yest = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (dayKey(iso) === dayKey(now.toISOString())) return 'Today';
  if (dayKey(iso) === dayKey(yest.toISOString())) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}) });
}

/** Compare → Contribute → Your contributions: the user's prices, where they stand, and Remove. */
export default function ContributionsScreen() {
  const app = useApp();
  const compare = useCompare();
  const { settings } = useSettings();
  const uid = useAuth().user?.id ?? null;
  const { compact, isDesktop } = useBreakpoint();
  const { stats, failed: statsFailed, reload } = useContributionStats();
  const [rows, setRows] = useState<api.MyReport[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const [names, setNames] = useState<{ stores: Map<string, string>; products: Map<string, string> }>({ stores: new Map(), products: new Map() });
  const [removing, setRemoving] = useState<api.MyReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [removeError, setRemoveError] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  // Names the snapshot doesn't hold (a store in another city, say) are read by id.
  const learnNames = async (list: api.MyReport[]) => {
    const stores = [...new Set(list.map((r) => r.storeId))].filter((id) => !compare.storeById(id));
    const products = [...new Set(list.map((r) => r.productId))].filter((id) => !compare.productById(id));
    if (!stores.length && !products.length) return;
    try {
      const [s, p] = await Promise.all([api.fetchNames('catalog_stores', stores), api.fetchNames('catalog_products', products)]);
      setNames((cur) => ({ stores: new Map([...cur.stores, ...s]), products: new Map([...cur.products, ...p]) }));
    } catch (error) {
      console.error('Reading store and product names failed:', error instanceof api.ApiError ? error.code : 'network');
    }
  };

  useEffect(() => {
    if (!uid || !compare.online) return;
    let live = true;
    setFailed(false);
    setRows(null);
    api
      .fetchMyReports(uid, 0, PAGE)
      .then((page) => {
        if (!live) return;
        setRows(page);
        setHasMore(page.length === PAGE);
        void learnNames(page);
      })
      .catch((error) => {
        console.error('Reading your prices failed:', error instanceof api.ApiError ? error.code : 'network');
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
    // learnNames reads the latest snapshot; reload on user, connection or Try again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, compare.online, attempt]);

  // Offline, or when the read failed: the last 30 days this device keeps (not a merged
  // product's: its prices were copied onto the product it became).
  const cached: api.MyReport[] = compare.ownReports
    .filter((r) => compare.storeById(r.storeId) && compare.canonicalId(r.productId) === r.productId)
    .map((r) => ({
      id: `${r.storeId}:${r.productId}:${r.observedAt}`,
      storeId: r.storeId,
      productId: r.productId,
      price: r.price,
      isAvailable: r.isAvailable,
      observedAt: r.observedAt,
      source: null,
      status: r.held ? 'pending' : 'accepted',
    }));
  const live = compare.online && !failed;
  const list = live ? rows : cached;
  const ownStore = (id: string) => !!compare.storeById(id)?.ownerId;

  const fallbackCounts: Counts = { shared: 0, held: 0, private: 0, outOfStock: 0, disputes: 0, other: 0 };
  for (const r of cached) {
    const s = standingOf(r, ownStore(r.storeId));
    fallbackCounts[s === 'confirmed' ? 'shared' : s] += 1;
  }
  const counts: Counts = stats && live
    ? { shared: stats.shared, held: stats.held, private: stats.private, outOfStock: stats.outOfStock, disputes: stats.disputes, other: stats.other }
    : fallbackCounts;

  const groups = useMemo(() => {
    const out: { key: string; label: string; stores: { storeId: string; items: api.MyReport[] }[] }[] = [];
    for (const r of list ?? []) {
      const k = dayKey(r.observedAt);
      let day = out.find((d) => d.key === k);
      if (!day) out.push((day = { key: k, label: dayLabel(r.observedAt), stores: [] }));
      let st = day.stores.find((s) => s.storeId === r.storeId);
      if (!st) day.stores.push((st = { storeId: r.storeId, items: [] }));
      st.items.push(r);
    }
    return out;
  }, [list]);

  const storeName = (id: string) => compare.storeById(id)?.name ?? names.stores.get(id) ?? 'A store you can’t see now';
  const productName = (id: string) => compare.productById(id)?.name ?? names.products.get(id) ?? 'A product you can’t see now';

  const showOlder = async () => {
    if (!uid || !rows) return;
    setLoadingMore(true);
    try {
      const page = await api.fetchMyReports(uid, rows.length, PAGE);
      setRows([...rows, ...page.filter((r) => !rows.some((x) => x.id === r.id))]);
      setHasMore(page.length === PAGE);
      void learnNames(page);
    } catch (error) {
      console.error('Reading older prices failed:', error instanceof api.ApiError ? error.code : 'network');
      setToast('Couldn’t load more — check your connection and try again.');
    }
    setLoadingMore(false);
  };

  const remove = async () => {
    if (!removing) return;
    setBusy(true);
    setRemoveError('');
    const ok = await compare.retractReports(removing.storeId, [removing.id], [removing.productId], 'removed');
    setBusy(false);
    if (!ok) {
      setRemoveError('Couldn’t remove it — check your connection and try again.');
      return;
    }
    setRows((cur) => (cur ? cur.filter((r) => r.id !== removing.id) : cur));
    setRemoving(null);
    reload();
    setToast('Price removed');
  };

  const back = () => (app.canGoBack ? app.back() : app.tab('contribute'));
  const city = compare.region?.name;
  const empty = live ? (stats ? stats.total === 0 : rows !== null && rows.length === 0) : cached.length === 0;
  const loading = live && (rows === null || (!stats && !statsFailed));
  const tiles: { n: number | null; label: string }[] = live && stats
    ? [
        { n: stats.month, label: 'this month' },
        { n: stats.total, label: 'all time' },
        { n: stats.shops, label: 'shops' },
        ...(isDesktop ? [{ n: stats.shared, label: 'shared with everyone' }] : []),
      ]
    : [
        { n: cached.length, label: 'last 30 days' },
        { n: null, label: 'all time' },
        { n: new Set(cached.map((r) => r.storeId)).size, label: 'shops' },
      ];

  const standRows: { icon: IconName; label: string; n: number; tone: string; note?: string }[] = [
    // Shared prices exist where a city is live (or from a shared store elsewhere).
    ...(compare.isLive || counts.shared > 0
      ? [{ icon: 'users' as IconName, label: 'Shared with everyone', n: counts.shared, tone: 'bg-accent-wash text-accent-ink' }]
      : []),
    { icon: 'history', label: 'Only you for now', n: counts.held, tone: 'bg-warn-wash text-warn-ink', note: 'Far from the usual price. They count once someone else sees the same.' },
    { icon: 'lock', label: 'At your own shops, private', n: counts.private, tone: 'bg-[var(--backdrop)] text-ink-soft' },
    { icon: 'x', label: 'Out of stock', n: counts.outOfStock, tone: 'bg-[var(--backdrop)] text-ink-soft' },
    { icon: 'alert', label: 'Said a price was wrong', n: counts.disputes, tone: 'bg-[var(--backdrop)] text-ink-soft' },
    ...(counts.other ? [{ icon: 'box' as IconName, label: 'Not counted', n: counts.other, tone: 'bg-[var(--backdrop)] text-ink-soft' }] : []),
  ];

  const header = (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <button type="button" onClick={back} aria-label="Back" className="grid place-items-center rounded-full bg-surface shadow-[inset_0_0_0_1px_var(--line)] shrink-0" style={{ width: 44, height: 44 }}>
          <Icon name="back" size={20} stroke={2.2} />
        </button>
        <span className="font-mono text-[11px] tracking-[0.14em] text-accent-ink uppercase">Compare</span>
      </div>
      <div>
        <h1 className="m-0 font-display font-extrabold text-[30px] tracking-[-0.025em] leading-tight">Your contributions</h1>
        <p className="m-0 mt-1 text-[14.5px] leading-snug text-ink-soft">
          {city && compare.isLive ? `Thank you — your prices help everyone in ${city} shop for less.` : 'Thank you — your prices make Where to buy work for you.'}
        </p>
      </div>
    </div>
  );

  const notices = (
    <>
      {!compare.online && (
        <div role="status" className="flex gap-3 items-start rounded-[16px] bg-warn-wash text-warn-ink" style={{ padding: '12px 14px' }}>
          <Icon name="wifiOff" size={18} stroke={2.3} className="shrink-0 mt-px" />
          <span className="text-[13.5px] leading-snug">
            <strong>You’re offline.</strong> Showing your last 30 days from this device. Older prices and the totals come back online; removing needs a connection.
          </span>
        </div>
      )}
      {compare.online && failed && (
        <div role="alert" className="flex gap-3 items-center rounded-[16px] bg-danger-wash text-danger" style={{ padding: '10px 10px 10px 14px' }}>
          <span className="flex-1 text-[13.5px] leading-snug">
            <strong>Couldn’t load your older prices.</strong> The last 30 days are below.
          </span>
          <Btn size="sm" variant="ghost" className="bg-surface shrink-0" onClick={() => setAttempt((a) => a + 1)}>
            Try again
          </Btn>
        </div>
      )}
    </>
  );

  const tilesEl = (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))` }}>
      {tiles.map((t) => (
        <div key={t.label} className="bg-surface rounded-[18px] shadow-card" style={{ padding: '14px 14px 12px' }}>
          <div className={`font-mono text-[26px] font-bold tracking-[-0.04em] leading-none ${t.n == null ? 'text-ink-soft' : ''}`}>{t.n == null ? '—' : t.n}</div>
          <div className="mt-1.5 text-[12.5px] text-ink-soft">{t.label}</div>
        </div>
      ))}
    </div>
  );

  const standing = (
    <section aria-labelledby="where" className="flex flex-col gap-2">
      <h2 id="where" className={`m-0 mx-1 ${sectionLabel}`}>
        Where they stand{live && stats ? '' : ' · last 30 days'}
      </h2>
      <div className="bg-surface rounded-[20px] shadow-card overflow-hidden">
        {standRows.map((s, i) => (
          <div key={s.label} className="flex items-start gap-3 text-[14px]" style={{ padding: '11px 14px', borderTop: i ? '1px solid var(--line)' : 'none' }}>
            <span aria-hidden className={`grid place-items-center rounded-[10px] shrink-0 ${s.tone}`} style={{ width: 30, height: 30 }}>
              <Icon name={s.icon} size={16} stroke={2.3} />
            </span>
            <span className="flex-1 min-w-0 pt-1">
              {s.label}
              {s.note && s.n > 0 && <span className="block text-[12.5px] text-ink-soft leading-snug mt-0.5">{s.note}</span>}
            </span>
            <span className="font-mono font-bold text-[14px] pt-1">{s.n}</span>
          </div>
        ))}
      </div>
    </section>
  );

  const recent = (
    <section aria-labelledby="recent" className="flex flex-col gap-2 min-w-0">
      <h2 id="recent" className={`m-0 mx-1 ${sectionLabel}`}>
        Recent
      </h2>
      <div className="bg-surface rounded-[20px] shadow-card overflow-hidden">
        {groups.map((d, di) => (
          <div key={d.key} style={{ borderTop: di ? '1px solid var(--line)' : 'none' }}>
            <h3 className={`m-0 ${sectionLabel}`} style={{ padding: '12px 14px 0' }}>
              {d.label}
            </h3>
            {d.stores.map((st) => (
              <div key={st.storeId}>
                <div className="text-[12.5px] font-extrabold text-ink-soft" style={{ padding: '8px 14px 2px' }}>
                  {storeName(st.storeId)}
                </div>
                <ul className="list-none m-0 p-0">
                  {st.items.map((r) => {
                    const chip = CHIP[standingOf(r, ownStore(r.storeId))];
                    const name = productName(r.productId);
                    return (
                      <li key={r.id} className="flex items-center gap-2.5 border-t border-line first:border-t-0" style={{ padding: '8px 6px 8px 14px', minHeight: 60 }}>
                        <span className="flex-1 min-w-0">
                          <span className="block font-bold text-[14.5px] leading-snug line-clamp-2">{name}</span>
                          <span className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {r.price != null && r.source !== 'dispute' && <span className="font-mono text-[13px] font-bold">{compare.fmt(r.price)}</span>}
                            <span className={`inline-flex items-center rounded-full text-[11.5px] font-extrabold whitespace-nowrap ${chip.cls}`} style={{ height: 20, padding: '0 8px' }}>
                              {chip.label}
                            </span>
                          </span>
                        </span>
                        {live && (
                          <button
                            type="button"
                            onClick={() => {
                              setRemoveError('');
                              setRemoving(r);
                            }}
                            disabled={!compare.online}
                            aria-label={`Remove your price for ${name}`}
                            className="grid place-items-center rounded-[12px] text-ink-soft shrink-0 disabled:opacity-40"
                            style={{ width: 44, height: 44 }}
                          >
                            <Icon name="trash" size={18} stroke={2.2} />
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        ))}
      </div>
      {live && hasMore && (
        <Btn variant="ghost" full onClick={() => void showOlder()} disabled={loadingMore}>
          {loadingMore ? 'Loading…' : 'Show older'}
        </Btn>
      )}
    </section>
  );

  const emptyEl = (
    <div className="flex flex-col items-center text-center gap-3 bg-surface rounded-[22px] shadow-card" style={{ padding: '28px 20px' }}>
      <span className="grid place-items-center rounded-[22px] bg-accent-wash text-accent-ink" style={{ width: 64, height: 64 }}>
        <Icon name="heart" size={30} stroke={2} />
      </span>
      <h2 className="m-0 font-display font-extrabold text-[22px]">No prices yet</h2>
      <p className="m-0 text-[14px] leading-relaxed text-ink-soft" style={{ maxWidth: 340 }}>
        Prices you add, confirm while you shop or read from a receipt show up here.
      </p>
      <div className="flex gap-2 w-full" style={{ maxWidth: 420 }}>
        <Btn full onClick={back}>
          Add a price
        </Btn>
        {settings.features.receipts && (
          <Btn full variant="ghost" className="bg-surface" onClick={() => app.go('receipt')}>
            Add a receipt
          </Btn>
        )}
      </div>
    </div>
  );

  const skeleton = (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading your prices">
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[76px] rounded-[18px] bg-surface shadow-card motion-safe:animate-pulse" />
        ))}
      </div>
      <div className="h-[220px] rounded-[20px] bg-surface shadow-card motion-safe:animate-pulse" />
    </div>
  );

  return (
    <div className="pb-10" style={{ maxWidth: compact ? '100%' : 980, margin: '0 auto' }}>
      <div className="flex flex-col gap-4 px-[16px] pt-[14px] md:px-7 md:pt-6">
        {header}
        {notices}
        {loading ? (
          skeleton
        ) : empty ? (
          emptyEl
        ) : (
          <>
            {tilesEl}
            {isDesktop ? (
              <div className="grid gap-[18px] items-start" style={{ gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)' }}>
                {recent}
                {standing}
              </div>
            ) : (
              <>
                {standing}
                {recent}
              </>
            )}
            <p className="m-0 mx-1 text-[12.5px] leading-relaxed text-ink-soft">
              Prices at shared stores are shown without your name. Removing one stops it counting for everyone.
            </p>
          </>
        )}
      </div>

      {removing && (
        <ConfirmSheet
          open
          title="Remove this price?"
          confirmLabel={removing.source === 'dispute' ? 'Remove report' : 'Remove price'}
          busyLabel="Removing…"
          busy={busy}
          error={removeError}
          onConfirm={() => void remove()}
          onClose={() => setRemoving(null)}
        >
          <div className="rounded-[16px] bg-surface shadow-[inset_0_0_0_1px_var(--line)]" style={{ padding: '12px 14px' }}>
            <div className="font-extrabold text-[15px]">{productName(removing.productId)}</div>
            <div className="text-[13px] text-ink-soft mt-0.5">
              {removing.price != null && removing.source !== 'dispute' ? (
                <>
                  <span className="font-mono font-bold text-ink">{compare.fmt(removing.price)}</span> at{' '}
                </>
              ) : null}
              {storeName(removing.storeId)} · {dayLabel(removing.observedAt).toLowerCase() === 'today' ? 'today' : dayLabel(removing.observedAt)}
            </div>
          </div>
          <p className="m-0 text-[14.5px] leading-relaxed text-ink-soft">
            {ownStore(removing.storeId)
              ? 'It’s deleted, and your price there is worked out again without it. This can’t be undone.'
              : 'It stops counting for everyone, and the shared price is worked out again without it. This can’t be undone.'}
          </p>
        </ConfirmSheet>
      )}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50" style={{ width: 'min(440px, calc(100vw - 32px))' }}>
          <Toast message={toast} icon="check" />
        </div>
      )}
    </div>
  );
}
