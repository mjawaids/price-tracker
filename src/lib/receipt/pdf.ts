// PDF receipts (an invoice from an email or an app): the PDF's own text when it has
// some, else its pages drawn as pictures for the on-device reader. pdf.js is
// self-hosted under /pdf/<version>-legacy/ (vite.config.ts), loaded on first use and
// kept by the service worker; it parses in its own Web Worker. Nothing is uploaded.
// The file is untrusted: size, page and pixel limits, no scripting, no XFA. App-only.
import { linesFromPdf } from './layout.ts';
import type { PdfRun } from './layout.ts';
import { ReadCancelled } from './ocr.ts';
import type { TextLine } from './text.ts';

type PdfJs = typeof import('pdfjs-dist');
type PdfDocument = import('pdfjs-dist').PDFDocumentProxy;
type PdfPage = import('pdfjs-dist').PDFPageProxy;
type TextItem = import('pdfjs-dist/types/src/display/api').TextItem;

const BASE = import.meta.env.VITE_PDF_PATH;
/** Biggest PDF we open. */
export const MAX_PDF_BYTES = 10 * 1024 * 1024;
/** Pages read (an order is one or two; the same limit as pictures). */
export const MAX_PDF_PAGES = 6;
/** Opening and reading the text of a PDF (not the reader on scanned pages). */
const OPEN_TIMEOUT_MS = 45_000;
/** Scanned pages are drawn at about 300 dpi, within these limits (memory, iOS canvas cap). */
const SCAN_DPI = 300;
const SCAN_MAX_PIXELS = 8_000_000;
const SCAN_MAX_SIDE = 8192;

/** password = locked · invalid = damaged or not a PDF · size = too big · unsupported = this browser can't run the PDF reader · timeout */
export type PdfProblem = 'password' | 'invalid' | 'size' | 'unsupported' | 'timeout';

export class PdfError extends Error {
  readonly code: PdfProblem;
  constructor(code: PdfProblem) {
    super(`pdf ${code}`);
    this.code = code;
  }
}

/** One page: its own text (null = a scan), and a way to draw it for the reader. */
export interface PdfPageText {
  lines: TextLine[] | null;
  render: () => Promise<HTMLCanvasElement>;
}

export interface OpenedPdf {
  /** The pages read (the first MAX_PDF_PAGES). */
  pages: PdfPageText[];
  /** Pages in the PDF. */
  total: number;
  close: () => void;
}

/** A PDF by its type, its name, or its first bytes ("%PDF-"; some pickers send no type). */
export async function isPdfFile(file: File): Promise<boolean> {
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) return true;
  if (file.type && file.type !== 'application/octet-stream') return false;
  try {
    return (await file.slice(0, 5).text()) === '%PDF-';
  } catch {
    return false;
  }
}

const abs = (path: string) => new URL(`${BASE}${path}`, location.origin).href;

let lib: Promise<PdfJs> | null = null;
function loadPdfJs(): Promise<PdfJs> {
  lib ??= (async () => {
    // A failed import() stays failed for the life of the page in some browsers, so
    // fetch the files first (kept by the service worker / HTTP cache): offline, that
    // fails on its own and "Try again" works once back online.
    await Promise.all(
      ['pdf.min.js', 'pdf.worker.min.js'].map(async (f) => {
        const res = await fetch(abs(f));
        if (!res.ok) throw new Error(`PDF reader file: HTTP ${res.status}`);
        await res.arrayBuffer();
      }),
    );
    const pdfjs = (await import(/* @vite-ignore */ abs('pdf.min.js'))) as PdfJs;
    pdfjs.GlobalWorkerOptions.workerSrc = abs('pdf.worker.min.js');
    return pdfjs;
  })().catch((error: unknown) => {
    lib = null;
    // An older browser can't parse the reader; anything else (offline) can be retried.
    if (error instanceof SyntaxError) throw new PdfError('unsupported');
    throw error;
  });
  return lib;
}

/** Enough real text to read (not a scan with a stray header, not glyphs without a text map). */
function readable(lines: TextLine[]): boolean {
  const all = lines.map((l) => l.text).join(' ');
  const alnum = (all.match(/[\p{L}\p{N}]/gu) ?? []).length;
  const digits = (all.match(/\d/g) ?? []).length;
  const junk = (all.match(/[-�]/g) ?? []).length;
  return alnum >= 30 && digits >= 6 && junk < 0.2 * all.length;
}

async function pageText(pdfjs: PdfJs, page: PdfPage): Promise<TextLine[]> {
  const content = await page.getTextContent();
  const items = content.items.filter((i): i is TextItem => 'str' in i && !!i.str.trim());
  // Read the page the way its text stands upright: usually as shown, but a page
  // saved turned sideways (a rotated invoice) reads right one way round.
  let best: PdfRun[] = [];
  for (const rotation of [...new Set([page.rotate, 0, 90, 180, 270])]) {
    const viewport = page.getViewport({ scale: 1, rotation });
    const runs: PdfRun[] = [];
    for (const item of items) {
      const tx = pdfjs.Util.transform(viewport.transform, item.transform) as number[];
      // Upright text only: a tilted watermark or a label on its side would scramble rows.
      if (Math.abs(Math.atan2(tx[1], tx[0])) > 0.2) continue;
      const h = Math.hypot(tx[2], tx[3]);
      if (!(h > 0)) continue;
      runs.push({ text: item.str, x0: tx[4], x1: tx[4] + item.width, y0: tx[5] - h, y1: tx[5] });
    }
    if (runs.length > best.length) best = runs;
    if (runs.length >= 0.8 * items.length) break;
  }
  return linesFromPdf(best);
}

function renderer(pdfjs: PdfJs, page: PdfPage, signal?: AbortSignal) {
  return async (): Promise<HTMLCanvasElement> => {
    if (signal?.aborted) throw new ReadCancelled();
    const base = page.getViewport({ scale: 1 });
    let scale = SCAN_DPI / 72;
    const pixels = base.width * base.height * scale * scale;
    if (pixels > SCAN_MAX_PIXELS) scale *= Math.sqrt(SCAN_MAX_PIXELS / pixels);
    scale = Math.min(scale, SCAN_MAX_SIDE / Math.max(base.width, base.height));
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const task = page.render({ canvas, viewport, annotationMode: pdfjs.AnnotationMode.DISABLE, background: 'white' });
    const stop = () => task.cancel();
    signal?.addEventListener('abort', stop, { once: true });
    try {
      await task.promise;
    } catch (error) {
      if (signal?.aborted) throw new ReadCancelled();
      throw error;
    } finally {
      signal?.removeEventListener('abort', stop);
      page.cleanup();
    }
    return canvas;
  };
}

/**
 * Open a PDF: each page's own text, or (for a scan) a way to draw it. Call `close`
 * when done with the pages. Throws PdfError for a PDF we can't open, ReadCancelled
 * when stopped.
 */
export async function openPdf(file: Blob, opts: { signal?: AbortSignal } = {}): Promise<OpenedPdf> {
  const { signal } = opts;
  if (file.size > MAX_PDF_BYTES) throw new PdfError('size');
  if (signal?.aborted) throw new ReadCancelled();
  const pdfjs = await loadPdfJs();
  const data = new Uint8Array(await file.arrayBuffer());
  if (signal?.aborted) throw new ReadCancelled();

  const task = pdfjs.getDocument({
    data,
    cMapUrl: abs('cmaps/'),
    cMapPacked: true,
    standardFontDataUrl: abs('standard_fonts/'),
    wasmUrl: abs('wasm/'),
    iccUrl: abs('iccs/'),
    // A hostile PDF can't make us decode a giant image.
    maxImageSize: 32_000_000,
    // Warnings can quote the document; keep receipt text out of the console.
    verbosity: pdfjs.VerbosityLevel.ERRORS,
    // Glyphs are drawn by pdf.js itself; the PDF's fonts never reach document.fonts.
    disableFontFace: true,
    enableXfa: false,
  });
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    void task.destroy();
  };
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stop = () => close();
  signal?.addEventListener('abort', stop, { once: true });
  try {
    const opened = (async () => {
      const doc: PdfDocument = await task.promise;
      const pages: PdfPageText[] = [];
      for (let n = 1; n <= Math.min(doc.numPages, MAX_PDF_PAGES); n++) {
        const page = await doc.getPage(n);
        const lines = await pageText(pdfjs, page);
        pages.push({ lines: readable(lines) ? lines : null, render: renderer(pdfjs, page, signal) });
      }
      return { pages, total: doc.numPages };
    })();
    opened.catch(() => {}); // after a timeout it fails on its own; handled below otherwise
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new PdfError('timeout')), OPEN_TIMEOUT_MS);
    });
    const { pages, total } = await Promise.race([opened, timeout]);
    return { pages, total, close };
  } catch (error) {
    close();
    if (signal?.aborted) throw new ReadCancelled();
    const name = (error as { name?: string } | null)?.name;
    if (name === 'PasswordException') throw new PdfError('password');
    if (name === 'InvalidPDFException' || name === 'FormatError') throw new PdfError('invalid');
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', stop);
  }
}
