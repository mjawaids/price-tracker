// Small shared pieces for the Compare screens and sheets.
import React from 'react';
import { useCompare } from '../../contexts/CompareContext';
import { CatalogProduct, CatalogStore } from '../../lib/compare/types';
import { freshness } from '../../lib/compare/describe';
import { AgeChip, Icon, StoreDot, Thumb } from '../ui';
import { productSizeText, splitStoreName, usePriced } from './compareHelpers';

/** A product with its best price at your stores. */
export function ProductRow({
  product,
  onClick,
  trailing,
  dim,
  selected,
  sub,
  age,
  plain,
}: {
  product: CatalogProduct;
  onClick?: () => void;
  trailing?: React.ReactNode;
  dim?: boolean;
  selected?: boolean;
  /** Replaces the default "Rs 210 at Imtiaz · 2 more stores" line. */
  sub?: React.ReactNode;
  /** When the price named on a custom `sub` line was seen (the default line uses the best price's). */
  age?: string | null;
  /** No price line: only `sub`, when given (no age chip). */
  plain?: boolean;
}) {
  const compare = useCompare();
  const priced = usePriced();
  const offers = priced(product.id);
  const best = offers[0];
  const size = productSizeText(product);
  const line =
    sub ??
    (best ? (
      <>
        {compare.fmt(best.price.price!)} at {best.store.name}
        {offers.length > 1 ? ` · ${offers.length - 1} more ${offers.length === 2 ? 'store' : 'stores'}` : ''}
      </>
    ) : (
      'No price at your stores yet'
    ));
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 text-left rounded-[16px] bg-surface transition-shadow ${dim ? 'opacity-70' : ''}`}
      style={{
        padding: 12,
        minHeight: 64,
        boxShadow: selected ? 'inset 0 0 0 2px var(--accent)' : 'inset 0 0 0 1.5px var(--line)',
      }}
      aria-pressed={selected}
    >
      <Thumb product={product} size={44} radius={12} />
      <span className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="font-bold text-[15px] leading-snug line-clamp-2">
          {product.name}
          {size && !product.name.toLowerCase().replace(/\s+/g, '').includes(size.toLowerCase().replace(/\s+/g, '')) && (
            <span className="font-semibold text-ink-soft"> · {size}</span>
          )}
        </span>
        {plain ? (
          sub && <span className="text-[12.5px] text-ink-soft">{sub}</span>
        ) : (
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="text-[12.5px] text-ink-soft truncate">{line}</span>
            {(sub ? age : best?.price.observedAt) && <AgeChip observedAt={sub ? age : best!.price.observedAt} />}
          </span>
        )}
      </span>
      {trailing}
    </button>
  );
}

/** A product with its cheapest price at any store in the city, and how many stores have it (Prices, search). */
export function PriceRow({ product, onClick }: { product: CatalogProduct; onClick?: () => void }) {
  const compare = useCompare();
  const priced = usePriced();
  const offers = priced(product.id, true);
  const best = offers[0];
  const size = productSizeText(product);
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 text-left rounded-[16px] bg-surface shadow-[inset_0_0_0_1.5px_var(--line)]"
      style={{ padding: 12, minHeight: 64 }}
    >
      <Thumb product={product} size={44} radius={12} />
      <span className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="font-bold text-[15px] leading-snug line-clamp-2">
          {product.name}
          {size && !product.name.toLowerCase().replace(/\s+/g, '').includes(size.toLowerCase().replace(/\s+/g, '')) && (
            <span className="font-semibold text-ink-soft"> · {size}</span>
          )}
        </span>
        <span className="text-[12.5px] text-ink-soft line-clamp-2">
          {best ? (
            <>
              {offers.length > 1 ? 'Cheapest at ' : 'At '}
              {splitStoreName(best.store.name).filter(Boolean).join(', ')} · {offers.length} {offers.length === 1 ? 'store' : 'stores'}
            </>
          ) : (
            'No price yet'
          )}
        </span>
      </span>
      {best && (
        <span className="shrink-0 flex flex-col items-end gap-1 text-right">
          <span className="flex flex-col items-end leading-none">
            {offers.length > 1 && <span className="text-[11px] font-semibold text-ink-soft mb-0.5">from</span>}
            <span className="font-mono font-bold text-[18px] tracking-[-0.02em] text-ink">{compare.fmt(best.price.price!)}</span>
          </span>
          <AgeChip observedAt={best.price.observedAt} />
        </span>
      )}
    </button>
  );
}

/**
 * A store's name with its kind dot. A shared shop's area ("Imtiaz · DHA Phase 6") goes
 * on its own line, since the area is what tells branches apart; long names wrap.
 */
export function StoreName({ store, className = '' }: { store: CatalogStore; className?: string }) {
  const [title, area] = splitStoreName(store.name);
  return (
    <span className={`inline-flex items-start gap-2 min-w-0 ${className}`}>
      <span className="shrink-0 flex items-center" style={{ height: '1.375em' }}>
        <StoreDot store={store} size={11} />
      </span>
      <span className="min-w-0 flex flex-col">
        <span className="leading-snug break-words">{title}</span>
        {area && <span className="text-[13px] font-semibold text-ink-soft leading-snug break-words">{area}</span>}
      </span>
    </span>
  );
}

/** "Prices from today · 1 from May" for a set of observation dates. */
export function FreshnessNote({ dates, onHelp }: { dates: string[]; onHelp?: () => void }) {
  if (!dates.length) return null;
  const labels = dates.map((d) => freshness(d));
  const old = labels.filter((l) => l.old);
  const fresh = labels.filter((l) => !l.old);
  const newestOld = old.length ? old[0].label : null;
  const text = fresh.length
    ? `Prices from ${fresh.some((l) => l.label === 'today') ? 'today' : 'the last few weeks'}${old.length ? ` · ${old.length} older (${newestOld})` : ''}`
    : `Prices are older than a month (${newestOld}) — they may have changed`;
  return (
    <div className={`flex items-center gap-2 text-[12.5px] ${fresh.length ? 'text-ink-soft' : 'text-warn-ink'}`}>
      <Icon name="history" size={15} stroke={2.2} className="shrink-0" />
      <span className="flex-1">{text}</span>
      {onHelp && (
        <button type="button" onClick={onHelp} aria-label="Where prices come from" className="grid place-items-center rounded-full shrink-0" style={{ width: 36, height: 36 }}>
          <Icon name="bulb" size={16} stroke={2.2} />
        </button>
      )}
    </div>
  );
}

/** Offline / not-live notices shared by Compare screens. */
export function CompareNotice({ icon, title, body, action }: { icon: string; title: string; body: string; action?: React.ReactNode }) {
  return (
    <div role="status" className="flex gap-3 items-start rounded-btn bg-accent-wash" style={{ padding: '13px 14px' }}>
      <span className="shrink-0 grid place-items-center rounded-[10px] bg-surface text-accent-ink" style={{ width: 34, height: 34 }}>
        <Icon name={icon} size={18} stroke={2.2} />
      </span>
      <span className="flex-1 flex flex-col gap-0.5">
        <span className="font-bold text-[14.5px]">{title}</span>
        <span className="text-[13.5px] leading-snug text-ink-soft">{body}</span>
        {action && <span className="mt-1.5">{action}</span>}
      </span>
    </div>
  );
}
