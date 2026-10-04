import { useMemo, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useCompare } from '../../contexts/CompareContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { CATEGORIES, resolveCategory } from '../../lib/categories';
import { Btn, Chip, Icon } from '../ui';
import { CompareNotice, ProductRow } from './compareParts';
import { sectionLabel, usePriced } from './compareHelpers';
import { RegionSheet } from './compareSheets';

const MAX_AISLE = 60;
const aisleOf = (category: string | null) => resolveCategory(category ?? undefined).id;

/** Compare home: savings, search, your usuals, browse by aisle. */
export default function PricesScreen() {
  const app = useApp();
  const compare = useCompare();
  const priced = usePriced();
  const { compact } = useBreakpoint();
  const [aisle, setAisle] = useState<string | null>(null);
  const [cityOpen, setCityOpen] = useState(false);
  const pad = compact ? '0 16px' : '0 28px';

  // Products priced at your stores, per canonical category.
  const pricedProducts = useMemo(() => {
    const considered = new Set(compare.consideredStores.map((s) => s.id));
    return compare.products.filter((p) => compare.pricesFor(p.id).some((x) => considered.has(x.storeId) && x.isAvailable && x.price));
    // pricesFor reads the latest prices.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compare.products, compare.consideredStores, compare.resolveContext]);
  const aisles = useMemo(() => {
    const present = new Set(pricedProducts.map((p) => aisleOf(p.category)));
    return CATEGORIES.filter((c) => present.has(c.id));
  }, [pricedProducts]);
  const inAisle = useMemo(
    () => (aisle ? pricedProducts.filter((p) => aisleOf(p.category) === aisle).slice(0, MAX_AISLE) : []),
    [aisle, pricedProducts],
  );

  const usuals = useMemo(
    () =>
      [...compare.preferences.values()]
        .map((pref) => (pref.refProductId ? compare.productById(pref.refProductId) : undefined))
        .filter((p): p is NonNullable<typeof p> => !!p)
        .slice(0, 8),
    // productById reads the latest catalogue.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [compare.preferences, compare.products],
  );

  return (
    <div className="flex flex-col gap-4" style={{ paddingBottom: 28, maxWidth: compact ? '100%' : 860, margin: '0 auto', width: '100%' }}>
      <header style={{ padding: compact ? '16px 16px 0' : '24px 28px 0' }} className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <button type="button" onClick={() => setCityOpen(true)} className="inline-flex items-center gap-1 font-mono text-[11px] tracking-[0.14em] uppercase text-ink-soft" style={{ minHeight: 32 }}>
            <Icon name="pin" size={13} stroke={2.2} />
            {compare.region?.name ?? (compare.regionChosen ? 'Your city' : 'Choose your city')}
          </button>
          <h1 className="m-0 font-display font-extrabold tracking-[-0.02em]" style={{ fontSize: compact ? 28 : 32 }}>
            Prices
          </h1>
        </div>
        {compare.refreshing && <span className="text-[12.5px] text-ink-soft font-semibold">Updating…</span>}
      </header>

      <div className="flex flex-col gap-4" style={{ padding: pad }}>
        {!compare.online && <CompareNotice icon="wifiOff" title="You’re offline" body="Showing the prices saved on this device." />}
        {compare.regionChosen && !compare.isLive && (
          <CompareNotice
            icon="globe"
            title={`Compare isn’t live in ${compare.region?.name ?? 'your city'} yet`}
            body="Add the stores you shop at and the prices you see — Where to buy works for you right away, and helps bring shared prices to your city."
          />
        )}

        {compare.plansThisMonth > 0 && (
          <div className="bg-ink text-paper rounded-[22px] flex items-center gap-4" style={{ padding: '16px 18px' }}>
            <div className="flex-1">
              <div className="font-mono text-[11px] tracking-[0.14em] uppercase opacity-70">Saved this month</div>
              <div className="font-mono text-[30px] font-bold tracking-[-0.03em] mt-0.5">{compare.fmt(compare.savedThisMonth)}</div>
              <div className="text-[13px] opacity-75">
                across {compare.plansThisMonth} {compare.plansThisMonth === 1 ? 'plan' : 'plans'}
              </div>
            </div>
            <Icon name="spark" size={30} stroke={1.8} />
          </div>
        )}

        <button
          type="button"
          onClick={() => app.go('search')}
          className="flex items-center gap-2.5 bg-surface rounded-[16px] text-ink-soft shadow-[inset_0_0_0_1.5px_var(--line)] text-left"
          style={{ height: 52, padding: '0 14px' }}
        >
          <Icon name="search" size={20} stroke={2.2} />
          <span className="text-[15.5px]">Search milk, atta, Surf…</span>
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
            <h2 className="m-0 font-display font-extrabold text-[20px]">No prices at your stores yet</h2>
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
          <>
            {usuals.length > 0 && (
              <section className="flex flex-col gap-2" aria-labelledby="usuals">
                <h2 id="usuals" className={`m-0 ${sectionLabel}`}>
                  Your usuals, cheapest now
                </h2>
                <div className="flex flex-col gap-2">
                  {usuals.map((p) => {
                    const offers = priced(p.id);
                    return (
                      <ProductRow
                        key={p.id}
                        product={p}
                        onClick={() => app.go('detail', { id: p.id })}
                        trailing={
                          offers.length > 1 ? (
                            <span className="text-[12px] text-ink-soft shrink-0 text-right">
                              up to
                              <br />
                              <span className="font-mono font-bold">{compare.fmt(offers[offers.length - 1].price.price!)}</span>
                            </span>
                          ) : undefined
                        }
                      />
                    );
                  })}
                </div>
              </section>
            )}

            <section className="flex flex-col gap-2.5" aria-labelledby="aisles">
              <h2 id="aisles" className={`m-0 ${sectionLabel}`}>
                Browse by aisle
              </h2>
              <div className="flex flex-wrap gap-2">
                {aisles.map((c) => (
                  <Chip key={c.id} active={aisle === c.id} onClick={() => setAisle((cur) => (cur === c.id ? null : c.id))}>
                    {c.name}
                  </Chip>
                ))}
              </div>
              {aisle && (
                <div className="flex flex-col gap-2 mt-1">
                  {inAisle.map((p) => (
                    <ProductRow key={p.id} product={p} onClick={() => app.go('detail', { id: p.id })} />
                  ))}
                  {inAisle.length === MAX_AISLE && <div className="text-[13px] text-ink-soft text-center py-2">Search to find more.</div>}
                </div>
              )}
            </section>
          </>
        )}

        <div className="flex items-center gap-3 rounded-[18px] bg-accent-wash" style={{ padding: 14 }}>
          <span className="flex-1 text-[14px] leading-relaxed">
            <strong>Spotted a price?</strong> Add it in a few taps{compare.isLive ? ` — it helps everyone in ${compare.region?.name}` : ''}.
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
