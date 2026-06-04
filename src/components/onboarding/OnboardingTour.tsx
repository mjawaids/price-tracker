import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon, Btn } from '../ui';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { ONBOARDING_STEPS } from './steps';

// Guided slide carousel shown on first login (and replayable from Profile).
// Responsive: centered card on tablet/desktop, bottom sheet on mobile.
// Reuses the app's Sheet patterns (portal + backdrop + animate-sl-* keyframes).
export function OnboardingTour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { compact } = useBreakpoint();
  const [step, setStep] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const total = ONBOARDING_STEPS.length;
  const isFirst = step === 0;
  const isLast = step === total - 1;

  // Reset to the first slide each time the tour opens.
  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  // Lock scroll + keyboard navigation while open (mirrors Sheet behaviour).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') setStep((s) => Math.min(s + 1, total - 1));
      else if (e.key === 'ArrowLeft') setStep((s) => Math.max(s - 1, 0));
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, total]);

  if (!open) return null;

  const next = () => (isLast ? onClose() : setStep((s) => Math.min(s + 1, total - 1)));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  // Basic horizontal swipe on touch devices.
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 50) return;
    if (dx < 0) setStep((s) => Math.min(s + 1, total - 1));
    else setStep((s) => Math.max(s - 1, 0));
  };

  const s = ONBOARDING_STEPS[step];

  const closeBtn = (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close walkthrough"
      className="grid place-items-center rounded-full bg-surface shadow-[inset_0_0_0_1px_var(--line)]"
      style={{ width: 34, height: 34 }}
    >
      <Icon name="x" size={17} stroke={2.4} />
    </button>
  );

  const topBar = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5" aria-hidden>
        {ONBOARDING_STEPS.map((_, i) => (
          <span
            key={i}
            className="transition-all"
            style={{
              width: i === step ? 22 : 7,
              height: 7,
              borderRadius: 999,
              background: i === step ? 'var(--accent)' : 'var(--line)',
            }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        {!isLast && (
          <button
            type="button"
            onClick={onClose}
            className="text-[13px] font-semibold text-ink-faint px-2 py-1"
          >
            Skip
          </button>
        )}
        {closeBtn}
      </div>
    </div>
  );

  const body = (
    <div
      className="flex flex-col items-center text-center"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <span
        className="grid place-items-center bg-accent-wash animate-sl-pop"
        style={{ width: 72, height: 72, borderRadius: 22, marginTop: 6 }}
        key={step}
      >
        <Icon name={s.icon} size={32} color="var(--accent-ink)" stroke={2} />
      </span>
      <h2 className="m-0 mt-4 font-display font-extrabold tracking-[-0.02em] text-[23px]">
        {s.title}
      </h2>
      <p className="mt-2 mb-0 text-[15px] leading-relaxed text-ink-soft" style={{ maxWidth: 360 }}>
        {s.body}
      </p>
      <div
        className="flex items-start gap-2 mt-4 text-left bg-accent-wash"
        style={{ borderRadius: 14, padding: '10px 13px', maxWidth: 360 }}
      >
        <span className="leading-none" style={{ fontSize: 15 }} aria-hidden>
          💡
        </span>
        <span className="text-[13px] leading-snug text-accent-ink font-medium">{s.tip}</span>
      </div>
    </div>
  );

  const footer = (
    <div className="flex items-center gap-3 mt-6">
      {!isFirst && (
        <Btn variant="ghost" onClick={back} icon="back">
          Back
        </Btn>
      )}
      <Btn full onClick={next} icon={isLast ? 'check' : 'arrowR'}>
        {isLast ? 'Get started' : 'Next'}
      </Btn>
    </div>
  );

  const content = (
    <div role="dialog" aria-modal="true" aria-label="Welcome tour" className="flex flex-col">
      {topBar}
      <div className="flex-1">{body}</div>
      {footer}
    </div>
  );

  if (!compact) {
    return createPortal(
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-7 animate-sl-fade"
        style={{ background: 'rgba(20,17,12,0.4)' }}
      >
        <div
          className="bg-paper w-full flex flex-col overflow-hidden animate-sl-pop"
          style={{
            maxWidth: 440,
            borderRadius: 22,
            boxShadow: '0 24px 70px rgba(0,0,0,0.32)',
            padding: '20px 22px 22px',
          }}
        >
          {content}
        </div>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end animate-sl-fade"
      style={{ background: 'rgba(20,17,12,0.34)' }}
    >
      <div
        className="bg-paper w-full flex flex-col overflow-hidden animate-sl-up safe-bottom"
        style={{ borderRadius: '26px 26px 0 0', boxShadow: '0 -10px 40px rgba(0,0,0,0.18)', padding: '12px 20px 22px' }}
      >
        <div className="pb-3 flex justify-center">
          <div style={{ width: 40, height: 5, borderRadius: 3, background: 'var(--line)' }} />
        </div>
        {content}
      </div>
    </div>,
    document.body,
  );
}
