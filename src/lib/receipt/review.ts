// Parsed receipt + catalogue → the review the user sees: which lines are ready to
// save, which to check, which need a product chosen, and which are medicines (kept
// private). Plain TS: the app adds what it alone knows (memory, "already added").
import { matchLine } from './match.ts';
import type { MatchIndex, Scored } from './match.ts';
import { medicineSignal } from './medicine.ts';
import type { ReceiptItem } from './parse.ts';

export type RowStatus = 'ready' | 'check' | 'choose' | 'medicine' | 'already';

export interface ReviewRow {
  item: ReceiptItem;
  status: RowStatus;
  /** Product the row saves to: picked, remembered, or the best guess to check. */
  productId: string | null;
  suggestions: Scored[];
  /** Ticked to save. */
  include: boolean;
  /** Why it needs a look. */
  note: 'cut-off' | 'unsure' | 'unclear' | 'numbers' | null;
  /** Matched from the user's earlier choice for this line at this chain. */
  remembered: boolean;
}

export interface ReviewInput {
  items: ReceiptItem[];
  /** Catalogue for the chosen store (null until a store is chosen). */
  index: MatchIndex | null;
  pharmacyStore: boolean;
  /** The items add up to the printed total: every price was read right. */
  addsUp: boolean | null;
  /** Earlier choices at this chain: line key → product id (or 'none' = not a product). */
  memory?: Map<string, string>;
  /** Is this product still in the catalogue? */
  exists?: (id: string) => boolean;
}

/** OCR confidence below this means the line was hard to read. */
export const LOW_CONFIDENCE = 70;
/** A best guess worth showing pre-filled ("Check this"). */
export const CHECK_MIN = 0.6;

/** How a receipt line is remembered: its words, nothing else. */
export const lineKey = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 120);

export function buildReview(input: ReviewInput): ReviewRow[] {
  const exists = input.exists ?? (() => true);
  const rows: ReviewRow[] = [];
  for (const item of input.items) {
    const remembered = input.memory?.get(lineKey(item.name)) ?? null;
    if (remembered === 'none') continue; // the user said it isn't a product
    // A hard-to-read line is checked, unless the total proves every price was read right
    // (a misread name still won't match on its own: every word must match).
    const unclear = item.confidence != null && item.confidence < LOW_CONFIDENCE && input.addsUp !== true;

    const medicine = medicineSignal(item, input.pharmacyStore);
    const asMedicine = () => {
      const id = remembered && exists(remembered) ? remembered : null;
      rows.push({ item, status: 'medicine', productId: id, suggestions: [], include: !unclear, note: unclear ? 'unclear' : null, remembered: !!id });
    };
    if (medicine === 'yes') {
      asMedicine();
      continue;
    }
    if (remembered && exists(remembered)) {
      const sure = item.consistent && !unclear;
      rows.push({
        item,
        status: sure ? 'ready' : 'check',
        productId: remembered,
        suggestions: [],
        include: sure,
        note: sure ? null : unclear ? 'unclear' : 'numbers',
        remembered: true,
      });
      continue;
    }
    const m = input.index ? matchLine(input.index, { name: item.name, unitPrice: item.unitPrice, truncated: item.truncated }) : null;
    // Shared products are never medicines: a sure match wins over a pharmacy word.
    if (medicine === 'maybe' && !m?.auto) {
      asMedicine();
      continue;
    }
    if (!m) {
      rows.push({ item, status: 'choose', productId: null, suggestions: [], include: false, note: null, remembered: false });
      continue;
    }
    if (m.auto && item.consistent && !unclear) {
      rows.push({ item, status: 'ready', productId: m.auto.id, suggestions: m.suggestions, include: true, note: null, remembered: false });
      continue;
    }
    const guess = m.auto ?? m.suggestions.find((s) => s.local && !s.conflict && s.score >= CHECK_MIN) ?? null;
    if (guess) {
      rows.push({
        item,
        status: 'check',
        productId: guess.id,
        suggestions: m.suggestions,
        include: false,
        note: item.truncated ? 'cut-off' : unclear ? 'unclear' : !item.consistent ? 'numbers' : 'unsure',
        remembered: false,
      });
      continue;
    }
    rows.push({ item, status: 'choose', productId: null, suggestions: m.suggestions, include: false, note: item.truncated ? 'cut-off' : null, remembered: false });
  }
  return rows;
}
