import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useCompare } from '../../contexts/CompareContext';
import { tokens } from '../../lib/compare/itemTypes';
import { CatalogProduct } from '../../lib/compare/types';
import { Btn, Icon, Toast } from '../ui';
import { ManageHeader, TextIn } from './manageParts';
import { ProductRow } from './compareParts';
import { PriceSheet } from './compareSheets';
import { ProductFormSheet } from './productSheet';

/** Compare → Contribute → Your products: private products only you see. */
export function ManageProducts() {
  const app = useApp();
  const compare = useCompare();
  const [form, setForm] = useState<'new' | CatalogProduct | null>(null);
  const [pricing, setPricing] = useState<CatalogProduct | null>(null);
  const [q, setQ] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  const own = useMemo(() => compare.products.filter((p) => p.ownerId), [compare.products]);
  const shown = useMemo(() => {
    const words = tokens(q);
    if (!words.length) return own;
    return own.filter((p) => {
      const have = tokens(`${p.name} ${p.brand ?? ''}`);
      return words.every((w) => have.some((x) => x.startsWith(w)));
    });
  }, [own, q]);

  return (
    <div className="pb-8">
      <ManageHeader
        kicker="Contribute"
        title="Your products"
        sub={compare.ready ? `${own.length} ${own.length === 1 ? 'product' : 'products'} · only you see these` : undefined}
        action={
          <div className="flex items-center gap-2">
            {app.canGoBack && (
              <Btn size="sm" variant="ghost" onClick={app.back}>
                Done
              </Btn>
            )}
            <Btn size="sm" icon="plus" onClick={() => setForm('new')} disabled={!compare.online}>
              Add
            </Btn>
          </div>
        }
      />
      <div className="flex flex-col gap-3 px-[18px] md:px-7 max-w-full md:max-w-[860px] mx-auto">
        {own.length > 8 && (
          <div>
            <label htmlFor="own-search" className="sr-only">
              Search your products
            </label>
            <TextIn id="own-search" type="search" value={q} maxLength={60} onChange={(e) => setQ(e.target.value)} placeholder="Search your products" />
          </div>
        )}
        {!compare.ready ? (
          <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading products">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton rounded-[16px]" style={{ height: 68 }} />
            ))}
          </div>
        ) : !own.length ? (
          <div className="flex flex-col items-center text-center gap-2 py-10 px-6">
            <span className="grid place-items-center bg-accent-wash text-accent-ink mb-2" style={{ width: 72, height: 72, borderRadius: 22 }}>
              <Icon name="box" size={32} stroke={2} />
            </span>
            <h2 className="m-0 font-display font-extrabold text-[20px]">Nothing of your own yet</h2>
            <p className="m-0 max-w-[310px] text-[14.5px] leading-relaxed text-ink-soft">
              Can’t find something you buy? Add it here, then add its price at your stores.
            </p>
            <Btn className="mt-3" icon="plus" onClick={() => setForm('new')} disabled={!compare.online}>
              Add a product
            </Btn>
          </div>
        ) : !shown.length ? (
          <div className="text-center text-ink-soft text-[14px] py-8">No matches for “{q}”.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {shown.map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <ProductRow product={p} onClick={() => setForm(p)} />
                </div>
                <button
                  type="button"
                  onClick={() => setPricing(p)}
                  aria-label={`Add a price for ${p.name}`}
                  className="grid place-items-center rounded-[14px] bg-accent-wash text-accent-ink shrink-0"
                  style={{ width: 48, height: 48 }}
                >
                  <Icon name="tag" size={18} stroke={2.2} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <ProductFormSheet target={form} onClose={() => setForm(null)} onSaved={(p) => (form === 'new' ? setPricing(p) : undefined)} />
      <PriceSheet product={pricing} onClose={() => setPricing(null)} onDone={setToast} />
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50" style={{ width: 'min(440px, calc(100vw - 32px))' }}>
          <Toast message={toast} icon="check" onDismiss={() => setToast(null)} />
        </div>
      )}
    </div>
  );
}
