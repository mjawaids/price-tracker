import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { pushLayer, removeLayer } from '../../lib/backStack';

/** Pulled this far down (px), or flicked down, a bottom sheet closes. */
const CLOSE_DISTANCE = 96;
const CLOSE_SPEED = 0.6; // px per ms

const reducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Responsive modal: bottom sheet on mobile, centered dialog on wider screens. It grows
// to fit its content and scrolls inside only when that is taller than the screen.
// Back (the phone's button, the browser's, the edge swipe) closes it as its own close
// button does — so a sheet that asks before throwing away typed answers asks then too —
// and on mobile it can be pulled down by its handle or title.
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
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  // Back asked it to close; if it's still open next render (a busy confirm, or a
  // sheet that asks first), it takes a new history entry.
  const [backTick, setBackTick] = useState(0);

  useEffect(() => {
    if (!open) return;
    const id = pushLayer(() => {
      closeRef.current();
      setBackTick((n) => n + 1);
    });
    return () => removeLayer(id);
  }, [open, backTick]);

  // Pull-down to close (bottom sheet only). The sheet follows the finger; styles are
  // set directly so a drag doesn't re-render the content.
  const panelRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; y: number; t: number; dy: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const setOffset = (dy: number, animate: boolean) => {
    const el = panelRef.current;
    if (!el) return;
    el.style.transition = animate && !reducedMotion() ? 'transform 200ms ease-out' : 'none';
    el.style.transform = dy ? `translateY(${dy}px)` : '';
  };
  const dragHandlers = {
    onPointerDown: (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest('button, a, input, textarea, select')) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      drag.current = { id: e.pointerId, y: e.clientY, t: e.timeStamp, dy: 0 };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      setDragging(true);
    },
    onPointerMove: (e: React.PointerEvent) => {
      const d = drag.current;
      if (!d || d.id !== e.pointerId) return;
      d.dy = Math.max(0, e.clientY - d.y);
      setOffset(d.dy, false);
    },
    onPointerUp: (e: React.PointerEvent) => {
      const d = drag.current;
      if (!d || d.id !== e.pointerId) return;
      drag.current = null;
      setDragging(false);
      const speed = d.dy / Math.max(1, e.timeStamp - d.t);
      if (d.dy > CLOSE_DISTANCE || (d.dy > 24 && speed > CLOSE_SPEED)) {
        onClose();
        // Still open (it asks first): slide back.
        requestAnimationFrame(() => setOffset(0, true));
      } else {
        setOffset(0, true);
      }
    },
    onPointerCancel: () => {
      drag.current = null;
      setDragging(false);
      setOffset(0, true);
    },
  };

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
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        onClick={(e) => e.stopPropagation()}
        className="bg-paper w-full flex flex-col overflow-hidden animate-sl-up safe-bottom"
        style={{ maxHeight: 'calc(100% - 16px - env(safe-area-inset-top, 0px))', borderRadius: '26px 26px 0 0', boxShadow: '0 -10px 40px rgba(0,0,0,0.18)' }}
      >
        <div {...dragHandlers} className="shrink-0 cursor-grab" style={{ touchAction: 'none' }}>
          <div className="pt-3 pb-1 flex justify-center">
            <div
              className="transition-[width,background-color] duration-150 motion-reduce:transition-none"
              style={{ width: dragging ? 56 : 40, height: 5, borderRadius: 3, background: dragging ? 'var(--accent)' : 'var(--line)' }}
            />
          </div>
          {title && <div className="px-5 pt-1 pb-2">{header}</div>}
        </div>
        <div className={`flex-1 min-h-0 overflow-auto px-5 ${footer ? 'pb-4' : 'pb-6'}`}>{children}</div>
        {footer && <div className="shrink-0 border-t border-line px-5 pt-3 pb-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
