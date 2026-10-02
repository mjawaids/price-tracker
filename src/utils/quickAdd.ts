// Parses quick-add text like "2 milk", "milk x2", "atta 10 kg" or "1kg sugar"
// into a name with an optional quantity and unit.

export interface ParsedItem {
  name: string;
  quantity: number | null;
  unit: string | null;
}

const UNITS: Record<string, string | null> = {
  kg: 'kg', kgs: 'kg', kilo: 'kg', kilos: 'kg',
  g: 'g', gm: 'g', gms: 'g', gram: 'g', grams: 'g',
  l: 'L', ltr: 'L', litre: 'L', litres: 'L', liter: 'L', liters: 'L',
  ml: 'ml',
  dozen: 'dozen', dz: 'dozen',
  pack: 'pack', packs: 'pack', packet: 'pack', packets: 'pack',
  bottle: 'bottle', bottles: 'bottle',
  can: 'can', cans: 'can',
  box: 'box', boxes: 'box',
  bunch: 'bunch', bunches: 'bunch',
  pc: null, pcs: null, piece: null, pieces: null,
};

/** Units offered in the item sheet ('' = plain count). */
export const UNIT_CHOICES = ['', 'kg', 'g', 'L', 'ml', 'dozen', 'pack'];

const UNIT_RE = `(${Object.keys(UNITS).sort((a, b) => b.length - a.length).join('|')})`;
const NUM = '(\\d+(?:\\.\\d+)?)';
const LEADING = new RegExp(`^${NUM}\\s*(?:${UNIT_RE}\\b)?\\s*(?:x\\s+)?(.+)$`, 'i');
const TIMES = /^(.+?)(?:\s+x|\s*[×*])\s*(\d+(?:\.\d+)?)$/i;
const TRAILING = new RegExp(`^(.+?)\\s+${NUM}\\s*(?:${UNIT_RE})?$`, 'i');

const MAX_NAME = 120;

export const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const unitOf = (raw: string | undefined) => (raw ? UNITS[raw.toLowerCase()] ?? null : null);

export function parseQuickAdd(text: string): ParsedItem | null {
  const t = text.trim().replace(/\s+/g, ' ');
  if (!t) return null;

  let name = t;
  let quantity: number | null = null;
  let unit: string | null = null;

  // "2 milk", "1kg sugar", "2 x bread" — but not "7up" (a number glued to a name).
  const lead = t.match(LEADING);
  const times = t.match(TIMES);
  const trail = t.match(TRAILING);
  if (lead && (lead[2] || /^\d+(?:\.\d+)?\s/.test(t))) {
    quantity = Number(lead[1]);
    unit = unitOf(lead[2]);
    name = lead[3];
  } else if (times) {
    name = times[1];
    quantity = Number(times[2]);
  } else if (trail) {
    name = trail[1];
    quantity = Number(trail[2]);
    unit = unitOf(trail[3]);
  }

  name = capitalize(name.trim()).slice(0, MAX_NAME);
  if (!name) return null;
  if (!quantity || quantity <= 0 || !Number.isFinite(quantity)) quantity = null;
  if (quantity === 1 && !unit) quantity = null;
  return { name, quantity, unit };
}

/** "×2", "10 kg", "1 dozen" or '' when there is nothing worth showing. */
export function formatQty(quantity: number | null, unit: string | null): string {
  if (unit) return `${quantity ?? 1} ${unit}`;
  if (quantity && quantity !== 1) return `×${quantity}`;
  return '';
}
