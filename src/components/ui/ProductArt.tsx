import { ART } from '../../lib/productArt';

/**
 * A line drawing from `src/lib/productArt.ts` (pick one with `artForProduct` /
 * `artForItem`). Decorative: the name always sits next to it. Takes the text colour.
 */
export function ProductArt({ id, size, stroke = 1.75 }: { id: string; size: number | string; stroke?: number }) {
  const paths = ART[id] ?? ART.basket;
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="block shrink-0"
    >
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
