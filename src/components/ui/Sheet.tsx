import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { useBreakpoint } from '../../hooks/useBreakpoint';

// Responsive modal: bottom sheet on mobile, centered dialog on wider screens.
export function Sheet({
  open,
  onClose,
  children,
  title,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  const { compact } = useBreakpoint();

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
      className="grid place-items-center rounded-full bg-surface shadow-[inset_0_0_0_1px_var(--line)]"
      style={{ width: 34, height: 34 }}
    >
      <Icon name="x" size={17} stroke={2.4} />
    </button>
  );

  const header = title && (
    <div className="flex items-center justify-between">
      <h3 className="m-0 font-display font-bold text-[21px]">{title}</h3>
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
          onClick={(e) => e.stopPropagation()}
          className="bg-paper w-full flex flex-col overflow-hidden animate-sl-pop"
          style={{ maxWidth: 460, maxHeight: '88%', borderRadius: 22, boxShadow: '0 24px 70px rgba(0,0,0,0.32)' }}
        >
          {title && <div className="px-[22px] pt-[18px] pb-3">{header}</div>}
          <div className="overflow-auto px-[22px] pt-1 pb-6">{children}</div>
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
        onClick={(e) => e.stopPropagation()}
        className="bg-paper w-full flex flex-col overflow-hidden animate-sl-up safe-bottom"
        style={{ maxHeight: '86%', borderRadius: '26px 26px 0 0', boxShadow: '0 -10px 40px rgba(0,0,0,0.18)' }}
      >
        <div className="pt-3 pb-1 flex justify-center">
          <div style={{ width: 40, height: 5, borderRadius: 3, background: 'var(--line)' }} />
        </div>
        {title && <div className="px-5 pt-1.5 pb-3">{header}</div>}
        <div className="overflow-auto px-5 pb-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
