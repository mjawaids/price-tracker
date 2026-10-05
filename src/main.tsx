import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import UpdatePrompt from './components/shell/UpdatePrompt';
// Listens for the browser's install offer before anything renders.
import './lib/install';
import './index.css';
import { Privacy, Refund, Terms, Pricing, Bot } from './pages/lazy';
import { APP_VERSION } from './lib/version';

// Expose the build on <html data-app-version> (handy for support). It also keeps
// the version string in the entry bundle, which the deploy smoke test checks.
document.documentElement.dataset.appVersion = APP_VERSION;

// A tab still running an old build can ask for a code chunk that the new
// deploy no longer has. Reload once onto the current build instead of breaking.
window.addEventListener('vite:preloadError', (event) => {
  // Guard against a reload loop if the chunk is missing for another reason.
  const key = 'spendless:chunk-reload-at';
  try {
    if (Date.now() - Number(sessionStorage.getItem(key) || 0) < 30_000) return;
    sessionStorage.setItem(key, String(Date.now()));
  } catch {
    return;
  }
  event.preventDefault();
  window.location.reload();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Suspense fallback={<div className="min-h-screen bg-paper" />}>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/refund" element={<Refund />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/bot" element={<Bot />} />
        </Routes>
      </Suspense>
      <UpdatePrompt />
    </BrowserRouter>
  </StrictMode>
);
