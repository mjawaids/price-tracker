import React, { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { useBreakpoint } from '../../hooks/useBreakpoint';

// Responsive modal: bottom sheet on mobile, centered dialog on wider screens. It grows
// to fit its content and scrolls inside only when that is taller than the screen.
export function Sheet({
  open,
  onClose,
  children,
  title,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  /** Actions pinned below the scrolling body, so they're always visible. */
  footer?: React.ReactNode;
}) {
  const { compact } = useBreakpoint();
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const closeBtn = (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close"
      className="grid place-items-center rounded-full bg-surface shadow-[inset_0_0_0_1px_var(--line)]"
      style={{ width: 44, height: 44 }}
    >
      <Icon name="x" size={17} stroke={2.4} />
    </button>
  );

  const header = title && (
    <div className="flex items-center justify-between">
      <h3 id={titleId} className="m-0 font-display font-bold text-[21px]">
        {title}
      </h3>
      {closeBtn}
    </div>
  );

  if (!compact) {
    return createPortal(
      <div
        onClick={onClose}
        className="fixed inset-0 z-[100] flex items-center justify-center p-7 animate-sl-fade"
        style={{ background: 'rgba(20,17,12,0.4)' }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          onClick={(e) => e.stopPropagation()}
          className="bg-paper w-full flex flex-col overflow-hidden animate-sl-pop"
          style={{ maxWidth: 460, maxHeight: '100%', borderRadius: 22, boxShadow: '0 24px 70px rgba(0,0,0,0.32)' }}
        >
          {title && <div className="shrink-0 px-[22px] pt-[18px] pb-3">{header}</div>}
          <div className={`flex-1 min-h-0 overflow-auto px-[22px] pt-1 ${footer ? 'pb-4' : 'pb-6'}`}>{children}</div>
          {footer && <div className="shrink-0 border-t border-line px-[22px] pt-3 pb-[18px]">{footer}</div>}
        </div>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-end animate-sl-fade"
      style={{ background: 'rgba(20,17,12,0.34)' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        onClick={(e) => e.stopPropagation()}
        className="bg-paper w-full flex flex-col overflow-hidden animate-sl-up safe-bottom"
        style={{ maxHeight: 'calc(100% - 16px - env(safe-area-inset-top, 0px))', borderRadius: '26px 26px 0 0', boxShadow: '0 -10px 40px rgba(0,0,0,0.18)' }}
      >
        <div className="shrink-0 pt-3 pb-1 flex justify-center">
          <div style={{ width: 40, height: 5, borderRadius: 3, background: 'var(--line)' }} />
        </div>
        {title && <div className="shrink-0 px-5 pt-1 pb-2">{header}</div>}
        <div className={`flex-1 min-h-0 overflow-auto px-5 ${footer ? 'pb-4' : 'pb-6'}`}>{children}</div>
        {footer && <div className="shrink-0 border-t border-line px-5 pt-3 pb-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
