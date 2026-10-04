import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const gaId = env.VITE_GA_MEASUREMENT_ID || '';

  return {
    plugins: [
      react(),
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
