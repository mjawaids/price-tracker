// OCR lines → receipt lines. The reader often splits one printed row into two
// "lines" (the name on the left, the price on the right in its own block); rows that
// sit at the same height and don't overlap sideways are put back together. Plain TS.
import type { TextLine } from './text.ts';

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface OcrWord {
  text: string;
  /** 0–100 */
  confidence: number;
  bbox: Box;
}

export interface OcrLine {
  words: OcrWord[];
  bbox: Box;
}

interface Row {
  y0: number;
  y1: number;
  spans: [number, number][];
  words: OcrWord[];
}

const overlapY = (a: { y0: number; y1: number }, b: { y0: number; y1: number }) =>
  Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));

export function linesFromOcr(lines: OcrLine[]): TextLine[] {
  const usable = lines
    .map((l) => ({ ...l, words: l.words.filter((w) => w.text.trim()) }))
    .filter((l) => l.words.length && l.bbox.y1 > l.bbox.y0)
    .sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0);

  const rows: Row[] = [];
  for (const l of usable) {
    const h = l.bbox.y1 - l.bbox.y0;
    const row = rows.find((r) => {
      const rh = r.y1 - r.y0;
      const sideBySide = r.spans.every(([x0, x1]) => l.bbox.x1 <= x0 + 2 || l.bbox.x0 >= x1 - 2);
      return sideBySide && overlapY(r, l.bbox) >= 0.5 * Math.min(h, rh);
    });
    if (row) {
      row.words.push(...l.words);
      row.spans.push([l.bbox.x0, l.bbox.x1]);
      row.y0 = Math.min(row.y0, l.bbox.y0);
      row.y1 = Math.max(row.y1, l.bbox.y1);
    } else {
      rows.push({ y0: l.bbox.y0, y1: l.bbox.y1, spans: [[l.bbox.x0, l.bbox.x1]], words: [...l.words] });
    }
  }

  return rows
    .sort((a, b) => a.y0 - b.y0)
    .map((r) => {
      const words = [...r.words].sort((a, b) => a.bbox.x0 - b.bbox.x0);
      // Prices matter most: a row is as sure as its least sure number.
      const numeric = words.filter((w) => /\d/.test(w.text));
      const pool = numeric.length ? numeric : words;
      const confidence = numeric.length
        ? Math.min(...pool.map((w) => w.confidence))
        : pool.reduce((a, w) => a + w.confidence, 0) / pool.length;
      return { text: words.map((w) => w.text).join(' '), confidence: Math.round(confidence) };
    });
}

/** A piece of a PDF's own text, placed on the page (top-left origin, y grows down). */
export interface PdfRun extends Box {
  text: string;
}

/**
 * A PDF's text layer → receipt lines. PDFs cut text into pieces (sometimes inside a
 * word): pieces at the same height form a row, read left to right, joined without a
 * space when they touch. The text is exact, so the lines carry no confidence (like
 * pasted text).
 */
export function linesFromPdf(runs: PdfRun[]): TextLine[] {
  const rows: { y0: number; y1: number; runs: PdfRun[] }[] = [];
  const usable = runs.filter((r) => r.text.trim() && r.y1 > r.y0 && r.x1 >= r.x0).sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);
  for (const r of usable) {
    const h = r.y1 - r.y0;
    const row = rows.find((w) => overlapY(w, r) >= 0.5 * Math.min(h, w.y1 - w.y0));
    if (!row) {
      rows.push({ y0: r.y0, y1: r.y1, runs: [r] });
      continue;
    }
    // Fake bold: the same text drawn twice a hair apart.
    if (row.runs.some((o) => o.text === r.text && Math.abs(o.x0 - r.x0) < 0.3 * h)) continue;
    row.runs.push(r);
    row.y0 = Math.min(row.y0, r.y0);
    row.y1 = Math.max(row.y1, r.y1);
  }
  return rows
    .sort((a, b) => a.y0 - b.y0)
    .map((row) => {
      const sorted = [...row.runs].sort((a, b) => a.x0 - b.x0);
      let text = '';
      let prev: PdfRun | null = null;
      for (const r of sorted) {
        const gap = prev ? r.x0 - prev.x1 : 0;
        const touching = prev && gap < 0.15 * Math.min(r.y1 - r.y0, prev.y1 - prev.y0);
        text += prev && !touching && !/\s$/.test(text) && !/^\s/.test(r.text) ? ` ${r.text}` : r.text;
        prev = r;
      }
      return { text: text.replace(/\s+/g, ' ').trim() };
    })
    .filter((l) => l.text);
}
