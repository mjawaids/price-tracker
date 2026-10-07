// Pieces of the receipt screen: header, source tiles, progress, review rows, chips,
// problem cards.
import React from 'react';
import { tidyName } from '../../lib/compare/productName';
import type { CatalogProduct, CatalogStore } from '../../lib/compare/types';
import { Icon, StoreDot } from '../ui';
import type { IconName } from '../ui';
import type { Line, NotProduct } from './receiptHelpers';
import { localISO, shortDate } from './receiptHelpers';

export const cardCls = 'bg-surface rounded-[22px] shadow-card';
const groupTitleCls = 'm-0 text-[12.5px] font-extrabold tracking-[0.05em] uppercase text-ink-soft';

export function ScreenHeader({ title, onBack, action }: { title: string; onBack: () => void; action?: React.ReactNode }) {
  return (
    <header className="flex items-center gap-3">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        className="grid place-items-center rounded-full bg-surface shadow-[inset_0_0_0_1px_var(--line)] shrink-0"
        style={{ width: 44, height: 44 }}
      >
        <Icon name="back" size={20} stroke={2.2} />
      </button>
      <h1 className="m-0 flex-1 min-w-0 font-display font-extrabold text-[24px] tracking-[-0.02em]">{title}</h1>
      {action}
    </header>
  );
}

export function SourceTile({ icon, title, sub, onClick, disabled }: { icon: IconName; title: string; sub: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-3.5 text-left bg-surface rounded-[22px] shadow-[inset_0_0_0_1.5px_var(--line)] transition-transform active:scale-[0.99] disabled:opacity-40"
      style={{ minHeight: 76, padding: '14px 16px' }}
    >
      <span className="grid place-items-center shrink-0 bg-accent-wash text-accent-ink" style={{ width: 46, height: 46, borderRadius: 15 }}>
        <Icon name={icon} size={24} stroke={2} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block font-extrabold text-[16px]">{title}</span>
        <span className="block text-[13px] text-ink-soft mt-0.5 leading-snug">{sub}</span>
      </span>
    </button>
  );
}

/** "Read on your phone…" */
export function PrivacyNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 items-start rounded-[16px] bg-surface shadow-[inset_0_0_0_1px_var(--line)] text-[13.5px] text-ink-soft leading-snug" style={{ padding: '12px 14px' }}>
      <Icon name="lock" size={18} stroke={2.2} className="shrink-0 mt-px" />
      <span>{children}</span>
    </div>
  );
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="h-2 rounded-full overflow-hidden bg-[var(--backdrop)]">
      <div className="h-full rounded-full bg-accent transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function StepRow({ state, children }: { state: 'done' | 'now' | 'next'; children: React.ReactNode }) {
  return (
    <div className={`flex items-center gap-3 text-[14.5px] ${state === 'now' ? 'font-extrabold' : state === 'next' ? 'text-ink-soft' : ''}`} style={{ minHeight: 32 }}>
      {state === 'done' ? (
        <span className="grid place-items-center bg-accent text-accent-on shrink-0" style={{ width: 24, height: 24, borderRadius: 8 }}>
          <Icon name="check" size={15} stroke={3} />
        </span>
      ) : (
        <span
          aria-hidden
          className={`shrink-0 rounded-full ${state === 'now' ? 'motion-safe:animate-pulse' : ''}`}
          style={{ width: 24, height: 24, boxShadow: state === 'now' ? 'inset 0 0 0 3px var(--accent)' : 'inset 0 0 0 2px var(--line)' }}
        />
      )}
      <span>{children}</span>
    </div>
  );
}

/** Placeholder rows while reading. */
export function SkeletonRows({ n = 3 }: { n?: number }) {
  return (
    <div aria-hidden className={cardCls}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className={`flex items-center gap-3 ${i ? 'border-t border-line' : ''}`} style={{ padding: '11px 14px', minHeight: 64 }}>
          <span className="shrink-0 rounded-[8px] bg-[var(--backdrop)] motion-safe:animate-pulse" style={{ width: 24, height: 24 }} />
          <span className="flex-1 flex flex-col gap-2">
            <span className="h-3 rounded-full bg-[var(--backdrop)] motion-safe:animate-pulse" style={{ width: `${[78, 64, 72][i % 3]}%` }} />
            <span className="h-2.5 rounded-full bg-[var(--backdrop)] motion-safe:animate-pulse" style={{ width: `${[46, 52, 38][i % 3]}%` }} />
          </span>
          <span className="h-3 rounded-full bg-[var(--backdrop)] motion-safe:animate-pulse" style={{ width: 48 }} />
        </div>
      ))}
    </div>
  );
}

const chipCls = 'inline-flex items-center gap-1.5 rounded-full font-extrabold text-[13.5px] whitespace-nowrap';

/** Store · date · adds-up chips at the top of the review. */
export function SummaryChips({
  store,
  date,
  dateUnsure,
  addsUp,
  checkedAgainst,
  fmt,
  onStore,
  onDate,
}: {
  store: CatalogStore | null;
  date: string;
  dateUnsure: boolean;
  addsUp: boolean | null;
  checkedAgainst: number | null;
  fmt: (n: number) => string;
  onStore: () => void;
  onDate: () => void;
}) {
  const kind = store ? (store.kind === 'online' ? 'Online' : 'In store') : null;
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onStore}
        aria-label={store ? `Store: ${store.name}, ${kind}${store.ownerId ? ', only you' : ''}. Change` : 'Choose the store'}
        className={`${chipCls} max-w-full ${store ? 'bg-surface shadow-[inset_0_0_0_1.5px_var(--line)]' : 'bg-accent-wash text-accent-ink'}`}
        style={{ minHeight: 44, padding: '0 12px' }}
      >
        {store ? <StoreDot store={store} size={11} /> : <Icon name="store" size={16} stroke={2.2} />}
        <span className="truncate">{store ? `${store.name} · ${kind}` : 'Where was this?'}</span>
        <Icon name="chevD" size={15} stroke={2.4} className="shrink-0" />
      </button>
      <button
        type="button"
        onClick={onDate}
        aria-label={`Date: ${shortDate(date)}${dateUnsure ? ', not sure' : ''}. Change`}
        className={`${chipCls} ${dateUnsure ? 'bg-warn-wash text-warn-ink' : 'bg-surface shadow-[inset_0_0_0_1.5px_var(--line)]'}`}
        style={{ minHeight: 44, padding: '0 12px' }}
      >
        <Icon name="calendar" size={16} stroke={2.2} />
        {shortDate(date)}
        {dateUnsure ? '?' : ''}
      </button>
      {addsUp != null && (
        <span className={`${chipCls} ${addsUp ? 'bg-ok-wash text-ok-ink' : 'bg-warn-wash text-warn-ink'}`} style={{ minHeight: 44, padding: '0 12px' }}>
          <Icon name={addsUp ? 'checkCircle' : 'alert'} size={16} stroke={2.2} />
          {addsUp ? 'Adds up' : 'Doesn’t add up'}
          {addsUp && checkedAgainst != null && <span className="font-mono"> · {fmt(checkedAgainst)}</span>}
        </span>
      )}
    </div>
  );
}

export function GroupHeader({ id, title, count, icon, action }: { id: string; title: string; count: number; icon?: IconName; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2" style={{ margin: '20px 4px 8px', minHeight: 24 }}>
      <h2 id={id} className={`${groupTitleCls} flex items-center gap-1.5`}>
        {icon && <Icon name={icon} size={15} stroke={2.4} />}
        {title} · {count}
      </h2>
      {action}
    </div>
  );
}

const NOTE_TEXT: Record<NonNullable<Line['note']>, string> = {
  'cut-off': 'Name was cut off — check it’s the right one',
  unsure: 'Best guess — check it’s the right one',
  unclear: 'Hard to read — check the price',
  numbers: 'The numbers don’t quite agree — check the price',
};

/** One receipt line in the review. */
export function LineRow({
  line,
  product,
  fmt,
  shelfPrice,
  first,
  onToggle,
  onOpen,
  onChoose,
}: {
  line: Line;
  product: CatalogProduct | undefined;
  fmt: (n: number) => string;
  /** The store's current price, to show "was Rs 550". */
  shelfPrice: number | null;
  first: boolean;
  onToggle: (on: boolean) => void;
  onOpen: () => void;
  onChoose: () => void;
}) {
  const raw = line.item.lines.join(' ') || line.item.name;
  const border = first ? '' : 'border-t border-line';
  const priceText = fmt(line.unitPrice);

  // No product yet: the line as read, its price and "Choose".
  if (!line.saveable) {
    return (
      <div className={`flex items-center gap-3 ${border}`} style={{ padding: '11px 14px', minHeight: 64 }}>
        <button type="button" onClick={onOpen} className="flex-1 min-w-0 text-left" style={{ minHeight: 44 }}>
          <span className="block font-mono text-[12.5px] text-ink truncate">{raw}</span>
          {line.note === 'cut-off' && <span className="block text-[12px] font-bold text-warn-ink mt-1">Name was cut off</span>}
        </button>
        <span className="font-mono font-bold text-[13.5px] whitespace-nowrap">{priceText}</span>
        <button
          type="button"
          onClick={onChoose}
          aria-label={`Choose product for ${line.item.name}, ${priceText}`}
          className="shrink-0 rounded-[12px] bg-accent-wash text-accent-ink font-extrabold text-[13.5px]"
          style={{ minHeight: 44, padding: '0 14px' }}
        >
          Choose
        </button>
      </div>
    );
  }

  const name = product?.name ?? (line.group === 'medicine' ? tidyName(line.item.name) : raw);
  const was = shelfPrice != null && Math.abs(shelfPrice - line.unitPrice) >= 1 && line.group !== 'already' ? shelfPrice : null;
  const sub =
    line.group === 'already' && line.already
      ? `You added this price on ${shortDate(localISO(new Date(line.already.observedAt)))}`
      : line.group === 'medicine' && !product
        ? `${raw} · new, only you see it`
        : raw;
  const warn = line.group === 'check' && line.note ? NOTE_TEXT[line.note] : null;
  return (
    <div className={`flex items-center gap-3 ${border} ${line.group === 'check' && !line.include ? 'bg-warn-wash' : ''}`} style={{ padding: '6px 14px 6px 4px', minHeight: 64 }}>
      <label className="grid place-items-center shrink-0 cursor-pointer" style={{ width: 44, height: 44 }}>
        <input
          type="checkbox"
          checked={line.include}
          onChange={(e) => onToggle(e.target.checked)}
          aria-label={`Include ${name}, ${priceText}`}
          className="m-0"
          style={{ width: 22, height: 22, accentColor: 'var(--accent)' }}
        />
      </label>
      <button type="button" onClick={onOpen} aria-label={`Edit ${name}`} className="flex-1 min-w-0 text-left py-1.5">
        <span className="block font-bold text-[14.5px] leading-snug line-clamp-2">
          {name}
          {line.group === 'check' && !line.chosen ? '?' : ''}
        </span>
        <span className="block font-mono text-[11.5px] text-ink-soft mt-0.5 truncate">{sub}</span>
        {warn && <span className="block text-[12px] font-bold text-warn-ink mt-1">{warn}</span>}
      </button>
      <span className="shrink-0 text-right font-mono font-bold text-[14.5px] whitespace-nowrap">
        {priceText}
        {line.quantity > 1 ? (
          <span className="block font-sans font-semibold text-[11.5px] text-ink-soft mt-0.5">each · {line.quantity} bought</span>
        ) : was != null ? (
          <span className="block font-sans font-semibold text-[11.5px] text-ink-soft mt-0.5">was {fmt(was)}</span>
        ) : null}
      </span>
    </div>
  );
}

/** Fees, discounts, payment and lines marked "not a product" (collapsed). */
export function NotProductsPanel({
  items,
  open,
  onToggle,
  onRestore,
  fmt,
}: {
  items: NotProduct[];
  open: boolean;
  onToggle: () => void;
  onRestore: (itemId: string) => void;
  fmt: (n: number) => string;
}) {
  if (!items.length) return null;
  const preview = items
    .slice(0, 3)
    .map((i) => i.label.toLowerCase())
    .join(', ');
  return (
    <div className="mt-3.5 rounded-[16px] bg-surface shadow-[inset_0_0_0_1px_var(--line)] overflow-hidden">
      <button type="button" onClick={onToggle} aria-expanded={open} className="w-full flex items-center gap-2.5 text-left" style={{ minHeight: 52, padding: '8px 14px' }}>
        <span className="flex-1 min-w-0">
          <span className="block font-extrabold text-[14px]">Not products · {items.length}</span>
          {!open && <span className="block text-[12.5px] text-ink-soft truncate first-letter:uppercase">{preview}</span>}
        </span>
        <Icon name="chevD" size={17} stroke={2.2} className={`shrink-0 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul className="m-0 p-0 list-none border-t border-line">
          {items.map((i) => (
            <li key={i.key} className="flex items-center gap-3 border-t border-line first:border-t-0 text-[13.5px]" style={{ padding: '6px 14px', minHeight: 48 }}>
              <span className="flex-1 min-w-0 truncate">{i.label}</span>
              <span className="font-mono text-ink-soft whitespace-nowrap">
                {i.discount ? '−' : ''}
                {fmt(i.amount)}
              </span>
              {i.itemId && (
                <button type="button" onClick={() => onRestore(i.itemId as string)} className="shrink-0 font-extrabold text-[13px] text-accent-ink" style={{ minHeight: 44, padding: '0 6px' }}>
                  It’s a product
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type Tone = 'accent' | 'warn' | 'danger';
const TONES: Record<Tone, string> = {
  accent: 'bg-accent-wash text-accent-ink',
  warn: 'bg-warn-wash text-warn-ink',
  danger: 'bg-danger-wash text-danger',
};

/** An error or empty state with what to do next. */
export function ProblemCard({
  icon,
  tone = 'accent',
  title,
  body,
  children,
}: {
  icon: IconName;
  tone?: Tone;
  title: string;
  body: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section role="status" className={`${cardCls} flex flex-col gap-2.5`} style={{ padding: 18 }}>
      <span className={`grid place-items-center ${TONES[tone]}`} style={{ width: 44, height: 44, borderRadius: 14 }}>
        <Icon name={icon} size={22} stroke={2.2} />
      </span>
      <h2 className="m-0 font-display font-extrabold text-[19px] tracking-[-0.015em]">{title}</h2>
      <div className="m-0 text-[14px] leading-relaxed text-ink-soft">{body}</div>
      {children && <div className="flex flex-col gap-2 mt-1">{children}</div>}
    </section>
  );
}
