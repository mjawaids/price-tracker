import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { CURRENCIES, getCurrencyByCode } from '../../utils/currency';
import { Icon, Sheet } from '../ui';

const REGIONS: { city: string; cc: string }[] = [
  { city: 'San Francisco, CA', cc: 'USD' },
  { city: 'London, UK', cc: 'GBP' },
  { city: 'Mumbai, IN', cc: 'INR' },
  { city: 'Toronto, CA', cc: 'CAD' },
  { city: 'Sydney, AU', cc: 'AUD' },
  { city: 'Berlin, DE', cc: 'EUR' },
  { city: 'Dubai, AE', cc: 'AED' },
];

export function CurrencySheet() {
  const app = useApp();
  const open = app.sheet === 'currency';
  const close = () => app.openSheet(null);
  return (
    <Sheet open={open} onClose={close} title="Currency">
      <div className="text-[13px] text-ink-faint -mt-1 mb-3.5">Prices are shown in your chosen currency.</div>
      <div className="flex flex-col gap-2">
        {CURRENCIES.map((c) => {
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

  const detect = () => {
    setBusy(true);
    let done = false;
    const finish = (city: string) => {
      if (done) return;
      done = true;
      app.setLocation(city);
      setBusy(false);
      close();
    };
    const fallback = setTimeout(() => finish('San Francisco, CA'), 1400);
    try {
      navigator.geolocation.getCurrentPosition(
        () => {
          clearTimeout(fallback);
          finish('San Francisco, CA');
        },
        () => {
          clearTimeout(fallback);
          finish('San Francisco, CA');
        },
        { timeout: 1200 },
      );
    } catch {
      /* fallback handles it */
    }
  };

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
