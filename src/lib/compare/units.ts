// Sizes, unit prices and "how many packs do I need" — the maths that makes a
// 280 g loaf comparable to an 800 g one.
import { parseSize } from './productName.ts';
import type { ParsedSize, SizeUnit } from './productName.ts';
import type { PriceDisplay } from './itemTypes.ts';
import type { CatalogProduct } from './types.ts';

/** Structured size if the product has one, else read from its name. */
export function productSize(p: Pick<CatalogProduct, 'name' | 'sizeValue' | 'sizeUnit' | 'packCount'>): ParsedSize | null {
  if (p.sizeValue && p.sizeUnit) return { value: p.sizeValue, unit: p.sizeUnit, pack: p.packCount || 1 };
  return parseSize(p.name);
}

/** Total amount in a pack (12 × 250 ml → 3000 ml). */
export const totalAmount = (s: ParsedSize) => s.value * s.pack;

const trim = (n: number) => (Math.round(n * 100) / 100).toString();

/** "1 L", "12 × 250 ml", "6 pcs", "800 g", "1.5 kg". */
export function sizeLabel(s: ParsedSize | null): string {
  if (!s) return '';
  const one = (value: number, unit: SizeUnit) => {
    if (unit === 'pc') return `${trim(value)} ${value === 1 ? 'pc' : 'pcs'}`;
    if (value >= 1000) return `${trim(value / 1000)} ${unit === 'g' ? 'kg' : 'L'}`;
    return `${trim(value)} ${unit}`;
  };
  if (s.unit === 'pc') return one(s.value * s.pack, 'pc');
  return s.pack > 1 ? `${s.pack} × ${one(s.value, s.unit)}` : one(s.value, s.unit);
}

const DISPLAY: Record<PriceDisplay, { per: number; unit: SizeUnit; label: string }> = {
  '100g': { per: 100, unit: 'g', label: '100 g' },
  kg: { per: 1000, unit: 'g', label: 'kg' },
  '100ml': { per: 100, unit: 'ml', label: '100 ml' },
  L: { per: 1000, unit: 'ml', label: 'L' },
  pc: { per: 1, unit: 'pc', label: 'pc' },
  dozen: { per: 12, unit: 'pc', label: 'dozen' },
};

/** Default display for a size when the item type doesn't say. */
const fallbackDisplay = (unit: SizeUnit): PriceDisplay => (unit === 'g' ? '100g' : unit === 'ml' ? '100ml' : 'pc');

/**
 * Price per display unit ("Rs 31 per 100 g"), or null when the size is unknown
 * or doesn't fit the display (a per-kg display for a product sold by the piece).
 */
export function unitPrice(
  price: number,
  size: ParsedSize | null,
  display?: PriceDisplay,
): { value: number; label: string } | null {
  if (!size || price <= 0) return null;
  const d = DISPLAY[display && DISPLAY[display].unit === size.unit ? display : fallbackDisplay(size.unit)];
  const total = totalAmount(size);
  if (!total) return null;
  return { value: (price / total) * d.per, label: d.label };
}

/** Same kind of size, totals within `tolerance` of each other. */
export function similarSize(a: ParsedSize | null, b: ParsedSize | null, tolerance = 0.15): boolean {
  if (!a || !b || a.unit !== b.unit) return false;
  const x = totalAmount(a);
  const y = totalAmount(b);
  return Math.abs(x - y) <= tolerance * Math.max(x, y);
}

const WANT: Record<string, { unit: SizeUnit; mult: number }> = {
  kg: { unit: 'g', mult: 1000 },
  g: { unit: 'g', mult: 1 },
  L: { unit: 'ml', mult: 1000 },
  ml: { unit: 'ml', mult: 1 },
  dozen: { unit: 'pc', mult: 12 },
};

/**
 * Packs needed for a list quantity: "atta 10 kg" with 5 kg bags → 2, "2 milk" → 2,
 * "eggs 1 dozen" with 6-egg packs → 2. A pack within 15% of the amount counts as enough.
 */
export function packsNeeded(want: { quantity: number | null; unit: string | null }, size: ParsedSize | null): number {
  const q = want.quantity && want.quantity > 0 ? want.quantity : 1;
  const w = want.unit ? WANT[want.unit] : undefined;
  if (!w || !size || size.unit !== w.unit) return Math.max(1, Math.round(q));
  const total = totalAmount(size);
  if (!total) return Math.max(1, Math.round(q));
  return Math.max(1, Math.ceil((q * w.mult) / total - 0.15));
}
