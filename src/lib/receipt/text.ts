// Receipt text → clean lines, and the money/number reading every other step uses.
// Plain TS with no app imports so scripts can use it too.

/** Longest receipt we read (characters / lines): a pasted page, not a book. */
export const MAX_CHARS = 20_000;
export const MAX_LINES = 400;

export interface TextLine {
  text: string;
  /** OCR confidence 0–100 (absent for pasted text). */
  confidence?: number;
}

/** Normalise raw text (pasted or from OCR) into trimmed, non-empty lines. */
export function toLines(raw: string | TextLine[]): TextLine[] {
  const input: TextLine[] = typeof raw === 'string'
    ? raw.slice(0, MAX_CHARS).split(/\r?\n/).map((text) => ({ text }))
    : raw;
  const out: TextLine[] = [];
  for (const l of input) {
    const text = cleanLine(l.text);
    if (text) out.push({ ...l, text });
    if (out.length >= MAX_LINES) break;
  }
  return out;
}

export function cleanLine(s: string): string {
  return s
    .normalize('NFKC')
    // eslint-disable-next-line no-control-regex -- strip control and zero-width characters
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F\u200B-\u200F\uFEFF]/g, '')
    .replace(/[\u00A0\t]/g, ' ')
    .replace(/[\u2018\u2019`\u00B4]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\.{3,}|\u2026/g, '\u2026')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Numbers ──────────────────────────────────────────────────────────────────

/** A currency mark in front of (or glued to) an amount. */
const CURRENCY = /^(?:rs\.?|rs,|pkr|₨)$/i;

/** Units and words that make a number part of a name, not a price. */
const UNIT_AFTER =
  /^(?:kgs?|kilo|grams?|grm|gms?|gr|g|mg|mcg|mls?|ltrs?|litres?|liters?|lt|l|cl|oz|pcs?|pieces?|packs?|pk|sachets?|bags?|rolls?|sheets?|tabs?|tablets?|caps?|capsules?|chews?|ply|count|ct|units?|eggs?|dozen|s|'s|x|%|iu|b|mm|cm|inch|in|m|w|v|mah|gb)$/i;

export interface Token {
  text: string;
  /** Parsed amount when the token reads as money. */
  amount: number | null;
  /** Had a currency mark (Rs., PKR). */
  marked: boolean;
}

/**
 * Read one token as money: "1,854.00", "Rs.350", "350/-", "(25.00)", "-300", "01.00".
 * Not money: codes (≥ 7 digits without separators), phone-like "021-…", times "21:39",
 * dates, numbers glued to letters ("200Gm", "PH01452"), leading-zero integers ("0300").
 */
export function readAmount(token: string): number | null {
  let t = token.trim();
  if (!t) return null;
  let negative = false;
  if (/^\(.*\)$/.test(t)) {
    negative = true;
    t = t.slice(1, -1);
  }
  t = t.replace(/^(?:rs\.?|rs,|pkr|₨)\s*/i, '').replace(/\/-$/, '').replace(/[.,:;]$/, '');
  if (t.startsWith('-')) {
    negative = true;
    t = t.slice(1);
  }
  if (!t) return null;
  // OCR misreads inside a number: "14O.00", "1,8S4.00" stay out; only O→0 and l/I→1 between digits
  if (/\d/.test(t) && /^[\d,.oOlI]+$/.test(t) && /\d[oOlI]|[oOlI]\d/.test(t)) t = t.replace(/[oO]/g, '0').replace(/[lI]/g, '1');
  // 1,854.00 · 1854.00 · 1854 · 2,287.3 · 01.00
  if (!/^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,3})?$/.test(t)) return null;
  const digits = t.replace(/[,.]/g, '');
  if (!t.includes(',') && !t.includes('.') && t.length >= 7) return null; // a code, not money
  if (/^0\d/.test(t) && !t.includes('.')) return null; // "0300": a code or phone part
  if (digits.length > 9) return null;
  const n = Number(t.replace(/,/g, ''));
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

/** Split a line into tokens, joining a currency mark with the amount after it. */
export function tokenize(line: string): Token[] {
  const parts = line.split(' ').filter(Boolean);
  const out: Token[] = [];
  for (let i = 0; i < parts.length; i++) {
    let p = parts[i];
    let marked = false;
    // "- Rs. 300.00": a minus before the mark
    if (p === '-' && parts[i + 1] && CURRENCY.test(parts[i + 1]) && parts[i + 2]) {
      marked = true;
      p = `-${parts[i + 2]}`;
      i += 2;
    } else if (CURRENCY.test(p) && parts[i + 1] && readAmount(parts[i + 1]) != null) {
      marked = true;
      p = parts[i + 1];
      i++;
    } else if (/^(?:rs\.?|pkr)\d/i.test(p)) {
      marked = true;
    }
    const amount = readAmount(p);
    out.push({ text: p, amount, marked: marked && amount != null });
  }
  // A number followed by a unit word is part of the name ("66 Pcs", "120 ML").
  for (let i = 0; i < out.length - 1; i++) {
    if (out[i].amount != null && !out[i].marked && UNIT_AFTER.test(out[i + 1].text)) out[i].amount = null;
  }
  return out;
}

/**
 * The amounts at the end of a line: the run of numbers after the last word.
 * When the line marks amounts with a currency ("Rs. 140.00"), only marked
 * amounts and those after the first mark count, so "Junior 66 Rs. 4,009.00"
 * keeps 66 in the name — unless the arithmetic shows it's the quantity column of
 * an invoice table ("Milk 1 Ltr 2 Rs. 280.00 Rs. 560.00": 2 × 280 = 560).
 */
export function trailingAmounts(tokens: Token[]): { amounts: number[]; start: number } {
  let start = tokens.length;
  while (start > 0 && tokens[start - 1].amount != null) start--;
  if (tokens.some((t) => t.marked)) {
    const firstMarked = tokens.findIndex((t, i) => i >= start && t.marked);
    start = firstMarked >= 0 ? firstMarked : tokens.length;
    const qty = tokens[start - 1]?.marked === false ? tokens[start - 1].amount : null;
    const marked = tokens.slice(start).map((t) => t.amount as number);
    if (qty != null && Number.isInteger(qty) && qty >= 1 && qty <= 99 && marked.length >= 2 && near(qty * marked[0], marked[marked.length - 1], 0.001, 0.01)) start--;
  }
  return { amounts: tokens.slice(start).map((t) => t.amount as number), start };
}

/** Every amount on a line, in order (for summary lines like "Total Item(s): 6 … Discount 59.09"). */
export const allAmounts = (tokens: Token[]) => tokens.filter((t) => t.amount != null).map((t) => t.amount as number);

/** Letters in a string (to tell words from numbers and codes). */
export const hasLetters = (s: string) => /[a-z]/i.test(s);

/** Round money to 2 decimals. */
export const money = (n: number) => Math.round(n * 100) / 100;

/** Close enough for money that was rounded on the way: within 1 or 0.5 %. */
export function near(a: number, b: number, rel = 0.005, abs = 1): boolean {
  return Math.abs(a - b) <= Math.max(abs, rel * Math.max(Math.abs(a), Math.abs(b)));
}
