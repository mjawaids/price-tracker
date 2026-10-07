// Reading a receipt into the session: pictures through the on-device reader, a PDF
// (its own text, or its scanned pages through the reader), or pasted text, then
// parsing and guessing the shop. Runs outside React so it carries on when the user
// leaves the screen. Imported only by the (lazy) receipt screen and, when something
// is shared to SpendLess, by the share sheet. App-only.
import { trackUserAction } from '../../utils/analytics';
import { ImageError } from './image.ts';
import { ReadCancelled, readImages, readerDownloaded } from './ocr.ts';
import type { PageSource, ReadProgress } from './ocr.ts';
import { parseReceipt } from './parse.ts';
import { isPdfFile, openPdf, PdfError } from './pdf.ts';
import type { OpenedPdf, PdfProblem } from './pdf.ts';
import { getReceipt, nextRun, onCancel, setReceipt } from './session.ts';
import type { ReadFailure, ReceiptSource } from './session.ts';
import { guessStore } from './stores.ts';
import { MAX_CHARS } from './text.ts';
import type { TextLine } from './text.ts';

/** Most pictures read in one go. */
export const MAX_IMAGES = 6;

const track = (action: string, details: Record<string, unknown>) => {
  if (typeof window !== 'undefined' && typeof window.gtag !== 'undefined') trackUserAction(action, details);
};

// The last pictures asked for, so "Try again" doesn't need them picked again.
let lastFiles: { files: File[]; source: ReceiptSource; adding: boolean } | null = null;
let current: AbortController | null = null;

const fail = (reason: ReadFailure, source: ReceiptSource, adding: boolean, problem?: PdfProblem) => {
  track('receipt_failed', { reason, source, adding, ...(problem ? { problem } : {}) });
  // A picture added to a receipt that failed leaves the review as it was.
  if (adding) setReceipt({ step: { name: 'review' }, addFailed: true });
  else setReceipt({ step: { name: 'failed', reason, problem }, source });
};

/** Lines → the review (or "nothing found"). Adding keeps the shop, date and edits. */
function finish(lines: TextLine[], source: ReceiptSource, adding: boolean, skipped = 0, separate = 0) {
  const parsed = parseReceipt(lines);
  const cur = getReceipt();
  // Nothing found — or nothing new in an added picture.
  if (!parsed.items.length || (adding && parsed.items.length <= (cur.parsed?.items.length ?? 0))) return fail('nothing', source, adding);
  const guess = guessStore(
    parsed.header,
    lines.map((l) => l.text),
    parsed.items.map((i) => i.name),
  );
  track('receipt_read', { source, items: parsed.items.length, adds_up: parsed.addsUp, adding });
  setReceipt({
    step: { name: 'review' },
    source: adding ? cur.source : source,
    lines,
    parsed,
    guess: adding && cur.guess ? cur.guess : guess,
    skipped: (adding ? cur.skipped : 0) + skipped,
    separate: adding ? cur.separate : separate,
    ...(adding ? {} : { storeId: null, storeLooked: false, date: null, edits: {} }),
  });
}

export interface ReadOptions {
  /** Add to the receipt being reviewed (more screenshots of the same order). */
  adding?: boolean;
  /** The user agreed to download the reader (or it's a retry): don't ask. */
  consented?: boolean;
}

/**
 * Read a receipt from files: pictures (several screenshots of one order are read as
 * one) and PDFs, in order, as one receipt — up to MAX_IMAGES pages and pictures; the
 * review says how many more weren't read. Asks for the reader download first when
 * it's needed and not on this device yet.
 */
export async function readFiles(files: File[], source: ReceiptSource, opts: ReadOptions = {}): Promise<void> {
  const { adding = false } = opts;
  if (!files.length) return;
  if (!adding) {
    const pdf = await Promise.all(files.map((f) => isPdfFile(f)));
    if (pdf.some(Boolean)) return readWithPdfs(files, pdf, opts);
  }
  const picked = files.slice(0, MAX_IMAGES);
  const skipped = files.length - picked.length;
  // Adding pictures to a review never asks: the reader read the first ones.
  if (!adding && !opts.consented && !readerDownloaded()) {
    nextRun();
    setReceipt({ step: { name: 'consent', files: picked, source, kind: 'image' }, source });
    return;
  }
  lastFiles = { files: picked, source, adding };
  const before = adding ? getReceipt().lines : [];
  const { run, live, signal } = begin();
  setReceipt({ step: { name: 'reading', count: picked.length, progress: null, adding }, addFailed: false, ...(adding ? {} : { source }) });
  try {
    const pages = await readImages(picked, { signal, onProgress: progressFor(run) });
    if (!live()) return;
    onCancel(null);
    lastFiles = null;
    finish([...before, ...pages.flat()], source, adding, skipped);
  } catch (error) {
    if (!live()) return;
    stopped(error, source, adding);
  }
}

/** A new read: its run number, a check that it's still the current one, and its stop signal. */
function begin() {
  const run = nextRun();
  const ctrl = new AbortController();
  current = ctrl;
  onCancel(() => ctrl.abort());
  return { run, live: () => getReceipt().run === run, signal: ctrl.signal };
}

const progressFor = (run: number) => (progress: ReadProgress) => {
  if (getReceipt().run !== run) return;
  setReceipt((s) => (s.step.name === 'reading' ? { step: { ...s.step, progress } } : {}));
};

/** A read that ended without lines: cancelled, or failed (with the reason the user sees). */
function stopped(error: unknown, source: ReceiptSource, adding: boolean) {
  onCancel(null);
  if (error instanceof ReadCancelled) {
    setReceipt({ step: adding ? { name: 'review' } : { name: 'start' } });
    return;
  }
  if (error instanceof PdfError) {
    if (error.code === 'unsupported') lastFiles = null;
    return fail('pdf', source, adding, error.code);
  }
  console.error('Reading a receipt failed:', error instanceof Error ? error.message : error);
  fail(error instanceof ImageError ? 'image' : 'reader', source, adding);
}

/**
 * PDFs (and any pictures picked or shared with them), in order: a PDF page's own text
 * where it has some; scanned pages and pictures go through the reader.
 */
async function readWithPdfs(files: File[], pdf: boolean[], opts: ReadOptions): Promise<void> {
  const source: ReceiptSource = 'pdf';
  lastFiles = { files, source, adding: false };
  const { run, live, signal } = begin();
  setReceipt({ step: { name: 'reading', count: files.length, progress: { stage: 'open', progress: 0 }, adding: false }, addFailed: false, source });
  const opened: OpenedPdf[] = [];
  try {
    // A page with its own text, or a picture (or scanned page) for the reader; `file` =
    // which file it came from.
    const pages: { lines: TextLine[] | null; picture: PageSource | null; file: number }[] = [];
    let beyond = 0; // pages past a PDF's own page limit
    for (let i = 0; i < files.length; i++) {
      if (!pdf[i]) {
        pages.push({ lines: null, picture: files[i], file: i });
        continue;
      }
      const doc = await openPdf(files[i], { signal });
      opened.push(doc);
      if (!live()) return;
      for (const p of doc.pages) pages.push({ lines: p.lines, picture: p.lines ? null : p.render, file: i });
      beyond += doc.total - doc.pages.length;
    }
    const kept = pages.slice(0, MAX_IMAGES);
    const skipped = pages.length - kept.length + beyond;
    const toRead = kept.filter((p) => !p.lines);
    if (toRead.length && !opts.consented && !readerDownloaded()) {
      onCancel(null);
      const pictures = toRead.some((p) => p.picture instanceof Blob);
      setReceipt({ step: { name: 'consent', files, source, kind: pictures ? 'image' : 'pdf' } });
      return;
    }
    setReceipt((s) => (s.step.name === 'reading' ? { step: { ...s.step, count: kept.length } } : {}));
    const read = toRead.length ? await readImages(toRead.map((p) => p.picture as PageSource), { signal, onProgress: progressFor(run) }) : [];
    if (!live()) return;
    onCancel(null);
    lastFiles = null;
    // In order: a page's own text, or what the reader found on it.
    let next = 0;
    const byPage = kept.map((p) => p.lines ?? read[next++] ?? []);
    const lines = byPage.flat();
    finish(lines, source, false, skipped, separateReceipts(lines, kept.map((p) => p.file), byPage));
  } catch (error) {
    if (!live()) return;
    stopped(error, source, false);
  } finally {
    for (const doc of opened) doc.close();
  }
}

const nameKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Several files read as one receipt: the receipt ends at its total, so a file with
 * items of which none made it in looks like a separate receipt (another order) — the
 * review says it wasn't added. A second copy of the same order, or overlapping pages,
 * adds nothing new and says nothing.
 */
function separateReceipts(lines: TextLine[], fileOf: number[], byPage: TextLine[][]): number {
  const files = [...new Set(fileOf)];
  if (files.length < 2) return 0;
  const added = new Set(parseReceipt(lines).items.map((i) => nameKey(i.name)));
  let separate = 0;
  for (const f of files) {
    const own = parseReceipt(byPage.filter((_, i) => fileOf[i] === f).flat()).items;
    if (own.length && !own.some((i) => added.has(nameKey(i.name)))) separate++;
  }
  return separate;
}

/** Read the same files again (after the reader failed to load). */
export function retryRead(): boolean {
  if (!lastFiles) return false;
  void readFiles(lastFiles.files, lastFiles.source, { adding: lastFiles.adding, consented: true });
  return true;
}

/** Something shared to SpendLess from another app: files win over text when both come (the sheet says so). */
export function readShared(files: File[], text: string | null) {
  if (files.length) {
    void readFiles(files, 'image');
    return;
  }
  if (text?.trim()) readText(text);
}

/** Stop reading. */
export function cancelRead() {
  const cur = getReceipt();
  if (cur.step.name !== 'reading') return;
  current?.abort();
  current = null;
  // A new run: the stopped read finds itself stale and changes nothing.
  nextRun();
  onCancel(null);
  setReceipt({ step: cur.step.adding ? { name: 'review' } : { name: 'start' } });
}

/** Read copied text (an order email or message). */
export function readText(text: string) {
  nextRun();
  const lines = text
    .slice(0, MAX_CHARS)
    .split(/\r?\n/)
    .map((t) => ({ text: t }));
  finish(lines, 'text', false);
}
