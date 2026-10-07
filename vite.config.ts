import { readFileSync, statSync } from 'node:fs';
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

function ocrAssets(): Plugin {
  const type = (f: string) => (f.endsWith('.js') ? 'text/javascript' : f.endsWith('.wasm') ? 'application/wasm' : f.endsWith('.gz') ? 'application/gzip' : 'text/plain');
  return {
    name: 'spendless-ocr-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const prefix = `/${OCR_DIR}/`;
        if (!req.url?.startsWith(prefix)) return next();
        // Only the files listed above: nothing else under node_modules is reachable.
        const file = OCR_FILES[req.url.slice(prefix.length).split('?')[0]];
        if (!file) return next();
        res.setHeader('Content-Type', type(file));
        res.end(readFileSync(file));
      });
    },
    generateBundle() {
      for (const [name, file] of Object.entries(OCR_FILES)) {
        this.emitFile({ type: 'asset', fileName: `${OCR_DIR}/${name}`, source: readFileSync(file) });
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
    },
    plugins: [
      react(),
      ocrAssets(),
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
          // The receipt reader is downloaded on first use, not with the app.
          globIgnores: ['ocr/**'],
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
