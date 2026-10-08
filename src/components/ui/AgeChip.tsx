import { ageChip, AgeTone } from '../../lib/compare/describe';

const TONES: Record<AgeTone, string> = {
  fresh: 'bg-ok-wash text-ok-ink',
  recent: 'bg-[var(--backdrop)] text-ink-soft',
  old: 'bg-warn-wash text-warn-ink',
};

/** How old a price is ("Today", "2 wks", "Old · Aug"); the words carry it, the tone backs it up. */
export function AgeChip({ observedAt, className = '' }: { observedAt: string | null | undefined; className?: string }) {
  const a = ageChip(observedAt);
  return (
    <span
      className={`inline-flex items-center shrink-0 rounded-full font-mono text-[10.5px] font-bold leading-none whitespace-nowrap ${TONES[a.tone]} ${className}`}
      style={{ height: 19, padding: '0 7px' }}
    >
      <span className="sr-only">Price seen: </span>
      {a.label}
    </span>
  );
}
