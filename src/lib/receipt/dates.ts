// The purchase date on a receipt: "18-Jan-2026", "Sep 15, 2026", "31 August, 2026 at
// 2:41 PM", "Delivered on 04 Oct", "2026-09-16", "17-04-2026", "9/1/2026".
// Numeric dates where both parts could be the month ("06/02/2026") are read day-first
// unless the receipt says otherwise (an FBR/receipt number holding the date), and are
// flagged so the review asks.

/** Prices older than this can't be added (the database refuses them too). */
export const MAX_AGE_DAYS = 90;
/** Older than this counts less; the review says so. */
export const OLDISH_DAYS = 30;

export interface ReceiptDate {
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  /** Day/month order was a guess; the other reading is in `alternative`. */
  ambiguous: boolean;
  alternative: string | null;
  /** Whole days before `now`. */
  ageDays: number;
  /** Index of the line it came from. */
  line: number;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};
const MON = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';

// Lines whose dates aren't the purchase date (expiry, batch, manufacture, delivery slot).
const NOT_PURCHASE = /\b(?:exp(?:iry)?|expires?|mfg|mfd|manufactur|batch|valid|best before|use by|delivery time|delivery slot)\b/i;
const LABELLED = /\b(?:date|dated|delivered on|placed on|ordered on|order date|invoice date|bill date)\b/i;

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

function valid(y: number, m: number, d: number): boolean {
  if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

const fullYear = (y: number) => (y < 100 ? 2000 + y : y);

interface Found {
  y: number;
  m: number;
  d: number;
  /** Other reading for d/m vs m/d. */
  alt?: { y: number; m: number; d: number };
  /** Year missing ("04 Oct"). */
  noYear?: boolean;
}

function findIn(line: string): Found[] {
  const s = line.toLowerCase();
  const out: Found[] = [];
  let m: RegExpExecArray | null;

  // 2026-09-16
  const isoRe = /\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/g;
  while ((m = isoRe.exec(s))) out.push({ y: +m[1], m: +m[2], d: +m[3] });

  // 18-Jan-2026, 18-APR-26, 31 August, 2026, 18 Jan 26
  // (a year must not be the hour of a time: "04 Oct 21:39")
  const dmy = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?[\\s\\-/.,]*${MON}\\b(?:[\\s\\-/.,']*(\\d{4}|\\d{2})(?![\\d:]))?`, 'g');
  while ((m = dmy.exec(s))) {
    const mo = MONTHS[m[2].slice(0, 3)] ?? MONTHS[m[2].slice(0, 4)];
    if (m[3]) out.push({ y: fullYear(+m[3]), m: mo, d: +m[1] });
    else out.push({ y: 0, m: mo, d: +m[1], noYear: true });
  }

  // Sep 15, 2026 · August 11, 2026
  const mdy = new RegExp(`\\b${MON}\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})\\b`, 'g');
  while ((m = mdy.exec(s))) out.push({ y: +m[3], m: MONTHS[m[1].slice(0, 3)], d: +m[2] });

  // 17-04-2026, 06/02/2026, 9/1/2026, 18.01.26
  // (no lookbehind: older iOS Safari can't parse it)
  const num = /(?:^|[^\d-])(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2}|\d{2})(?![\d-])/g;
  while ((m = num.exec(s))) {
    const a = +m[1];
    const b = +m[2];
    const y = fullYear(+m[3]);
    if (a > 12 || b > 12 || a === b) out.push(a > 12 || a === b ? { y, m: b, d: a } : { y, m: a, d: b });
    else out.push({ y, m: b, d: a, alt: { y, m: a, d: b } });
  }
  return out;
}

/** A receipt/FBR number that holds the date (yymmdd or ddmmyy) settles day vs month. */
function supportedBy(text: string, y: number, m: number, d: number): boolean {
  const yy = pad(y % 100);
  const runs = text.match(/\d{6,}/g) ?? [];
  const keys = [`${yy}${pad(m)}${pad(d)}`, `${pad(d)}${pad(m)}${yy}`, `${y}${pad(m)}${pad(d)}`];
  return runs.some((r) => keys.some((k) => r.includes(k)));
}

const dayMs = 86_400_000;
const localDay = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
const ageOf = (y: number, m: number, d: number, now: Date) => Math.round((localDay(now) - Date.UTC(y, m - 1, d)) / dayMs);

/** The purchase date, or null when none is found. */
export function findDate(lines: string[], now: Date = new Date()): ReceiptDate | null {
  const all = lines.join('\n');
  type Cand = { f: Found; line: number; score: number };
  const cands: Cand[] = [];
  lines.forEach((text, i) => {
    if (NOT_PURCHASE.test(text)) return;
    // Expiry/batch rows in an item table ("30-OCT-27 44938"): a date with only a code after it
    if (/^\d{1,2}-[a-z]{3}-\d{2,4}\s*(?:\||$|[a-z0-9.]+$)/i.test(text) && !LABELLED.test(text)) return;
    for (const f of findIn(text)) {
      cands.push({ f, line: i, score: (LABELLED.test(text) ? 100 : 0) - i });
    }
  });
  cands.sort((a, b) => b.score - a.score);

  for (const c of cands) {
    const f = c.f;
    if (f.noYear) {
      // "04 Oct": this year, or last year if that would be in the future
      let y = now.getFullYear();
      if (!valid(y, f.m, f.d)) continue;
      if (ageOf(y, f.m, f.d, now) < -1) y -= 1;
      if (!valid(y, f.m, f.d)) continue;
      return { date: iso(y, f.m, f.d), ambiguous: false, alternative: null, ageDays: ageOf(y, f.m, f.d, now), line: c.line };
    }
    const readings = [f, ...(f.alt ? [f.alt] : [])].filter((r) => valid(r.y, r.m, r.d) && ageOf(r.y, r.m, r.d, now) >= -1);
    if (!readings.length) continue;
    if (readings.length === 1) {
      const r = readings[0];
      return { date: iso(r.y, r.m, r.d), ambiguous: false, alternative: null, ageDays: ageOf(r.y, r.m, r.d, now), line: c.line };
    }
    const backed = readings.filter((r) => supportedBy(all, r.y, r.m, r.d));
    const pick = backed.length === 1 ? backed[0] : readings[0];
    const other = readings.find((r) => r !== pick)!;
    return {
      date: iso(pick.y, pick.m, pick.d),
      ambiguous: backed.length !== 1,
      alternative: backed.length === 1 ? null : iso(other.y, other.m, other.d),
      ageDays: ageOf(pick.y, pick.m, pick.d, now),
      line: c.line,
    };
  }
  return null;
}

/** Age of a YYYY-MM-DD date in whole days before `now`. */
export function ageInDays(date: string, now: Date = new Date()): number {
  const [y, m, d] = date.split('-').map(Number);
  return ageOf(y, m, d, now);
}
