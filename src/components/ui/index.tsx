import { Store } from '../../types';
import { storeHue } from '../../lib/categories';

export { Icon, GoogleIcon } from './Icon';
export type { IconName } from './Icon';
export { Thumb, Chip, Btn, Stepper, EmptyState, Toggle, ToggleTrack } from './primitives';
export { Sheet } from './Sheet';
export { Toast, SegmentedControl, CoachMark, TipRow } from './feedback';

/** Store kind dot: rounded-square for online, circle for physical. */
export function StoreDot({ store, size = 11 }: { store: Store; size?: number }) {
  return (
    <span
      className="shrink-0"
      style={{
        width: size,
        height: size,
        borderRadius: store.type === 'online' ? Math.round(size * 0.28) : 999,
        background: `oklch(0.6 0.16 ${storeHue(store)})`,
      }}
    />
  );
}
