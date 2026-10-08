import React from 'react';
import { Icon, IconName } from './Icon';
import { Btn } from './primitives';
import { Sheet } from './Sheet';

/**
 * Asks before something that can't be undone (removing a price, deleting a store or
 * product, throwing away typed answers). The danger button runs `onConfirm`; while
 * `busy`, the sheet can't be closed and the button says `busyLabel`.
 */
export function ConfirmSheet({
  open,
  title,
  children,
  confirmLabel,
  busyLabel,
  keepLabel = 'Keep it',
  icon = 'trash',
  busy = false,
  error,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  /** What's affected and what happens, in plain words. */
  children: React.ReactNode;
  confirmLabel: string;
  busyLabel?: string;
  keepLabel?: string;
  icon?: IconName;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet
      open={open}
      onClose={busy ? () => undefined : onClose}
      title={title}
      footer={
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="w-full rounded-btn bg-danger text-accent-on font-extrabold text-[17px] transition-transform active:scale-[0.975] disabled:opacity-60"
            style={{ minHeight: 56 }}
          >
            {busy ? busyLabel ?? confirmLabel : confirmLabel}
          </button>
          <Btn variant="ghost" full onClick={onClose} disabled={busy} className="shadow-none">
            {keepLabel}
          </Btn>
        </div>
      }
    >
      <div className="flex flex-col gap-3.5">
        <span aria-hidden className="grid place-items-center rounded-[16px] bg-danger-wash text-danger" style={{ width: 48, height: 48 }}>
          <Icon name={icon} size={22} stroke={2.2} />
        </span>
        {children}
        {error && (
          <div role="alert" className="text-[13.5px] font-semibold text-danger">
            {error}
          </div>
        )}
      </div>
    </Sheet>
  );
}
