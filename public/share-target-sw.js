// "Share to SpendLess": the Android share menu sends a receipt (screenshots, a PDF or
// text) to the installed app as a POST to /share-receipt (site.webmanifest →
// share_target). Pulled into the generated service worker by workbox importScripts
// (vite.config.ts). It keeps what was shared in a cache on this device only, then
// sends the app to /?share=receipt, which asks "Read this receipt?"
// (src/lib/receipt/inbox.ts reads and deletes it). Nothing is uploaded.

const INBOX = 'spendless-share-inbox';
const MAX_FILES = 6;
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MAX_PDF_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_BYTES = 30 * 1024 * 1024;
const MAX_TEXT = 20000;
const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'POST') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname !== '/share-receipt') return;
  // A share opens the app (a top-level navigation). A form another site posts into a
  // hidden frame is not one: leave it to the network, which refuses it.
  if (req.mode !== 'navigate' || req.destination !== 'document') return;
  // Best effort: a share has no referrer; a page on another site would.
  if (fromOtherSite(req.referrer)) return;
  event.respondWith(receive(req));
});

function fromOtherSite(referrer) {
  if (!referrer) return false;
  try {
    const from = new URL(referrer);
    return /^https?:$/.test(from.protocol) && from.origin !== self.location.origin;
  } catch {
    return false;
  }
}

async function receive(req) {
  try {
    const length = Number(req.headers.get('content-length') || 0);
    if (length > MAX_TOTAL_BYTES + 1024 * 1024) throw new Error('too big');
    const form = await req.formData();
    const files = [];
    let total = 0;
    for (const f of form.getAll('receipt')) {
      if (files.length >= MAX_FILES) break;
      if (typeof f === 'string' || !TYPES.includes(f.type)) continue;
      const cap = f.type === 'application/pdf' ? MAX_PDF_BYTES : MAX_FILE_BYTES;
      if (!f.size || f.size > cap || total + f.size > MAX_TOTAL_BYTES) continue;
      total += f.size;
      files.push(f);
    }
    const textField = form.get('text');
    const text = typeof textField === 'string' ? textField.slice(0, MAX_TEXT) : '';
    if (!files.length && !text.trim()) throw new Error('nothing usable');

    // One shared receipt at a time: the newest replaces any older one.
    await caches.delete(INBOX);
    const inbox = await caches.open(INBOX);
    // No file names are kept; the app names the files itself.
    for (let i = 0; i < files.length; i++) {
      await inbox.put(`/share-inbox/${i}`, new Response(files[i], { headers: { 'Content-Type': files[i].type } }));
    }
    // Written last: the app only reads an inbox whose list is complete.
    const meta = { at: Date.now(), files: files.map((f) => ({ type: f.type, size: f.size })), text };
    await inbox.put('/share-inbox/meta.json', new Response(JSON.stringify(meta), { headers: { 'Content-Type': 'application/json' } }));
    return Response.redirect('/?share=receipt', 303);
  } catch {
    return Response.redirect('/?share=failed', 303);
  }
}
