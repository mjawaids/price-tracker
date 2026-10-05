// Tiny helpers for reading store pages. We only ever read text out of HTML; nothing
// here is rendered or executed.

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (m, e: string) => {
    const k = e.toLowerCase();
    if (k in ENTITIES) return ENTITIES[k];
    if (k.startsWith('#x')) return safeChar(parseInt(k.slice(2), 16), m);
    if (k.startsWith('#')) return safeChar(parseInt(k.slice(1), 10), m);
    return m;
  });
}

const safeChar = (code: number, fallback: string) =>
  Number.isInteger(code) && code > 31 && code < 0x110000 ? String.fromCodePoint(code) : fallback;

/** The JSON in a Next.js page's `__NEXT_DATA__` script, or null. */
export function nextData(html: string): unknown {
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

/** `<loc>` URLs in a sitemap or sitemap index. */
export const sitemapLocs = (xml: string) => [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => decodeEntities(m[1]));

/** "dairybreak-fast" → "Dairybreak fast". */
export const slugWords = (slug: string) => {
  const w = slug.replace(/[-_]+/g, ' ').trim();
  return w ? w[0].toUpperCase() + w.slice(1) : w;
};
