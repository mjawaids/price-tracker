import React, { useRef, useState } from 'react';
import { ListItem } from '../../types';
import { formatQty } from '../../utils/quickAdd';
import { SyncStatus } from '../../lib/offline/sync';
import { Icon } from '../ui';
import { buzz, categoryMeta } from './listHelpers';

const sectionLabel = 'font-mono text-[11px] font-bold tracking-[0.12em] uppercase text-ink-soft';

// ── Sync badge ───────────────────────────────────────────────────────────────
export function SyncBadge({ status, pending }: { status: SyncStatus; pending: number }) {
  if (status === 'offline') {
    return (
      <span className="inline-flex items-center gap-[5px] rounded-full bg-warn-wash text-warn-ink text-[12.5px] font-bold" style={{ padding: '4px 10px' }}>
        <Icon name="wifiOff" size={14} stroke={2.4} />
        Offline{pending > 0 ? ` · ${pending} to sync` : ''}
      </span>
    );
  }
  const label =
    status === 'syncing' ? 'Syncing…' : status === 'error' ? 'Will retry sync' : status === 'local' ? 'Saved on this device' : 'Synced';
  return (
    <span className="inline-flex items-center gap-[5px] text-ink-soft text-[12.5px] font-semibold" aria-live="polite">
      <Icon name={status === 'syncing' ? 'refresh' : status === 'error' ? 'cloudOff' : 'cloud'} size={15} stroke={2.2} className={status === 'syncing' ? 'animate-sl-spin' : ''} />
      {label}
    </span>
  );
}

export function OfflineBanner({ pending }: { pending: number }) {
  return (
    <div role="status" className="flex gap-3 items-start rounded-btn bg-warn-wash animate-sl-fade" style={{ padding: '12px 14px' }}>
      <span className="shrink-0 grid place-items-center rounded-[10px] text-warn-ink" style={{ width: 32, height: 32, background: 'var(--warn-chip)' }}>
        <Icon name="wifiOff" size={17} stroke={2.4} />
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="font-bold text-[14.5px]">You’re offline — keep going</span>
        <span className="text-[13.5px] leading-snug text-ink-soft">
          {pending > 0
            ? `${pending} ${pending === 1 ? 'change is' : 'changes are'} saved on this device and will sync when you’re back online.`
            : 'Changes are saved on this device and will sync when you’re back online.'}
        </span>
      </span>
    </div>
  );
}

// ── Progress while shopping ──────────────────────────────────────────────────
export function ShoppingProgress({ done, total }: { done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2.5" aria-label={`${done} of ${total} in cart`}>
      <div className="flex-1 rounded-full overflow-hidden bg-[var(--line)]" style={{ height: 6 }}>
        <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-[12.5px] font-bold text-ink-soft whitespace-nowrap">
        {done} of {total} in cart
      </span>
    </div>
  );
}

// ── Item row (tick, open, swipe) ─────────────────────────────────────────────
const SWIPE_TRIGGER = 84;

export function ItemRow({
  item,
  onToggle,
  onOpen,
  onDelete,
  nudge,
  fresh,
  onSwiped,
}: {
  item: ListItem;
  onToggle: () => void;
  onOpen: () => void;
  onDelete: () => void;
  /** Called after a swipe action (for the swipe tip). */
  onSwiped?: () => void;
  /** One-time swipe demonstration (hint). */
  nudge?: boolean;
  /** Just added — animate in. */
  fresh?: boolean;
}) {
  const [dx, setDx] = useState(0);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const swiping = useRef(false);
  const qty = formatQty(item.quantity, item.unit);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'touch') return;
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    swiping.current = false;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    const mx = e.clientX - s.x;
    const my = e.clientY - s.y;
    if (!swiping.current) {
      if (Math.abs(my) > 10 && Math.abs(my) > Math.abs(mx)) {
        start.current = null; // vertical scroll — let it go
        return;
      }
      if (Math.abs(mx) < 10) return;
      swiping.current = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    setDx(Math.max(-140, Math.min(140, mx)));
  };
  const onPointerEnd = () => {
    if (swiping.current) {
      if (dx >= SWIPE_TRIGGER) {
        buzz();
        onToggle();
        onSwiped?.();
      } else if (dx <= -SWIPE_TRIGGER) {
        buzz();
        onDelete();
        onSwiped?.();
      }
    }
    start.current = null;
    setDx(0);
    // Let the click that follows a swipe be ignored.
    setTimeout(() => (swiping.current = false), 0);
  };

  const revealTick = dx > 0;
  return (
    <li className={`relative overflow-hidden bg-surface ${fresh ? 'animate-sl-item' : ''}`}>
      {dx !== 0 && (
        <div
          aria-hidden
          className={`absolute inset-0 flex items-center ${revealTick ? 'justify-start bg-accent text-accent-on' : 'justify-end bg-danger text-accent-on'}`}
          style={{ padding: '0 22px' }}
        >
          <span className="inline-flex items-center gap-2 font-bold text-sm">
            <Icon name={revealTick ? 'check' : 'trash'} size={18} stroke={2.6} />
            {revealTick ? 'In cart' : 'Delete'}
          </span>
        </div>
      )}
      <div
        className={`relative flex items-center gap-0.5 bg-surface ${nudge ? 'animate-sl-nudge' : ''}`}
        style={{
          minHeight: 56,
          padding: '0 12px 0 4px',
          transform: dx ? `translateX(${dx}px)` : undefined,
          transition: dx ? 'none' : 'transform 0.2s ease',
          touchAction: 'pan-y',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        <button
          type="button"
          onClick={() => {
            if (swiping.current) return;
            buzz();
            onToggle();
          }}
          aria-label={item.done ? `Move ${item.name} back to the list` : `Mark ${item.name} as in cart`}
          aria-pressed={item.done}
          className="shrink-0 grid place-items-center bg-transparent"
          style={{ width: 48, height: 48 }}
        >
          {item.done ? (
            <span className="grid place-items-center rounded-full bg-accent text-accent-on animate-sl-check" style={{ width: 24, height: 24 }}>
              <Icon name="check" size={15} stroke={3.2} />
            </span>
          ) : (
            <span className="block rounded-full shadow-[inset_0_0_0_2px_var(--ink-faint)]" style={{ width: 24, height: 24 }} />
          )}
        </button>
        <button
          type="button"
          onClick={() => !swiping.current && onOpen()}
          aria-label={`Edit ${item.name}`}
          className="flex-1 min-w-0 text-left bg-transparent flex flex-col justify-center gap-0.5"
          style={{ minHeight: 48, padding: '8px 0' }}
        >
          <span
            className={`truncate ${item.done ? 'text-[16px] font-medium text-ink-soft line-through decoration-[var(--ink-faint)]' : 'text-[16.5px] font-semibold tracking-[-0.01em] text-ink'}`}
          >
            {item.name}
          </span>
          {item.note && !item.done && <span className="truncate text-[13px] text-ink-soft">{item.note}</span>}
        </button>
        {qty &&
          (item.done ? (
            <span className="shrink-0 font-mono text-[12.5px] text-ink-soft">{qty}</span>
          ) : (
            <span className="shrink-0 font-mono text-[13px] font-bold rounded-full bg-accent-wash text-accent-ink" style={{ padding: '4px 10px' }}>
              {qty}
            </span>
          ))}
      </div>
    </li>
  );
}

export function ItemGroup({ name, dot, count, children }: { name: string; dot: string; count?: number; children: React.ReactNode }) {
  return (
    <section aria-label={name} className="flex flex-col gap-2">
      <h3 className={`m-0 flex items-center gap-2 px-1.5 ${sectionLabel}`}>
        <span aria-hidden className="rounded-full" style={{ width: 8, height: 8, background: dot }} />
        {name}
        {count != null && <span className="font-normal">{count}</span>}
      </h3>
      <ul className="list-none m-0 p-0 flex flex-col gap-px bg-[var(--line)] rounded-[18px] overflow-hidden shadow-card">{children}</ul>
    </section>
  );
}

// ── Ticked items ─────────────────────────────────────────────────────────────
export function DoneSection({
  count,
  open,
  onToggleOpen,
  onClear,
  children,
}: {
  count: number;
  open: boolean;
  onToggleOpen: () => void;
  onClear: () => void;
  children: React.ReactNode;
}) {
  return (
    <section aria-label="In cart" className="flex flex-col gap-2">
      <div className="flex items-center justify-between pl-1.5 pr-0.5">
        <button
          type="button"
          onClick={onToggleOpen}
          aria-expanded={open}
          className={`flex items-center gap-1.5 bg-transparent ${sectionLabel}`}
          style={{ minHeight: 44 }}
        >
          <Icon name="chevD" size={16} stroke={2.6} className={`transition-transform ${open ? '' : '-rotate-90'}`} />
          In cart · {count}
        </button>
        <button
          type="button"
          onClick={onClear}
          className="rounded-[12px] bg-accent-wash text-accent-ink font-bold text-sm"
          style={{ minHeight: 40, padding: '0 14px' }}
        >
          Clear
        </button>
      </div>
      {open && <ul className="list-none m-0 p-0 flex flex-col gap-px bg-[var(--line)] rounded-[18px] overflow-hidden">{children}</ul>}
    </section>
  );
}

// ── Add bar ──────────────────────────────────────────────────────────────────
export function AddBar({
  value,
  onChange,
  onSubmit,
  onPasteLines,
  placeholder,
  inputRef,
  trailingHint,
  onFocusChange,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onPasteLines: (lines: string[]) => void;
  placeholder: string;
  inputRef?: React.Ref<HTMLInputElement>;
  trailingHint?: string;
  onFocusChange?: (focused: boolean) => void;
}) {
  const active = value.trim().length > 0;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="flex items-center gap-2 rounded-[18px] bg-surface transition-shadow"
      style={{
        padding: '5px 5px 5px 16px',
        boxShadow: `inset 0 0 0 2px ${active ? 'var(--accent)' : 'var(--line)'}, 0 1px 2px rgba(41,33,24,0.045)`,
      }}
    >
      <label htmlFor="quick-add" className="sr-only">
        Add an item
      </label>
      <input
        id="quick-add"
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && onChange('')}
        onFocus={() => onFocusChange?.(true)}
        onBlur={() => onFocusChange?.(false)}
        onPaste={(e) => {
          const text = e.clipboardData.getData('text');
          if (text.includes('\n')) {
            e.preventDefault();
            onPasteLines(text.split(/\r?\n/).map((l) => l.replace(/^\s*(?:[-*•]+|\d+[.)])\s+/, '').trim()).filter(Boolean));
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
        enterKeyHint="done"
        className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[16px] font-semibold text-ink placeholder:text-ink-soft placeholder:font-medium"
        style={{ height: 46 }}
      />
      {trailingHint && !active && (
        <span className="hidden md:inline font-mono text-[11.5px] text-ink-soft rounded-[8px] shadow-[inset_0_0_0_1px_var(--line)] mr-1.5" style={{ padding: '4px 8px' }}>
          {trailingHint}
        </span>
      )}
      <button
        type="submit"
        aria-label="Add item"
        className={`shrink-0 grid place-items-center rounded-[14px] transition-colors ${active ? 'bg-accent text-accent-on' : 'bg-accent-wash text-accent-ink'}`}
        style={{ width: 46, height: 46 }}
      >
        <Icon name="plus" size={22} stroke={2.8} />
      </button>
    </form>
  );
}

// ── Suggestions while typing ─────────────────────────────────────────────────
export function SuggestionPanel({
  exactLabel,
  onExact,
  suggestions,
  onPick,
}: {
  exactLabel: string;
  onExact: () => void;
  suggestions: { name: string; category: string; fromHistory: boolean }[];
  onPick: (name: string) => void;
}) {
  return (
    <div
      aria-label="Suggestions"
      className="flex flex-col bg-surface rounded-[18px] p-1.5 shadow-card shadow-[inset_0_0_0_1px_var(--line)] animate-sl-fade"
    >
      <button
        type="button"
        onClick={onExact}
        className="flex items-center gap-3 rounded-[12px] bg-accent-wash text-accent-ink text-left font-bold text-[15.5px]"
        style={{ minHeight: 48, padding: '0 12px' }}
      >
        <Icon name="plus" size={18} stroke={2.8} />
        <span className="truncate">{exactLabel}</span>
      </button>
      {suggestions.map((s) => {
        const c = categoryMeta(s.category);
        return (
          <button
            key={s.name}
            type="button"
            onClick={() => onPick(s.name)}
            className="flex items-center gap-3 rounded-[12px] bg-transparent text-left text-ink hover:bg-paper"
            style={{ minHeight: 48, padding: '0 12px' }}
          >
            <span aria-hidden className="grid place-items-center" style={{ width: 18 }}>
              {s.fromHistory ? (
                <Icon name="history" size={15} stroke={2.2} color="var(--ink-soft)" />
              ) : (
                <span className="rounded-full" style={{ width: 8, height: 8, background: c.dot }} />
              )}
            </span>
            <span className="flex-1 text-[15.5px] font-semibold truncate">{s.name}</span>
            <span className="text-[12.5px] text-ink-soft shrink-0">{c.name}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── "Often bought" chips ─────────────────────────────────────────────────────
export function OftenStrip({ names, onPick, label = 'Often' }: { names: string[]; onPick: (n: string) => void; label?: string }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
      <span className={`shrink-0 inline-flex items-center gap-[5px] ${sectionLabel} text-[10.5px]`}>
        <Icon name="history" size={14} stroke={2.4} />
        {label}
      </span>
      {names.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onPick(n)}
          aria-label={`Add ${n}`}
          className="shrink-0 inline-flex items-center gap-[5px] rounded-full bg-surface shadow-[inset_0_0_0_1px_var(--line)] text-[14.5px] font-semibold text-ink active:scale-[0.97] transition-transform"
          style={{ minHeight: 40, padding: '0 14px' }}
        >
          <Icon name="plus" size={13} stroke={3} color="var(--accent-ink)" />
          {n}
        </button>
      ))}
    </div>
  );
}

// ── Empty list ───────────────────────────────────────────────────────────────
export function EmptyList({ starters, onPick }: { starters: string[]; onPick: (n: string) => void }) {
  return (
    <section className="flex flex-col items-center text-center gap-2.5 px-3 pt-12 pb-2 animate-sl-fade">
      <div className="grid place-items-center bg-accent-wash text-accent-ink mb-2" style={{ width: 84, height: 84, borderRadius: 26 }}>
        <Icon name="lists" size={38} stroke={2} />
      </div>
      <h2 className="m-0 font-display font-extrabold text-[23px] tracking-[-0.02em]">What do you need?</h2>
      <p className="m-0 max-w-[280px] text-[15px] leading-relaxed text-ink-soft">
        Just type it — milk, bread, atta. No brands or sizes needed. Try “2 milk” to set a quantity.
      </p>
      <div className={`mt-[18px] ${sectionLabel}`}>Tap to add</div>
      <div className="flex flex-wrap justify-center gap-2 max-w-[340px]">
        {starters.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onPick(n)}
            aria-label={`Add ${n}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-surface shadow-[inset_0_0_0_1px_var(--line)] text-[15px] font-semibold text-ink active:scale-[0.97] transition-transform"
            style={{ minHeight: 44, padding: '0 16px' }}
          >
            <Icon name="plus" size={15} stroke={2.8} color="var(--accent-ink)" />
            {n}
          </button>
        ))}
      </div>
    </section>
  );
}

export function ListSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Loading your list">
      {[3, 2].map((rows, g) => (
        <div key={g} className="flex flex-col gap-2">
          <div className="skeleton rounded-full" style={{ width: 120, height: 10, marginLeft: 6 }} />
          <div className="flex flex-col gap-px rounded-[18px] overflow-hidden">
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="bg-surface flex items-center gap-3" style={{ height: 56, padding: '0 16px' }}>
                <div className="skeleton rounded-full" style={{ width: 24, height: 24 }} />
                <div className="skeleton rounded-full" style={{ width: `${40 + ((i * 17) % 35)}%`, height: 12 }} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function AllDone({ minutes }: { minutes: number | null }) {
  return (
    <div className="flex flex-col items-center gap-1.5 pt-7 pb-1 text-center animate-sl-pop">
      <span className="grid place-items-center rounded-full bg-accent text-accent-on mb-1 animate-sl-check" style={{ width: 52, height: 52 }}>
        <Icon name="check" size={28} stroke={3} />
      </span>
      <span className="font-display font-extrabold text-[20px]">All picked up</span>
      <span className="text-sm text-ink-soft">
        {minutes != null && minutes > 0 ? `Done in ${minutes} min. ` : ''}Clear the ticked items when you’re home.
      </span>
    </div>
  );
}
