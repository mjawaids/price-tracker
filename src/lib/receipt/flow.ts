// Reading a receipt into the session: pictures through the on-device reader, or
// pasted text, then parsing and guessing the shop. Runs outside React so it carries
// on when the user leaves the screen. Imported only by the (lazy) receipt screen.
// App-only.
import { trackUserAction } from '../../utils/analytics';
import { ImageError } from './image.ts';
import { ReadCancelled, readImages } from './ocr.ts';
import { parseReceipt } from './parse.ts';
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

const fail = (reason: ReadFailure, source: ReceiptSource, adding: boolean) => {
  track('receipt_failed', { reason, source, adding });
  // A picture added to a receipt that failed leaves the review as it was.
  if (adding) setReceipt({ step: { name: 'review' }, addFailed: true });
  else setReceipt({ step: { name: 'failed', reason }, source });
};

/** Lines → the review (or "nothing found"). Adding keeps the shop, date and edits. */
function finish(lines: TextLine[], source: ReceiptSource, adding: boolean) {
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
    ...(adding ? {} : { storeId: null, storeLooked: false, date: null, edits: {} }),
  });
}

/** Read pictures of a receipt (several screenshots of one order are read as one). */
export async function readFiles(files: File[], source: ReceiptSource, adding = false): Promise<void> {
  const picked = files.slice(0, MAX_IMAGES);
  if (!picked.length) return;
  lastFiles = { files: picked, source, adding };
  const before = adding ? getReceipt().lines : [];
  const run = nextRun();
  const live = () => getReceipt().run === run;
  const ctrl = new AbortController();
  current = ctrl;
  onCancel(() => ctrl.abort());
  setReceipt({ step: { name: 'reading', count: picked.length, progress: null, adding }, addFailed: false, ...(adding ? {} : { source }) });
  try {
    const pages = await readImages(picked, {
      signal: ctrl.signal,
      onProgress: (progress) => {
        if (!live()) return;
        setReceipt((s) => (s.step.name === 'reading' ? { step: { ...s.step, progress } } : {}));
      },
    });
    if (!live()) return;
    onCancel(null);
    lastFiles = null;
    finish([...before, ...pages.flat()], source, adding);
  } catch (error) {
    if (!live()) return;
    onCancel(null);
    if (error instanceof ReadCancelled) {
      setReceipt({ step: adding ? { name: 'review' } : { name: 'start' } });
      return;
    }
    console.error('Reading a receipt failed:', error instanceof Error ? error.message : error);
    fail(error instanceof ImageError ? 'image' : 'reader', source, adding);
  }
}

/** Read the same pictures again (after the reader failed to load). */
export function retryRead(): boolean {
  if (!lastFiles) return false;
  void readFiles(lastFiles.files, lastFiles.source, lastFiles.adding);
  return true;
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
