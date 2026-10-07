// The on-device receipt reader (tesseract.js, self-hosted under /ocr/<version>/).
// Loaded only when someone reads a receipt; one worker, terminated after use.
// Nothing leaves the device: the image is read in a Web Worker and dropped. App-only.
import { enhance, prepareImage } from './image.ts';
import { linesFromOcr } from './layout.ts';
import type { OcrLine } from './layout.ts';
import type { TextLine } from './text.ts';

const BASE = import.meta.env.VITE_OCR_PATH;
/** Download size shown before the first use ("about 6 MB"), to the nearest MB. */
export const OCR_MB = Math.max(1, Math.round(Number(import.meta.env.VITE_OCR_BYTES) / 1_000_000));
const READY_KEY = 'spendless-ocr-ready';

/** Has this device downloaded the reader before (so we don't ask again)? */
export function readerDownloaded(): boolean {
  try {
    return localStorage.getItem(READY_KEY) === BASE;
  } catch {
    return false;
  }
}

/** The user is on a metered / data-saver connection. */
export function saveDataOn(): boolean {
  const c = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return !!c?.saveData;
}

export interface ReadProgress {
  /** open = opening a PDF (before any reading). */
  stage: 'open' | 'download' | 'prepare' | 'read';
  /** 0–1 across all images. */
  progress: number;
}

export class ReadCancelled extends Error {
  constructor() {
    super('cancelled');
  }
}

/** A picture, or a scanned PDF page drawn when its turn comes (one canvas at a time). */
export type PageSource = Blob | (() => Promise<HTMLCanvasElement>);

/** Read one or more receipt images into lines (one list per image). */
export async function readImages(
  files: PageSource[],
  opts: { onProgress?: (p: ReadProgress) => void; signal?: AbortSignal } = {},
): Promise<TextLine[][]> {
  const { onProgress, signal } = opts;
  const report = (stage: ReadProgress['stage'], progress: number) => onProgress?.({ stage, progress: Math.max(0, Math.min(1, progress)) });
  if (signal?.aborted) throw new ReadCancelled();
  report('download', 0);

  const [{ createWorker, OEM, PSM }, { relaxedSimd, simd }] = await Promise.all([
    import('tesseract.js'),
    import('wasm-feature-detect'),
  ]);
  const variant = (await relaxedSimd()) ? '-relaxedsimd' : (await simd()) ? '-simd' : '';
  const base = new URL(BASE, location.origin).href;
  let current = 0;
  const worker = await createWorker('eng', OEM.LSTM_ONLY, {
    workerPath: `${base}worker.min.js`,
    corePath: `${base}tesseract-core${variant}-lstm.js`,
    langPath: base,
    workerBlobURL: false,
    // The service worker keeps these files; no second copy in IndexedDB.
    cacheMethod: 'none',
    logger: (m) => {
      if (m.status === 'recognizing text') report('read', (current + m.progress) / files.length);
      else if (/loading/.test(m.status)) report('download', m.progress);
    },
  });
  const stop = () => {
    worker.terminate().catch(() => {});
  };
  signal?.addEventListener('abort', stop, { once: true });
  try {
    try {
      localStorage.setItem(READY_KEY, BASE);
    } catch {
      /* private mode: we'll ask again next time */
    }
    await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO, preserve_interword_spaces: '1', user_defined_dpi: '300' });
    const out: TextLine[][] = [];
    for (current = 0; current < files.length; current++) {
      if (signal?.aborted) throw new ReadCancelled();
      report('prepare', current / files.length);
      const src = files[current];
      const canvas = src instanceof Blob ? await prepareImage(src) : enhance(await src());
      const { data } = await worker.recognize(canvas, {}, { blocks: true, text: false });
      canvas.width = canvas.height = 0; // free the pixels now
      const lines: OcrLine[] = (data.blocks ?? []).flatMap((b) =>
        b.paragraphs.flatMap((p) =>
          p.lines.map((l) => ({
            bbox: l.bbox,
            words: l.words.map((w) => ({ text: w.text, confidence: w.confidence, bbox: w.bbox })),
          })),
        ),
      );
      out.push(linesFromOcr(lines));
    }
    report('read', 1);
    return out;
  } catch (e) {
    if (signal?.aborted) throw new ReadCancelled();
    throw e;
  } finally {
    signal?.removeEventListener('abort', stop);
    worker.terminate().catch(() => {});
  }
}
