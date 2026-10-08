import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useCompare } from '../../contexts/CompareContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { tokens } from '../../lib/compare/itemTypes';
import { CatalogProduct } from '../../lib/compare/types';
import { useReceipt } from '../../lib/receipt/session';
import { Icon, Toast } from '../ui';
import { ManageHeader } from './manageParts';
import { useContributionStats } from './contributionHelpers';
import { CompareNotice, ProductRow } from './compareParts';
import { sectionLabel } from './compareHelpers';
import { PriceSheet } from './compareSheets';
import { ProductFormSheet } from './productSheet';

const MAX_RESULTS = 30;

/** Compare → Contribute: add prices you've seen and products the catalogue lacks. */
export default function ContributeScreen() {
  const app = useApp();
  const compare = useCompare();
  const { settings } = useSettings();
  const receipt = useReceipt();
  const { compact } = useBreakpoint();
  const [q, setQ] = useState('');
  const [pricing, setPricing] = useState<CatalogProduct | null>(null);
  const [newProduct, setNewProduct] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  const results = useMemo(() => {
    const words = tokens(q);
    if (!words.length) return [];
    return [...compare.resolveContext.profiles.values()]
      .filter((p) => {
        const have = [...p.words, ...(p.itemType ? tokens(p.itemType) : [])];
        return words.every((w) => have.some((x) => x.startsWith(w)));
      })
      .slice(0, MAX_RESULTS)
      .map((p) => p.product);
  }, [q, compare.resolveContext]);

  const own = compare.products.filter((p) => p.ownerId).length;
  const receiptsOn = settings.features.receipts;
  const receiptWaiting = receiptsOn && (receipt.step.name === 'reading' || receipt.step.name === 'review');
  // Your contributions: totals from the database when online, else this device's last 30 days.
  const { stats } = useContributionStats();
  const count = stats ? stats.month : compare.recentReports;
  const cardSub = stats
    ? stats.total
      ? [`${stats.shared} shared`, stats.held ? `${stats.held} only you for now` : '', stats.private ? `${stats.private} private` : ''].filter(Boolean).join(' · ')
      : 'None yet — add your first price below'
    : compare.recentReports
      ? 'Thank you — see where they stand'
      : 'None yet — add your first price below';

  return (
    <div className="pb-8" style={{ maxWidth: compact ? '100%' : 860, margin: '0 auto' }}>
      <ManageHeader title="Contribute" />
      <div className="flex flex-col gap-4 px-[18px] md:px-7">
        <button
          type="button"
          onClick={() => app.go('contributions')}
          className="flex items-center gap-3.5 text-left rounded-[20px] bg-ink text-paper transition-transform active:scale-[0.99]"
          style={{ padding: '14px 16px', minHeight: 76 }}
        >
          {count > 0 && (
            <>
              <span className="flex flex-col items-start shrink-0">
                <span className="font-mono text-[28px] font-bold tracking-[-0.04em] leading-none">{count}</span>
                <span className="text-[11.5px] mt-1" style={{ color: 'var(--coach-muted)' }}>
                  {stats ? 'this month' : 'lately'}
                </span>
              </span>
              <span aria-hidden className="self-stretch" style={{ width: 1, background: 'var(--coach-chip)' }} />
            </>
          )}
          <span className="flex-1 min-w-0">
            <span className="block font-extrabold text-[15.5px]">Your contributions</span>
            <span className="block text-[12.5px] leading-snug" style={{ color: 'var(--coach-muted)' }}>
              {cardSub}
            </span>
          </span>
          <Icon name="chevR" size={18} stroke={2.4} />
        </button>
        {!compare.online && <CompareNotice icon="wifiOff" title="You’re offline" body="Adding prices and products needs a connection." />}

        <section className="flex flex-col gap-2.5 bg-surface rounded-[22px] shadow-card" style={{ padding: 16 }} aria-labelledby="add-price">
          <div className="flex items-center gap-3">
            <span className="grid place-items-center rounded-[12px] bg-accent text-accent-on shrink-0" style={{ width: 40, height: 40 }}>
              <Icon name="tag" size={20} stroke={2.2} />
            </span>
            <div className="min-w-0">
              <h2 id="add-price" className="m-0 font-display font-extrabold text-[18px]">
                Add a price
              </h2>
              <p className="m-0 text-[13px] text-ink-soft">
                {compare.isLive ? `Seen a price? It updates Where to buy for everyone in ${compare.region?.name}.` : 'Seen a price? It makes Where to buy work for you.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 bg-paper rounded-[14px] shadow-[inset_0_0_0_1.5px_var(--line)]" style={{ padding: '0 12px', height: 50 }}>
            <Icon name="search" size={19} color="var(--ink-soft)" stroke={2.2} />
            <label htmlFor="contribute-search" className="sr-only">
              Find the product
            </label>
            <input
              id="contribute-search"
              type="search"
              value={q}
              maxLength={60}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Find the product — e.g. Dawn bread"
              className="flex-1 min-w-0 bg-transparent outline-none border-none font-sans text-base"
            />
          </div>
          {q.trim() && (
            <div className="flex flex-col gap-2">
              {results.map((p) => (
                <ProductRow key={p.id} product={p} onClick={() => setPricing(p)} />
              ))}
              <button
                type="button"
                onClick={() => setNewProduct(q.trim())}
                disabled={!compare.online}
                className="flex items-center gap-3 text-left rounded-[16px] text-accent-ink font-bold text-[14.5px] shadow-[inset_0_0_0_1.5px_var(--line)] disabled:opacity-40"
                style={{ padding: '12px 14px', minHeight: 56 }}
              >
                <Icon name="plus" size={18} stroke={2.4} />
                <span className="min-w-0 line-clamp-2">
                  {results.length ? 'Not here? ' : 'No match. '}Add “{q.trim()}” as your product
                </span>
              </button>
            </div>
          )}
        </section>

        <h2 className={`m-0 mt-1 ${sectionLabel}`}>Also</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => app.go('mproducts')}
            className="flex items-center gap-3 text-left bg-surface rounded-[18px] shadow-[inset_0_0_0_1.5px_var(--line)]"
            style={{ padding: 14, minHeight: 72 }}
          >
            <Icon name="box" size={22} stroke={2} color="var(--accent-ink)" />
            <span className="flex-1 min-w-0">
              <span className="block font-bold text-[15px]">Your products</span>
              <span className="block text-[12.5px] text-ink-soft">{own ? `${own} only you see` : 'Things the catalogue doesn’t have'}</span>
            </span>
            <Icon name="chevR" size={17} stroke={2.2} color="var(--ink-soft)" />
          </button>
          <button
            type="button"
            onClick={() => app.tab('stores')}
            className="flex items-center gap-3 text-left bg-surface rounded-[18px] shadow-[inset_0_0_0_1.5px_var(--line)]"
            style={{ padding: 14, minHeight: 72 }}
          >
            <Icon name="store" size={22} stroke={2} color="var(--accent-ink)" />
            <span className="flex-1 min-w-0">
              <span className="block font-bold text-[15px]">Your stores</span>
              <span className="block text-[12.5px] text-ink-soft">Add a shop or delivery app</span>
            </span>
            <Icon name="chevR" size={17} stroke={2.2} color="var(--ink-soft)" />
          </button>
          <button
            type="button"
            onClick={() => (receiptsOn ? app.go('receipt') : app.openSection('profile'))}
            className="flex items-center gap-3 text-left bg-surface rounded-[18px] shadow-[inset_0_0_0_1.5px_var(--line)] md:col-span-2"
            style={{ padding: 14, minHeight: 72 }}
          >
            <Icon name="receipt" size={22} stroke={2} color={receiptsOn ? 'var(--accent-ink)' : 'var(--ink-soft)'} />
            <span className="flex-1 min-w-0">
              <span className="block font-bold text-[15px]">{receiptWaiting ? 'Finish your receipt' : 'Add a receipt'}</span>
              <span className="block text-[12.5px] text-ink-soft">
                {!receiptsOn
                  ? 'Turned off — switch it on in Profile → Shopping features'
                  : receipt.step.name === 'reading'
                    ? 'Reading it now…'
                    : receiptWaiting
                      ? 'It’s waiting for you to check the prices'
                      : 'A whole shop’s prices from a screenshot, PDF, photo or text — read on your device'}
              </span>
            </span>
            <Icon name="chevR" size={17} stroke={2.2} color="var(--ink-soft)" />
          </button>
        </div>

        <p className="m-0 text-[12.5px] leading-relaxed text-ink-soft">
          Prices at shared stores are shared without your name. A price far from the usual one is used for you only until someone else sees the same. Your own stores and products stay private, unless you share a shop.
        </p>
      </div>

      <PriceSheet product={pricing} onClose={() => setPricing(null)} onDone={setToast} />
      <ProductFormSheet
        target={newProduct != null ? 'new' : null}
        initialName={newProduct ?? ''}
        onClose={() => setNewProduct(null)}
        onSaved={(p) => {
          setQ('');
          setPricing(p);
        }}
      />
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50" style={{ width: 'min(440px, calc(100vw - 32px))' }}>
          <Toast message={toast} icon="check" onDismiss={() => setToast(null)} />
        </div>
      )}
    </div>
  );
}
