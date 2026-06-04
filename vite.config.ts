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
        // Phase 1: no update UI. The service worker installs and updates silently.
        registerType: 'autoUpdate',
        // Plugin injects the SW registration <script> into the built index.html,
        // so no changes to src/main.tsx and no virtual-module imports are needed.
        injectRegister: 'auto',
        workbox: {
          // Precache the built app-shell assets emitted into dist.
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          // SPA: serve index.html for client-side routes (/privacy, /refund, etc.).
          navigateFallback: '/index.html',
          // Take control immediately on update (pairs with registerType autoUpdate).
          clientsClaim: true,
          skipWaiting: true,
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
