// Where someone probably is, to suggest their city on the first run (they can change it).
// The host's edge function (`netlify/edge-functions/geo.ts`, `/api/geo`) answers with the
// country and city it sees for the connection; nothing is stored. When it can't (offline,
// `npm run dev`, an error), the device's time zone still tells the country for the
// countries we have cities in. No location permission is ever asked for.
import type { Region } from './compare/types';

export interface Place {
  /** ISO country code, e.g. "PK". */
  country: string | null;
  /** The country's name in English, e.g. "Pakistan". */
  countryName: string | null;
  city: string | null;
  /** True when the host answered; false = guessed from the time zone (or nothing known). */
  detected: boolean;
}

const TIMEOUT_MS = 3000;

/** Time zones that name one country we have cities in. */
const ZONE_COUNTRY: Record<string, string> = {
  'Asia/Karachi': 'PK',
};

export function countryFromTimeZone(zone?: string): string | null {
  try {
    const tz = zone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    return ZONE_COUNTRY[tz] ?? null;
  } catch {
    return null;
  }
}

export function countryName(code: string | null): string | null {
  if (!code) return null;
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? null;
  } catch {
    return null;
  }
}

const clean = (v: unknown, max: number): string | null =>
  typeof v === 'string' && v.trim() && v.trim().length <= max ? v.trim() : null;

/** Ask the host where this connection is; falls back to the time zone. Never throws. */
export async function detectPlace(): Promise<Place> {
  const fallback = (): Place => {
    const country = countryFromTimeZone();
    return { country, countryName: countryName(country), city: null, detected: false };
  };
  if (typeof navigator !== 'undefined' && !navigator.onLine) return fallback();
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch('/api/geo', { signal: ctl.signal, cache: 'no-store', headers: { accept: 'application/json' } });
    // Anything but JSON (the app's own page in dev, an error page) means no answer.
    if (!res.ok || !(res.headers.get('content-type') || '').includes('application/json')) return fallback();
    const body = (await res.json()) as Record<string, unknown>;
    const country = clean(body.country, 2)?.toUpperCase() ?? null;
    if (!country || !/^[A-Z]{2}$/.test(country)) return fallback();
    return {
      country,
      countryName: clean(body.countryName, 80) ?? countryName(country),
      city: clean(body.city, 80),
      detected: true,
    };
  } catch {
    return fallback();
  } finally {
    clearTimeout(timer);
  }
}

const key = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');

/** The region for a place: same country, same city name (case, accents and spaces ignored). */
export function matchRegion(regions: Region[], place: Pick<Place, 'country' | 'city'>): Region | null {
  if (!place.city || !place.country) return null;
  const k = key(place.city);
  return regions.find((r) => r.countryCode.toUpperCase() === place.country && key(r.name) === k) ?? null;
}
