// "Where to buy" on a list: the entry chip, the applied-plan banner and the
// store section headers. Everything here is optional (Profile → Shopping features).
import { CatalogStore } from '../../lib/compare/types';
import { deliveryFeeFor } from '../../lib/compare/optimizer';
import { storeLink } from '../../lib/links';
import { Icon, StoreDot } from '../ui';
import type { PriceAsk } from './priceCheckHelpers';

/** The one Compare entry point on a list. */
export function WhereToBuyChip({
  title,
  sub,
  onOpen,
  onHide,
  big,
}: {
  title: string;
  sub: string;
  onOpen: () => void;
  onHide: () => void;
  big?: boolean;
}) {
  return (
    <div className="relative animate-sl-fade">
      <button
        type="button"
        onClick={onOpen}
        className="w-full flex items-center gap-3 text-left rounded-[18px] bg-accent-wash shadow-[inset_0_0_0_1.5px_var(--accent)]"
        style={{ padding: big ? '14px 52px 14px 14px' : '11px 48px 11px 12px', minHeight: 56 }}
      >
        <span className="grid place-items-center rounded-[12px] bg-accent text-accent-on shrink-0" style={{ width: 38, height: 38 }}>
          <Icon name="tag" size={19} stroke={2.2} />
        </span>
        <span className="flex-1 min-w-0">
          <span className={`block font-extrabold text-[15px] ${big ? 'leading-snug' : 'truncate'}`}>{title}</span>
          <span className={`block text-[13px] text-accent-ink ${big ? 'leading-snug mt-0.5' : 'truncate'}`}>{sub}</span>
        </span>
        <Icon name="chevR" size={18} stroke={2.4} color="var(--accent-ink)" className="shrink-0" />
      </button>
      <button
        type="button"
        onClick={onHide}
        aria-label="Hide Where to buy"
        className="absolute top-1/2 -translate-y-1/2 right-1 grid place-items-center rounded-full text-accent-ink"
        style={{ width: 40, height: 40 }}
      >
        <Icon name="x" size={15} stroke={2.4} />
      </button>
    </div>
  );
}

/** Shown on a list with a plan applied. */
export function PlanBanner({ total, stores, onChange, onClear }: { total: string; stores: number; onChange: () => void; onClear: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-[16px] bg-accent-wash" style={{ padding: '6px 6px 6px 14px' }}>
      <span className="flex-1 min-w-0 text-[14px] truncate">
        <strong>Plan · {total}</strong>
        <span className="text-accent-ink">
          {' '}
          · {stores} {stores === 1 ? 'store' : 'stores'}
        </span>
      </span>
      <button type="button" onClick={onChange} className="rounded-[12px] font-extrabold text-[13.5px] text-accent-ink" style={{ minHeight: 40, padding: '0 10px' }}>
        Change
      </button>
      <button type="button" onClick={onClear} className="rounded-[12px] font-bold text-[13.5px] text-ink-soft" style={{ minHeight: 40, padding: '0 10px' }}>
        Clear
      </button>
    </div>
  );
}

/** Header of one store's part of the list. */
export function StoreSectionHeader({
  store,
  count,
  done,
  subtotal,
  fmt,
  focused,
  onFocus,
}: {
  store: CatalogStore | null;
  count: number;
  done: number;
  subtotal: number;
  fmt: (n: number) => string;
  focused: boolean;
  onFocus?: () => void;
}) {
  if (!store) {
    return (
      <div className="flex items-center gap-2.5 px-1.5" style={{ minHeight: 44 }}>
        <span aria-hidden className="rounded-full bg-[var(--ink-faint)]" style={{ width: 11, height: 11 }} />
        <span className="flex-1 min-w-0">
          <span className="block font-display font-extrabold text-[17px]">Anywhere</span>
          <span className="block text-[12.5px] text-ink-soft">No prices at your stores yet</span>
        </span>
      </div>
    );
  }
  const delivery = store.kind === 'online' ? deliveryFeeFor(store.deliveryRule, subtotal) : 0;
  const link = store.kind === 'online' ? storeLink(store.website) : null;
  const what =
    store.kind === 'physical' ? 'In store' : delivery > 0 ? `Delivery ${fmt(delivery)}` : store.deliveryRule.type === 'none' ? 'Pickup' : 'Free delivery';
  return (
    <div className="flex items-center gap-2 pl-1.5">
      <StoreDot store={store} size={12} />
      <span className="flex-1 min-w-0">
        <span className="block font-display font-extrabold text-[17px] truncate">{store.name}</span>
        <span className="block text-[12.5px] text-ink-soft truncate">
          {what} · {done ? `${done} of ${count} done` : `${count} ${count === 1 ? 'item' : 'items'}`} · ~{fmt(subtotal + delivery)}
        </span>
      </span>
      {link && (
        <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-extrabold text-[13px] text-accent-ink no-underline" style={{ minHeight: 44, padding: '0 6px' }}>
          Open
          <span className="sr-only">{store.name} (opens in a new tab)</span>
        </a>
      )}
      {onFocus && (
        <button
          type="button"
          onClick={onFocus}
          aria-pressed={focused}
          className={`rounded-[12px] font-extrabold text-[13px] ${focused ? 'bg-accent text-accent-on' : 'text-accent-ink'}`}
          style={{ minHeight: 40, padding: '0 10px' }}
        >
          {focused ? 'Show all' : 'Shop here'}
        </button>
      )}
    </div>
  );
}

/**
 * The tick toast with a price question under it: "Bread is in your cart · Undo", then
 * "Was it Rs 210?" with Different and Yes (Profile → Shopping features → Ask for prices
 * while I shop).
 */
export function PriceCheckToast({
  message,
  ask,
  busy,
  fmt,
  onUndo,
  onYes,
  onDifferent,
}: {
  message: string;
  ask: PriceAsk;
  busy?: boolean;
  fmt: (n: number) => string;
  onUndo?: () => void;
  onYes: () => void;
  onDifferent: () => void;
}) {
  return (
    <div role="status" aria-live="polite" className="bg-ink text-paper rounded-[18px] overflow-hidden animate-sl-pop shadow-[0_10px_30px_rgba(41,33,24,0.25)]">
      <div className="flex items-center gap-2.5" style={{ padding: '6px 6px 6px 16px', minHeight: 48 }}>
        <Icon name="check" size={18} stroke={2.4} className="shrink-0" />
        <span className="flex-1 min-w-0 text-[14.5px] font-semibold leading-snug">{message}</span>
        {onUndo && (
          <button
            type="button"
            onClick={onUndo}
            disabled={busy}
            className="shrink-0 font-extrabold text-[14.5px] rounded-[12px] bg-transparent disabled:opacity-60"
            style={{ minHeight: 44, padding: '0 14px', color: 'var(--coach-chip-ink)' }}
          >
            Undo
          </button>
        )}
      </div>
      <div aria-hidden className="h-px" style={{ background: 'var(--coach-chip)' }} />
      <div className="flex flex-col gap-2.5" style={{ padding: '10px 10px 10px 16px' }}>
        <span className="min-w-0">
          <span className="block text-[15.5px] font-extrabold">
            Was it <span className="font-mono">{fmt(ask.price)}</span>
            {ask.each ? ' each' : ''}?
          </span>
          <span className="block truncate text-[12.5px]" style={{ color: 'var(--coach-muted)' }}>
            {ask.storeName} · {ask.productName}
          </span>
        </span>
        <span className="flex gap-2">
          <button
            type="button"
            onClick={onDifferent}
            disabled={busy}
            className="flex-1 rounded-[12px] font-extrabold text-[14px] disabled:opacity-60"
            style={{ minHeight: 44, boxShadow: 'inset 0 0 0 1.5px var(--coach-chip)' }}
          >
            Different
          </button>
          <button
            type="button"
            onClick={onYes}
            disabled={busy}
            className="flex-1 rounded-[12px] bg-accent text-accent-on font-extrabold text-[14px] disabled:opacity-60"
            style={{ minHeight: 44 }}
          >
            {busy ? 'Saving…' : 'Yes'}
          </button>
        </span>
      </div>
    </div>
  );
}
