import { storeHue } from '../../lib/categories';

export { Icon, GoogleIcon } from './Icon';
export type { IconName } from './Icon';
export { Thumb, Chip, Btn, Stepper, EmptyState, Toggle, ToggleTrack } from './primitives';
export { Sheet } from './Sheet';
export { ConfirmSheet } from './ConfirmSheet';
export { AgeChip } from './AgeChip';
export { Toast, SegmentedControl, CoachMark, TipRow } from './feedback';

/** Store kind dot: rounded-square for online, circle for physical. */
export function StoreDot({ store, size = 11 }: { store: { id: string; kind?: string; type?: string }; size?: number }) {
  const online = (store.kind ?? store.type) === 'online';
  return (
    <span
      aria-hidden
      className="shrink-0"
      style={{
        width: size,
        height: size,
        borderRadius: online ? Math.round(size * 0.28) : 999,
        background: `oklch(0.6 0.16 ${storeHue(store)})`,
      }}
    />
  );
}
