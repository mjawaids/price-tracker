import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Privacy from './pages/Privacy';
import Refund from './pages/Refund';
import Terms from './pages/Terms';
import Pricing from './pages/Pricing';
import UpdatePrompt from './components/shell/UpdatePrompt';
// Listens for the browser's install offer before anything renders.
import './lib/install';
import './index.css';

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
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/refund" element={<Refund />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/pricing" element={<Pricing />} />
      </Routes>
      <UpdatePrompt />
    </BrowserRouter>
  </StrictMode>
);
