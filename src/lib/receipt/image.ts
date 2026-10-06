// A receipt photo or screenshot → a canvas the reader does well on: upright (EXIF),
// a sensible size (small screenshots enlarged, big photos shrunk), grey, stretched
// contrast, dark-mode screenshots turned light. Runs on the device. App-only.

/** Biggest file we open. */
export const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MIN_SIDE = 1600;
const MAX_SIDE = 2000;

export class ImageError extends Error {
  readonly code: 'type' | 'size' | 'decode';
  constructor(code: 'type' | 'size' | 'decode') {
    super(`image ${code}`);
    this.code = code;
  }
}

export async function prepareImage(file: Blob): Promise<HTMLCanvasElement> {
  if (file.size > MAX_FILE_BYTES) throw new ImageError('size');
  if (file.type && !file.type.startsWith('image/')) throw new ImageError('type');
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new ImageError('decode');
  }
  const longest = Math.max(bitmap.width, bitmap.height);
  const scale = longest < MIN_SIDE ? Math.min(2.5, MIN_SIDE / longest) : Math.min(1, MAX_SIDE / longest);
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    bitmap.close();
    throw new ImageError('decode');
  }
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const hist = new Uint32Array(256);
  let sum = 0;
  for (let i = 0; i < d.length; i += 4) {
    const y = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
    const v = y | 0;
    d[i] = v;
    hist[v]++;
    sum += v;
  }
  const n = d.length / 4;
  // Dark-mode screenshot: light text on dark → invert so text is dark on light.
  const invert = sum / n < 100;
  // Stretch the 2nd–98th percentile to the full range.
  const pct = (p: number) => {
    let acc = 0;
    for (let v = 0; v < 256; v++) {
      acc += hist[v];
      if (acc >= p * n) return v;
    }
    return 255;
  };
  const lo = pct(0.02);
  const hi = Math.max(lo + 1, pct(0.98));
  const k = 255 / (hi - lo);
  for (let i = 0; i < d.length; i += 4) {
    let v = Math.max(0, Math.min(255, (d[i] - lo) * k));
    if (invert) v = 255 - v;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}
