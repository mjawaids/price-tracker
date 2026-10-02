import { useEffect } from 'react';
import { useOnboarding } from '../contexts/OnboardingContext';
import { HINTS, HintId } from '../lib/hints';

/**
 * Asks to show tip `id` while `when` is true. Only one tip shows at a time and
 * each only until the user dismisses it (or does what it describes).
 */
export function useHint(id: HintId, when: boolean) {
  const { activeHint, hintClock, requestHint, releaseHint, markHintSeen, setTipsOn } = useOnboarding();

  useEffect(() => {
    if (when) requestHint(id);
    else releaseHint(id);
  }, [id, when, activeHint, hintClock, requestHint, releaseHint]);

  return {
    show: when && activeHint === id,
    text: HINTS[id],
    dismiss: () => markHintSeen(id),
    hideAll: () => setTipsOn(false),
  };
}
