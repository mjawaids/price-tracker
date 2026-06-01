import { useMemo, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { CURRENCIES, currencyForCountry, getCurrencyByCode } from '../../utils/currency';
import { Icon, Sheet } from '../ui';

const REGIONS: { city: string; cc: string }[] = [
  { city: 'San Francisco, CA', cc: 'USD' },
  { city: 'London, UK', cc: 'GBP' },
  { city: 'Karachi, PK', cc: 'PKR' },
  { city: 'Toronto, CA', cc: 'CAD' },
  { city: 'Sydney, AU', cc: 'AUD' },
  { city: 'Berlin, DE', cc: 'EUR' },
  { city: 'Dubai, AE', cc: 'AED' },
];

export function CurrencySheet() {
  const app = useApp();
  const open = app.sheet === 'currency';
  const [query, setQuery] = useState('');
  const close = () => {
    setQuery('');
    app.openSheet(null);
  };

  const filtered = useMemo(() => {
    const t = query.trim().toLowerCase();
    if (!t) return CURRENCIES;
    return CURRENCIES.filter(
      (c) => c.code.toLowerCase().includes(t) || c.name.toLowerCase().includes(t),
    );
  }, [query]);

  return (
    <Sheet open={open} onClose={close} title="Currency">
      <div className="text-[13px] text-ink-faint -mt-1 mb-3">Prices are shown in your chosen currency.</div>
      <div
        className="flex items-center gap-2.5 bg-surface rounded-[13px] shadow-[inset_0_0_0_1.5px_var(--line)] mb-3.5"
        style={{ padding: '11px 13px' }}
      >
        <Icon name="search" size={18} color="var(--ink-faint)" stroke={2.2} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search currencies…"
          className="flex-1 bg-transparent outline-none border-none font-sans text-[15px]"
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} className="grid place-items-center">
            <Icon name="x" size={17} color="var(--ink-faint)" />
          </button>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {filtered.length === 0 && (
          <div className="text-center text-ink-faint text-sm py-8">No currencies match “{query}”.</div>
        )}
        {filtered.map((c) => {
          const on = c.code === app.currencyCode;
          return (
            <button
              key={c.code}
              type="button"
              onClick={() => {
                app.setCurrencyCode(c.code);
                close();
              }}
              className="text-left rounded-[14px] flex items-center gap-3"
              style={{
                padding: '13px 15px',
                background: on ? 'var(--accent-wash)' : 'var(--surface)',
                boxShadow: on ? 'inset 0 0 0 1.5px var(--accent)' : 'inset 0 0 0 1.5px var(--line)',
              }}
            >
              <span
                className="grid place-items-center bg-paper font-mono font-bold text-[15px] shrink-0 shadow-[inset_0_0_0_1px_var(--line)]"
                style={{ width: 38, height: 38, borderRadius: 10 }}
              >
                {c.symbol}
              </span>
              <span className="flex-1">
                <div className="font-bold text-[15px]">{c.name}</div>
                <div className="text-[12.5px] text-ink-faint font-mono">{c.code}</div>
              </span>
              {on && (
                <span className="grid place-items-center rounded-full bg-accent text-accent-on" style={{ width: 22, height: 22 }}>
                  <Icon name="check" size={14} stroke={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}

export function LocationSheet() {
  const app = useApp();
  const open = app.sheet === 'location';
  const close = () => app.openSheet(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const detect = () => {
    setBusy(true);
    setError('');
    let done = false;
    const finish = (city: string, cc?: string) => {
      if (done) return;
      done = true;
      app.setLocation(city);
      if (cc) app.setCurrencyCode(cc);
      setBusy(false);
      close();
    };
    const fail = (msg: string) => {
      if (done) return;
      done = true;
      setBusy(false);
      setError(msg);
    };

    if (!('geolocation' in navigator)) {
      fail('Location isn’t available on this device — pick a region below.');
      return;
    }

    // Hard ceiling in case the geolocation/geocoding never resolves.
    const timeout = setTimeout(() => fail('Couldn’t detect your location — pick a region below.'), 12000);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
          );
          if (!res.ok) throw new Error('geocode failed');
          const data = await res.json();
          const cityName =
            data.city || data.locality || data.principalSubdivision || data.countryName || 'Current location';
          const cc: string = data.countryCode || '';
          clearTimeout(timeout);
          finish(cc ? `${cityName}, ${cc}` : cityName, currencyForCountry(cc));
        } catch {
          clearTimeout(timeout);
          fail('Couldn’t look up your location — pick a region below.');
        }
      },
      () => {
        clearTimeout(timeout);
        fail('Location permission denied — pick a region below.');
      },
      { timeout: 10000, enableHighAccuracy: false, maximumAge: 60000 },
    );
  };

  // If the saved location isn't one of the preset regions (e.g. it was
  // auto-detected), surface it as a selected row so the user can see it.
  const customLocation =
    app.location && !REGIONS.some((r) => r.city === app.location) ? app.location : null;

  return (
    <Sheet open={open} onClose={close} title="Your location">
      <div className="text-[13.5px] text-ink-soft -mt-1 mb-4 leading-relaxed">
        We use your location to surface nearby stores and the right currency. It never leaves your device.
      </div>
      <button
        type="button"
        onClick={detect}
        disabled={busy}
        className="w-full rounded-2xl mb-4 flex items-center gap-3 bg-accent-wash shadow-[inset_0_0_0_1.5px_var(--accent)]"
        style={{ padding: 16 }}
      >
        <span className="grid place-items-center bg-accent text-accent-on shrink-0" style={{ width: 42, height: 42, borderRadius: 12 }}>
          <Icon name={busy ? 'globe' : 'scan'} size={21} stroke={2.2} className={busy ? 'animate-sl-spin' : undefined} />
        </span>
        <span className="text-left">
          <div className="font-bold text-[15.5px]">{busy ? 'Detecting…' : 'Detect automatically'}</div>
          <div className="text-[13px] text-ink-soft">Use my device location</div>
        </span>
      </button>
      {error && (
        <div className="text-[12.5px] -mt-2 mb-4" style={{ color: 'oklch(0.55 0.16 25)' }}>
          {error}
        </div>
      )}
      {customLocation && (
        <>
          <div className="font-mono text-[11px] tracking-[0.12em] text-ink-faint uppercase mb-2.5">Detected</div>
          <div
            className="text-left rounded-[13px] flex items-center gap-3 mb-4"
            style={{ padding: '12px 14px', background: 'var(--accent-wash)', boxShadow: 'inset 0 0 0 1.5px var(--accent)' }}
          >
            <Icon name="pin" size={17} color="var(--accent-ink)" stroke={2} />
            <span className="flex-1 font-semibold text-[14.5px]">{customLocation}</span>
            <span className="grid place-items-center rounded-full bg-accent text-accent-on" style={{ width: 22, height: 22 }}>
              <Icon name="check" size={14} stroke={3} />
            </span>
          </div>
        </>
      )}
      <div className="font-mono text-[11px] tracking-[0.12em] text-ink-faint uppercase mb-2.5">Or pick a region</div>
      <div className="flex flex-col gap-[7px]">
        {REGIONS.map((r) => {
          const on = app.location === r.city;
          return (
            <button
              key={r.city}
              type="button"
              onClick={() => {
                app.setLocation(r.city);
                app.setCurrencyCode(r.cc);
                close();
              }}
              className="text-left rounded-[13px] flex items-center gap-3"
              style={{
                padding: '12px 14px',
                background: on ? 'var(--accent-wash)' : 'var(--surface)',
                boxShadow: on ? 'inset 0 0 0 1.5px var(--accent)' : 'inset 0 0 0 1.5px var(--line)',
              }}
            >
              <Icon name="pin" size={17} color="var(--ink-soft)" stroke={2} />
              <span className="flex-1 font-semibold text-[14.5px]">{r.city}</span>
              <span className="text-[12px] text-ink-faint font-mono">{r.cc}</span>
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}

export function currencyChipLabel(code: string) {
  const c = getCurrencyByCode(code);
  return c ? `${c.symbol} ${c.code}` : code;
}
