import { useCallback, useEffect, useRef, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Toast } from '../ui';

// How often an open app asks the server for a new service worker. Browsers
// only check on navigation, and an installed PWA can stay open for days.
const CHECK_INTERVAL_MS = 60 * 60 * 1000;
// Back from the background after this long with an update waiting → apply it
// straight away, like a cold start, instead of asking.
const AUTO_APPLY_AFTER_HIDDEN_MS = 30 * 60 * 1000;

/**
 * Keeps the app on the latest deploy. A new service worker waits until the
 * user taps "Update" (or the app comes back after a long time in the
 * background), then takes over and the page reloads with the new build.
 * Lists data is safe across the reload — it lives in IndexedDB.
 */
export default function UpdatePrompt() {
  const regRef = useRef<ServiceWorkerRegistration>();
  const hiddenAt = useRef<number | null>(null);
  const [updating, setUpdating] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      regRef.current = registration;
    },
    onRegisterError(error) {
      console.error('Service worker registration failed:', error);
    },
  });

  const checkForUpdate = useCallback(() => {
    const reg = regRef.current;
    if (!reg || reg.installing || !navigator.onLine) return;
    // update() fetches sw.js bypassing the HTTP cache; offline it just rejects.
    reg.update().catch(() => {});
  }, []);

  const apply = useCallback(() => {
    setUpdating(true);
    // Tells the waiting worker to skip waiting, then reloads once it controls the page.
    updateServiceWorker(true).catch((error) => {
      console.error('Applying the app update failed:', error);
      setUpdating(false);
    });
  }, [updateServiceWorker]);

  useEffect(() => {
    const id = window.setInterval(checkForUpdate, CHECK_INTERVAL_MS);
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt.current = Date.now();
        return;
      }
      const awayFor = hiddenAt.current == null ? 0 : Date.now() - hiddenAt.current;
      hiddenAt.current = null;
      if (needRefresh && awayFor >= AUTO_APPLY_AFTER_HIDDEN_MS) apply();
      else checkForUpdate();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', checkForUpdate);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', checkForUpdate);
    };
  }, [checkForUpdate, apply, needRefresh]);

  if (!needRefresh || dismissed) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-[110] flex justify-center pointer-events-none safe-top"
      style={{ paddingLeft: 12, paddingRight: 12 }}
    >
      <Toast
        className="pointer-events-auto w-full max-w-[420px] mt-3"
        icon="refresh"
        message={updating ? 'Updating SpendLess…' : 'A new version is ready.'}
        actionLabel={updating ? undefined : 'Update'}
        onAction={apply}
        onDismiss={updating ? undefined : () => setDismissed(true)}
        dismissLabel="Update later"
      />
    </div>
  );
}
