// Swipe from the left edge to go back — for the installed app on iPhone and iPad, which
// has no back button of its own. (Android's back button and gesture, and the
// browser's back, already reach src/lib/backStack.ts through history.)
// A bubble with a back arrow follows the finger; let go past the mark and back runs.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { canGoBackInApp, goBack, subscribeBackStack } from '../../lib/backStack';
import { useInstall } from '../../lib/install';
import { Icon } from '../ui';

const EDGE = 24; // px from the left where a swipe can start
const TRIGGER = 72; // px to pull before letting go goes back
const MAX = 120;

export function EdgeBack() {
  const { standalone, platform } = useInstall();
  const enabled = standalone && platform === 'ios';
  const canBack = useSyncExternalStore(subscribeBackStack, canGoBackInApp, () => false);
  const [pull, setPull] = useState<{ x: number; y: number } | null>(null);
  const start = useRef<{ x: number; y: number; id: number; live: boolean; dx: number } | null>(null);

  useEffect(() => {
    if (!enabled || !canBack) return;
    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (e.touches.length !== 1 || t.clientX > EDGE) return;
      start.current = { x: t.clientX, y: t.clientY, id: t.identifier, live: false, dx: 0 };
    };
    const onMove = (e: TouchEvent) => {
      const s = start.current;
      const t = s && Array.from(e.touches).find((x) => x.identifier === s.id);
      if (!s || !t) return;
      const dx = t.clientX - s.x;
      const dy = t.clientY - s.y;
      // Decide once: mostly sideways is a back swipe, anything else is a scroll.
      if (!s.live) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
        if (dx <= Math.abs(dy)) {
          start.current = null;
          return;
        }
        s.live = true;
      }
      s.dx = Math.max(0, Math.min(MAX, dx));
      setPull({ x: s.dx, y: t.clientY });
    };
    const onEnd = () => {
      const s = start.current;
      start.current = null;
      setPull(null);
      if (s?.live && s.dx >= TRIGGER) goBack();
    };
    const onCancel = () => {
      start.current = null;
      setPull(null);
    };
    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: true });
    document.addEventListener('touchend', onEnd, { passive: true });
    document.addEventListener('touchcancel', onCancel, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
      document.removeEventListener('touchcancel', onCancel);
    };
  }, [enabled, canBack]);

  if (!pull) return null;
  const ready = pull.x >= TRIGGER;
  return (
    <div
      aria-hidden
      className="fixed z-[200] grid place-items-center rounded-full pointer-events-none"
      style={{
        width: 48,
        height: 48,
        left: -48 + Math.min(pull.x, TRIGGER) * (58 / TRIGGER),
        top: pull.y - 24,
        background: ready ? 'var(--accent)' : 'var(--surface)',
        boxShadow: ready ? '0 6px 18px var(--accent-glow)' : 'var(--shadow-card), inset 0 0 0 1px var(--line)',
      }}
    >
      <Icon name="chevL" size={22} stroke={2.8} color={ready ? 'var(--on-accent)' : 'var(--ink)'} />
    </div>
  );
}
