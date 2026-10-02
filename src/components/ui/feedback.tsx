import React from 'react';
import { Icon, IconName } from './Icon';

// ── Toast / snackbar with an optional action (e.g. Undo) ─────────────────────
export function Toast({
  message,
  actionLabel,
  onAction,
  icon,
  className = '',
  style,
}: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: IconName;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center gap-3 bg-ink text-paper rounded-btn animate-sl-pop shadow-[0_10px_30px_rgba(41,33,24,0.25)] ${className}`}
      style={{ padding: actionLabel ? '6px 6px 6px 16px' : '13px 16px', ...style }}
    >
      {icon && <Icon name={icon} size={18} stroke={2.4} className="shrink-0" />}
      <span className="flex-1 text-[14.5px] font-semibold leading-snug">{message}</span>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="shrink-0 font-extrabold text-[14.5px] rounded-[12px] bg-transparent"
          style={{ minHeight: 44, padding: '0 16px', color: 'var(--accent-wash)' }}
        >
          {actionLabel}
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
