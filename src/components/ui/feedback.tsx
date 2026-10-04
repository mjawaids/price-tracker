import React from 'react';
import { Icon, IconName } from './Icon';

// ── Toast / snackbar with an optional action (e.g. Undo) and dismiss ────────
export function Toast({
  message,
  actionLabel,
  onAction,
  actionDisabled,
  onDismiss,
  dismissLabel = 'Dismiss',
  icon,
  className = '',
  style,
}: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  onDismiss?: () => void;
  dismissLabel?: string;
  icon?: IconName;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center gap-3 bg-ink text-paper rounded-btn animate-sl-pop shadow-[0_10px_30px_rgba(41,33,24,0.25)] ${className}`}
      style={{ padding: actionLabel || onDismiss ? '6px 6px 6px 16px' : '13px 16px', ...style }}
    >
      {icon && <Icon name={icon} size={18} stroke={2.4} className="shrink-0" />}
      <span className="flex-1 text-[14.5px] font-semibold leading-snug">{message}</span>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          disabled={actionDisabled}
          className="shrink-0 font-extrabold text-[14.5px] rounded-[12px] bg-transparent disabled:opacity-60"
          style={{ minHeight: 44, padding: '0 16px', color: 'var(--accent-wash)' }}
        >
          {actionLabel}
        </button>
      )}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissLabel}
          className="shrink-0 grid place-items-center rounded-[12px] bg-transparent text-paper"
          style={{ width: 44, height: 44 }}
        >
          <Icon name="x" size={16} stroke={2.4} />
        </button>
      )}
    </div>
  );
}

// ── Segmented control (tabs within a section) ────────────────────────────────
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="grid gap-1 p-1 rounded-btn bg-[var(--backdrop)]"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.id)}
            className={`rounded-[12px] text-[14.5px] transition-colors ${
              on ? 'bg-surface text-ink font-extrabold shadow-[0_1px_2px_rgba(41,33,24,0.08)]' : 'bg-transparent text-ink-soft font-semibold'
            }`}
            style={{ minHeight: 44 }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Coach mark: a one-time tip pointing at the thing it explains ─────────────
export function CoachMark({
  text,
  onDismiss,
  onHideAll,
  arrow = 'up',
  arrowLeft = 30,
  className = '',
}: {
  text: string;
  onDismiss: () => void;
  onHideAll?: () => void;
  arrow?: 'up' | 'down' | 'none';
  arrowLeft?: number;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`relative flex gap-3 items-start rounded-[18px] bg-ink text-paper animate-sl-pop shadow-[0_10px_30px_rgba(41,33,24,0.22)] ${className}`}
      style={{ padding: '14px 14px 10px' }}
    >
      {arrow !== 'none' && (
        <span
          aria-hidden
          className="absolute bg-ink rotate-45 rounded-[3px]"
          style={{ width: 14, height: 14, left: arrowLeft, ...(arrow === 'up' ? { top: -6 } : { bottom: -6 }) }}
        />
      )}
      <span className="shrink-0 grid place-items-center rounded-[10px]" style={{ width: 32, height: 32, background: 'var(--coach-chip)', color: 'var(--coach-chip-ink)' }}>
        <Icon name="bulb" size={17} stroke={2.2} />
      </span>
      <span className="flex-1 flex flex-col gap-1.5">
        <span className="text-[14.5px] leading-snug font-semibold">{text}</span>
        <span className="flex items-center justify-end gap-1">
          {onHideAll && (
            <button
              type="button"
              onClick={onHideAll}
              className="bg-transparent text-[13px] font-semibold rounded-[12px]"
              style={{ minHeight: 40, padding: '0 10px', color: 'var(--coach-muted)' }}
            >
              Hide tips
            </button>
          )}
          <button
            type="button"
            onClick={onDismiss}
            className="bg-paper text-ink font-extrabold text-sm rounded-[12px]"
            style={{ minHeight: 40, padding: '0 14px' }}
          >
            Got it
          </button>
        </span>
      </span>
    </div>
  );
}

// ── Inline tip row (lighter than a coach mark) ───────────────────────────────
export function TipRow({ text, icon = 'bulb', onDismiss }: { text: string; icon?: IconName; onDismiss: () => void }) {
  return (
    <div role="status" className="flex items-center gap-2.5 rounded-[14px] bg-accent-wash text-accent-ink animate-sl-fade" style={{ padding: '4px 4px 4px 12px' }}>
      <Icon name={icon} size={16} stroke={2.2} className="shrink-0" />
      <span className="flex-1 text-[13.5px] font-semibold leading-snug" style={{ padding: '6px 0' }}>
        {text}
      </span>
      <button type="button" onClick={onDismiss} aria-label="Dismiss tip" className="shrink-0 grid place-items-center rounded-[12px] bg-transparent" style={{ width: 40, height: 40 }}>
        <Icon name="x" size={16} stroke={2.4} />
      </button>
    </div>
  );
}
