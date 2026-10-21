import { useMemo, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useCompare } from '../../contexts/CompareContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { CATEGORIES, resolveCategory } from '../../lib/categories';
import { Btn, Chip, Icon } from '../ui';
import { CompareNotice, PriceRow } from './compareParts';
import { sectionLabel, usePriced } from './compareHelpers';
import { RegionSheet } from './compareSheets';
import { SharedShopNotice } from './suggestSheet';

const MAX_SHOWN = 60;
const aisleOf = (category: string | null) => resolveCategory(category ?? undefined).id;

/** Compare home: what things cost in your city — the cheapest price for each product and how many stores have it. */
export default function PricesScreen() {
  const app = useApp();
  const compare = useCompare();
  const priced = usePriced();
  const { compact } = useBreakpoint();
  // null = All aisles.
  const [aisle, setAisle] = useState<string | null>(null);
  const [cityOpen, setCityOpen] = useState(false);
  const pad = compact ? '0 16px' : '0 28px';
  const city = compare.region?.name;

  // Products with a price at any store in the city (not a price people say is wrong),
  // the ones most stores carry first.
  const pricedProducts = useMemo(
    () =>
      compare.products
        .filter((p) => p.status === 'active')
        .map((p) => ({ p, stores: priced(p.id, true).length }))
        .filter((x) => x.stores > 0)
        .sort((a, b) => b.stores - a.stores || a.p.name.localeCompare(b.p.name))
        .map((x) => x.p),
    // priced reads the latest prices.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [compare.products, compare.resolveContext],
  );
  const aisles = useMemo(() => {
    const present = new Set(pricedProducts.map((p) => aisleOf(p.category)));
    return CATEGORIES.filter((c) => present.has(c.id));
  }, [pricedProducts]);
  const shown = useMemo(
    () => (aisle ? pricedProducts.filter((p) => aisleOf(p.category) === aisle) : pricedProducts).slice(0, MAX_SHOWN),
    [aisle, pricedProducts],
  );

  return (
    <div className="flex flex-col gap-4" style={{ paddingBottom: 28, maxWidth: compact ? '100%' : 860, margin: '0 auto', width: '100%' }}>
      <header style={{ padding: compact ? '16px 16px 0' : '24px 28px 0' }} className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <button type="button" onClick={() => setCityOpen(true)} className="inline-flex items-center gap-1 font-mono text-[11px] tracking-[0.14em] uppercase text-ink-soft" style={{ minHeight: 32 }}>
            <Icon name="pin" size={13} stroke={2.2} />
            {city ?? (compare.regionChosen ? 'Your city' : 'Choose your city')}
          </button>
          <h1 className="m-0 font-display font-extrabold tracking-[-0.02em]" style={{ fontSize: compact ? 28 : 32 }}>
            Prices
          </h1>
          <p className="m-0 mt-1 text-[14px] text-ink-soft">The cheapest price for each product, and how many stores have it.</p>
        </div>
        {compare.refreshing && <span className="text-[12.5px] text-ink-soft font-semibold">Updating…</span>}
      </header>

      <div className="flex flex-col gap-4" style={{ padding: pad }}>
        {!compare.online && <CompareNotice icon="wifiOff" title="You’re offline" body="Showing the prices saved on this device." />}
        <SharedShopNotice onOpen={(storeId) => app.tab('stores', { storeId })} />
        {compare.regionChosen && !compare.isLive && (
          <CompareNotice
            icon="globe"
            title={`Compare isn’t live in ${city ?? 'your city'} yet`}
            body="Add the stores you shop at and the prices you see — Where to buy works for you right away, and helps bring shared prices to your city."
          />
        )}

        <button
          type="button"
          onClick={() => app.go('search')}
          className="flex items-center gap-2.5 bg-surface rounded-[16px] text-ink-soft shadow-[inset_0_0_0_1.5px_var(--line)] text-left"
          style={{ height: 52, padding: '0 14px' }}
        >
          <Icon name="search" size={20} stroke={2.2} />
          <span className="text-[15.5px]">Search milk, rice, soap…</span>
        </button>

        {!compare.ready ? (
          <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading prices">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton rounded-[16px]" style={{ height: 68 }} />
            ))}
          </div>
        ) : !pricedProducts.length ? (
          <div className="flex flex-col items-center text-center gap-2 py-10 px-6">
            <span className="grid place-items-center bg-accent-wash text-accent-ink mb-2" style={{ width: 72, height: 72, borderRadius: 22 }}>
              <Icon name="tag" size={32} stroke={2} />
            </span>
            <h2 className="m-0 font-display font-extrabold text-[20px]">{city ? `No prices in ${city} yet` : 'No prices yet'}</h2>
            <p className="m-0 max-w-[300px] text-[14.5px] leading-relaxed text-ink-soft">
              {compare.consideredStores.length
                ? 'Add a price you’ve seen — it takes a few seconds and makes Where to buy work.'
                : 'Start with the stores you shop at.'}
            </p>
            <Btn className="mt-3" icon="plus" onClick={() => app.tab(compare.consideredStores.length ? 'contribute' : 'stores')}>
              {compare.consideredStores.length ? 'Add a price' : 'Add your stores'}
            </Btn>
          </div>
        ) : (
          <section className="flex flex-col gap-2.5" aria-labelledby="price-list">
            <h2 id="price-list" className={`m-0 ${sectionLabel}`}>
              {city ? `Prices in ${city}` : 'Prices'}
            </h2>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by aisle">
              <Chip active={aisle === null} onClick={() => setAisle(null)}>
                All
              </Chip>
              {aisles.map((c) => (
                <Chip key={c.id} active={aisle === c.id} onClick={() => setAisle((cur) => (cur === c.id ? null : c.id))}>
                  {c.name}
                </Chip>
              ))}
            </div>
            <div className="flex flex-col gap-2 mt-1">
              {shown.map((p) => (
                <PriceRow key={p.id} product={p} onClick={() => app.go('detail', { id: p.id })} />
              ))}
              {shown.length === MAX_SHOWN && <div className="text-[13px] text-ink-soft text-center py-2">Search to find more.</div>}
            </div>
          </section>
        )}

        <div className="flex items-center gap-3 rounded-[18px] bg-accent-wash" style={{ padding: 14 }}>
          <span className="flex-1 text-[14px] leading-relaxed">
            <strong>Spotted a price?</strong> Add it in a few taps{compare.isLive ? ` — it helps everyone in ${city}` : ''}.
          </span>
          <Btn size="sm" onClick={() => app.tab('contribute')}>
            Add price
          </Btn>
        </div>
      </div>
      <RegionSheet open={cityOpen} onClose={() => setCityOpen(false)} />
    </div>
  );
}
