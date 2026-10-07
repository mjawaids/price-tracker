import { readdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// On-device receipt reader (tesseract.js), served from our own origin under a
// versioned folder — never a CDN. Flat on purpose: the engine looks for its .wasm
// next to the worker script. Not precached (≈6 MB): downloaded once, when someone
// first reads a receipt, then kept by a runtime cache (see workbox below).
const require = createRequire(import.meta.url);
const pkgDir = (name: string, from = require) => dirname(from.resolve(`${name}/package.json`));
const tesseractDir = pkgDir('tesseract.js');
const coreDir = pkgDir('tesseract.js-core', createRequire(join(tesseractDir, 'package.json')));
const OCR_DIR = `ocr/${require('tesseract.js/package.json').version}`;
const OCR_FILES: Record<string, string> = {
  'worker.min.js': join(tesseractDir, 'dist/worker.min.js'),
  'LICENSE-tesseract.js.md': join(tesseractDir, 'LICENSE.md'),
  'LICENSE-tesseract.js-core.txt': join(coreDir, 'LICENSE'),
  'eng.traineddata.gz': join(pkgDir('@tesseract.js-data/eng'), '4.0.0_best_int/eng.traineddata.gz'),
};
for (const v of ['', '-simd', '-relaxedsimd']) {
  for (const ext of ['js', 'wasm']) OCR_FILES[`tesseract-core${v}-lstm.${ext}`] = join(coreDir, `tesseract-core${v}-lstm.${ext}`);
}
// What one device downloads: the worker, one engine and the English data.
const OCR_BYTES = ['worker.min.js', 'tesseract-core-simd-lstm.js', 'tesseract-core-simd-lstm.wasm', 'eng.traineddata.gz']
  .reduce((a, f) => a + statSync(OCR_FILES[f]).size, 0);

// PDF receipts (pdf.js), the same way: self-hosted, loaded on first use, kept by a
// runtime cache. The legacy build: the modern one needs very new browser APIs.
// Renamed .mjs → .js so every server sends a JavaScript type. Left out: the PDF
// scripting sandbox (quickjs) and the no-WebAssembly fallbacks (OCR needs wasm anyway).
const pdfDir = pkgDir('pdfjs-dist');
const PDF_DIR = `pdf/${require('pdfjs-dist/package.json').version}-legacy`;
const PDF_FILES: Record<string, string> = {
  'pdf.min.js': join(pdfDir, 'legacy/build/pdf.min.mjs'),
  'pdf.worker.min.js': join(pdfDir, 'legacy/build/pdf.worker.min.mjs'),
  'LICENSE-pdf.js.txt': join(pdfDir, 'LICENSE'),
};
for (const f of ['jbig2.wasm', 'openjpeg.wasm', 'qcms_bg.wasm']) PDF_FILES[`wasm/${f}`] = join(pdfDir, 'wasm', f);
for (const sub of ['cmaps', 'standard_fonts', 'iccs', 'wasm']) {
  for (const f of readdirSync(join(pdfDir, sub))) {
    if (sub !== 'wasm' || f.startsWith('LICENSE')) PDF_FILES[`${sub}/${f}`] = join(pdfDir, sub, f);
  }
}

const MIME: Record<string, string> = {
  js: 'text/javascript',
  wasm: 'application/wasm',
  gz: 'application/gzip',
  bcmap: 'application/octet-stream',
  pfb: 'application/octet-stream',
  ttf: 'font/ttf',
  icc: 'application/vnd.iccprofile',
};

/** Serves a fixed list of files under `/<dir>/` in dev and emits them into the build. */
function selfHosted(name: string, dir: string, files: Record<string, string>): Plugin {
  const type = (f: string) => MIME[f.slice(f.lastIndexOf('.') + 1)] ?? 'text/plain';
  return {
    name: `spendless-${name}-assets`,
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const prefix = `/${dir}/`;
        if (!req.url?.startsWith(prefix)) return next();
        // Only the files listed: nothing else under node_modules is reachable.
        const file = files[req.url.slice(prefix.length).split('?')[0]];
        if (!file) return next();
        res.setHeader('Content-Type', type(file));
        res.end(readFileSync(file));
      });
    },
    generateBundle() {
      for (const [n, file] of Object.entries(files)) {
        this.emitFile({ type: 'asset', fileName: `${dir}/${n}`, source: readFileSync(file) });
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const gaId = env.VITE_GA_MEASUREMENT_ID || '';

  return {
    define: {
      'import.meta.env.VITE_OCR_PATH': JSON.stringify(`/${OCR_DIR}/`),
      'import.meta.env.VITE_OCR_BYTES': JSON.stringify(String(OCR_BYTES)),
      'import.meta.env.VITE_PDF_PATH': JSON.stringify(`/${PDF_DIR}/`),
    },
    plugins: [
      react(),
      selfHosted('ocr', OCR_DIR, OCR_FILES),
      selfHosted('pdf', PDF_DIR, PDF_FILES),
      {
        name: 'html-transform',
        transformIndexHtml(html) {
          return html.replace(/__GA_MEASUREMENT_ID__/g, gaId);
        },
      },
      VitePWA({
        // Keep the existing static public/site.webmanifest as the single source
        // of truth — do not generate or inject a second manifest.
        manifest: false,
        // A new deploy installs a new service worker that waits; the app shows
        // an "Update" prompt (src/components/shell/UpdatePrompt.tsx) and swaps
        // to it on tap, or by itself after a long time in the background.
        registerType: 'prompt',
        // Registered from UpdatePrompt via virtual:pwa-register/react, so the
        // plugin must not inject its own registration script.
        injectRegister: false,
        workbox: {
          // Precache the built app-shell assets emitted into dist.
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          // The receipt and PDF readers are downloaded on first use, not with the
          // app; the share handler is pulled in by importScripts below instead.
          globIgnores: ['ocr/**', 'pdf/**', 'share-target-sw.js'],
          // "Share to SpendLess" (Android share menu → POST /share-receipt).
          importScripts: ['share-target-sw.js'],
          // SPA: serve index.html for client-side routes (/privacy, /refund, etc.).
          navigateFallback: '/index.html',
          // The new worker waits for the user (see registerType above), then
          // claims open pages so they reload onto the new build.
          clientsClaim: true,
          skipWaiting: false,
          // Drop precaches left behind by older Workbox versions.
          cleanupOutdatedCaches: true,
          // Cache Google Fonts so the app keeps its typography offline. Supabase
          // API calls are deliberately not cached here — Lists has its own
          // offline store (src/lib/offline).
          runtimeCaching: [
            {
              // Receipt reader files: versioned paths, so cache-first and kept.
              urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/ocr/'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'spendless-ocr',
                cacheableResponse: { statuses: [200] },
                expiration: { maxEntries: 20, purgeOnQuotaError: true },
              },
            },
            {
              // PDF reader files: versioned too. A PDF may need a few cmaps/fonts.
              urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/pdf/'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'spendless-pdf',
                cacheableResponse: { statuses: [200] },
                expiration: { maxEntries: 60, purgeOnQuotaError: true },
              },
            },
            {
              urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
              handler: 'StaleWhileRevalidate',
              options: { cacheName: 'google-fonts-stylesheets' },
            },
            {
              urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                cacheableResponse: { statuses: [0, 200] },
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
          ],
        },
        // Disable the SW in `vite dev` so it never interferes with HMR.
        devOptions: {
          enabled: false,
        },
      }),
    ],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
  };
});
