// The first run on a new device (only while `settings.setupDone` is false): a short welcome,
// then the city we think you're in, with Change. The city decides the defaults: in a live
// city Compare prices is on (Where to buy, price checks, receipts); anywhere else the app
// is Lists only and Compare can be turned on in Profile. A device that already had
// settings never sees this (SettingsContext). Accounts older than a day skip the welcome.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useCompare } from '../../contexts/CompareContext';
import { useSettings } from '../../contexts/SettingsContext';
import { detectPlace, matchRegion, countryName, type Place } from '../../lib/geo';
import { currencyForCountry } from '../../utils/currency';
import { trackUserAction } from '../../utils/analytics';
import { CityList } from '../screens/compareSheets';
import { Btn, Icon, IconName, Sheet } from '../ui';

const DAY_MS = 24 * 60 * 60 * 1000;
/** How long to wait for the city list before going on without it (slow or no connection). */
const REGIONS_WAIT_MS = 6000;

interface Choice {
  /** A region id, or 'other' (a city without shared prices). */
  regionId: string;
  name: string;
  sub: string | null;
  live: boolean;
  /** Where shared prices aren't yet ("Dubai"); null = the person's own city, unnamed. */
  place: string | null;
}

function Point({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid place-items-center bg-surface shrink-0 shadow-[inset_0_0_0_1px_var(--line)]" style={{ width: 44, height: 44, borderRadius: 14 }}>
        <Icon name={icon} size={20} color="var(--accent-ink)" stroke={2.1} />
      </span>
      <div className="min-w-0">
        <div className="font-extrabold text-[15.5px]">{title}</div>
        <div className="text-[13.5px] text-ink-soft leading-snug">{body}</div>
      </div>
    </div>
  );
}

function Get({ icon, children }: { icon: IconName; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="shrink-0 mt-0.5">
        <Icon name={icon} size={18} color="var(--accent-ink)" stroke={2.1} />
      </span>
      <span className="text-[14.5px] leading-snug">{children}</span>
    </div>
  );
}

export default function FirstRun() {
  const { user } = useAuth();
  const compare = useCompare();
  const { settings, updateSettings } = useSettings();
  const newAccount = !user?.created_at || Date.now() - new Date(user.created_at).getTime() < DAY_MS;
  const [step, setStep] = useState<'welcome' | 'city'>(newAccount ? 'welcome' : 'city');
  const [place, setPlace] = useState<Place | null>(null);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [changed, setChanged] = useState(false);
  const [changing, setChanging] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let live = true;
    void detectPlace().then((p) => live && setPlace(p));
    return () => {
      live = false;
    };
  }, []);

  // The regions arrive with the catalogue's first refresh; offline on a new device there are
  // none, so after a while (or offline) it goes on without them: "My city isn't listed".
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setWaited(true), REGIONS_WAIT_MS);
    return () => clearTimeout(t);
  }, []);
  const regions = compare.regions;
  // No city list (offline on a new device): we can't tell whether a city has shared prices.
  const noRegions = regions.length === 0;
  const regionsKnown = !noRegions || compare.ready || !compare.online || waited;
  const ready = !!place && regionsKnown;

  const choiceFor = (regionId: string): Choice => {
    const r = regions.find((x) => x.id === regionId);
    if (r) return { regionId: r.id, name: r.name, sub: countryName(r.countryCode), live: r.status === 'live', place: r.name };
    return { regionId: 'other', name: 'Another city', sub: 'Lists work everywhere', live: false, place: null };
  };

  // What we think: a city we have, else the detected city or country (no shared prices there).
  const detected = useMemo<Choice | null>(() => {
    if (!ready || !place) return null;
    const r = matchRegion(regions, place);
    if (r) return choiceFor(r.id);
    const country = place.country;
    const haveCountry = !!country && regions.some((x) => x.countryCode.toUpperCase() === country);
    if (place.city && place.detected) return { regionId: 'other', name: place.city, sub: place.countryName, live: false, place: place.city };
    if (country && !haveCountry && place.countryName)
      return { regionId: 'other', name: place.countryName, sub: null, live: false, place: place.countryName };
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, place, regions]);
  const shown = choice ?? detected;

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const pick = (id: string) => {
    setChoice(choiceFor(id));
    setChanged(true);
    setChanging(false);
  };

  const finish = () => {
    const c = shown ?? choiceFor('other');
    const region = regions.find((r) => r.id === c.regionId);
    const live = region?.status === 'live';
    updateSettings({
      // Without the city list, leave the city unchosen: Profile → City asks later.
      regionId: region ? region.id : noRegions && !changed ? null : 'other',
      currency: region?.currency ?? currencyForCountry(place?.country ?? undefined),
      features: { ...settings.features, whereToBuy: live, askPrices: live, receipts: live },
      setupDone: true,
    });
    // Counts only: no city or country.
    if (typeof window.gtag !== 'undefined') trackUserAction('welcome_done', { live, detected: !!place?.detected, changed });
  };

  const stepLabel = newAccount ? <span className="font-mono text-[11px] font-bold tracking-[0.12em] text-ink-soft">STEP 2 OF 2</span> : null;

  return (
    <div className="fixed inset-0 z-[60] bg-paper text-ink overflow-y-auto">
      {step === 'welcome' ? (
        <main aria-labelledby="fr-title" className="relative min-h-full flex flex-col mx-auto w-full max-w-[440px] px-6 safe-top" style={{ paddingTop: 64, paddingBottom: 32 }}>
          <div aria-hidden className="absolute bg-accent-wash rounded-full" style={{ top: -120, right: -100, width: 320, height: 320 }} />
          <div className="relative flex-1 flex flex-col">
            <div className="inline-flex items-center gap-2.5">
              <span className="grid place-items-center bg-accent text-accent-on" style={{ width: 38, height: 38, borderRadius: 12 }}>
                <Icon name="tag" size={21} stroke={2.4} />
              </span>
              <span className="font-display font-extrabold text-[23px] tracking-[-0.03em]">SpendLess</span>
            </div>
            <h1
              id="fr-title"
              ref={headingRef}
              tabIndex={-1}
              className="m-0 mt-10 font-display font-extrabold tracking-[-0.035em] leading-[1.02] text-[40px] outline-none"
            >
              Your shopping list,
              <br />
              <span className="text-accent-ink">sorted.</span>
            </h1>
            <p className="m-0 mt-4 text-[16px] leading-relaxed text-ink-soft">Type “2 milk” and go. It works offline, and ticks off as you shop.</p>
            <div className="mt-7 flex flex-col gap-4">
              <Point icon="lists" title="Quick lists" body="No brands or sizes needed. Items find their aisle." />
              <Point icon="tag" title="Where to buy" body="In cities with shared prices: the cheapest stores for your whole list." />
              <Point icon="cloud" title="Works offline" body="Add and tick items anywhere. It syncs when you’re back." />
            </div>
            <div className="flex-1 min-h-8" />
            <Btn full size="lg" onClick={() => setStep('city')}>
              Get started
            </Btn>
            <div className="mt-2 text-center text-[12.5px] text-ink-soft">Step 1 of 2</div>
          </div>
        </main>
      ) : (
        <main aria-labelledby="fr-title" className="min-h-full flex flex-col mx-auto w-full max-w-[440px] px-5 safe-top" style={{ paddingTop: 64, paddingBottom: 32 }}>
          {stepLabel}
          {!ready ? (
            <>
              <h1 id="fr-title" ref={headingRef} tabIndex={-1} className="m-0 mt-2.5 font-display font-extrabold text-[30px] tracking-[-0.03em] outline-none">
                Finding your city…
              </h1>
              <div aria-hidden className="mt-3.5 rounded-[18px] bg-surface shadow-[inset_0_0_0_1.5px_var(--line)] animate-pulse" style={{ height: 76 }} />
            </>
          ) : shown ? (
            <>
              <h1 id="fr-title" ref={headingRef} tabIndex={-1} className="m-0 mt-2.5 font-display font-extrabold text-[30px] tracking-[-0.03em] outline-none">
                {changed ? 'Your city' : 'You’re in'}
              </h1>
              <div className="mt-3.5 flex items-center gap-3 rounded-[18px] bg-surface shadow-[inset_0_0_0_1.5px_var(--line)]" style={{ padding: 16 }}>
                <span className="grid place-items-center bg-accent-wash shrink-0" style={{ width: 44, height: 44, borderRadius: 14 }}>
                  <Icon name="pin" size={22} color="var(--accent-ink)" stroke={2.1} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display font-extrabold text-[24px] tracking-[-0.02em] leading-tight break-words">{shown.name}</span>
                    {shown.live && (
                      <span className="text-[11px] font-extrabold rounded-full bg-accent text-accent-on" style={{ padding: '3px 8px' }}>
                        LIVE
                      </span>
                    )}
                  </div>
                  {shown.sub && <div className="text-[13.5px] text-ink-soft">{shown.sub}</div>}
                </div>
                <button
                  type="button"
                  onClick={() => setChanging(true)}
                  className="shrink-0 rounded-full bg-surface shadow-[inset_0_0_0_1.5px_var(--line)] font-bold text-[14px]"
                  style={{ minHeight: 44, padding: '0 14px' }}
                >
                  Change
                </button>
              </div>
              <div className="mt-6 mb-2.5 font-mono text-[11px] font-bold tracking-[0.12em] text-ink-soft">WHAT YOU GET</div>
              <div className="flex flex-col gap-3">
                <Get icon="lists">Quick lists that work offline</Get>
                {shown.live ? (
                  <>
                    <Get icon="tag">
                      <b>Where to buy</b>: the cheapest stores for your whole list, delivery fees included
                    </Get>
                    <Get icon="check">Prices from online stores, updated daily, and from people who shop here</Get>
                  </>
                ) : noRegions ? (
                  <Get icon="tag">
                    To compare prices at stores, turn on <b>Compare prices</b> in Profile once you’re online.
                  </Get>
                ) : (
                  <Get icon="tag">
                    Shared prices aren’t in {shown.place ?? 'your city'} yet. To compare stores you add yourself, turn on{' '}
                    <b>Compare prices</b> in Profile.
                  </Get>
                )}
              </div>
            </>
          ) : (
            <>
              <h1 id="fr-title" ref={headingRef} tabIndex={-1} className="m-0 mt-2.5 font-display font-extrabold text-[30px] tracking-[-0.03em] outline-none">
                Where do you shop?
              </h1>
              <p className="m-0 mt-2 mb-4 text-[15px] leading-relaxed text-ink-soft">Prices are shared in some cities. Everywhere else, SpendLess is your list.</p>
              <CityList value={null} onPick={pick} otherLabel="My city isn’t listed" />
            </>
          )}
          <div className="flex-1 min-h-8" />
          <Btn full size="lg" onClick={finish} disabled={!ready}>
            Start my first list
          </Btn>
          {ready && shown && place?.detected && !changed && (
            <div className="mt-2.5 text-center text-[12.5px] text-ink-soft">Found from your connection. Not right? Tap Change.</div>
          )}
        </main>
      )}
      <Sheet open={changing} onClose={() => setChanging(false)} title="Your city">
        <p className="m-0 -mt-1 mb-4 text-[13.5px] leading-relaxed text-ink-soft">Shared prices are live in some cities. Lists work everywhere.</p>
        <CityList value={shown?.regionId ?? null} onPick={pick} otherLabel="My city isn’t listed" />
      </Sheet>
    </div>
  );
}
