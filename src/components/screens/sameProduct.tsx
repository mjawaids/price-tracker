// "Same product, different names" on a product page: the names stores also sell it
// under ("Also sold as", with *Not the same product?*), the user's own reports, and
// *Same as another product?* (SameProductSheet). Reports go to duplicate_reports; the
// nightly job (scripts/seed/merge-products.ts) joins or splits products once enough
// people agree. The copy never says how many people that is.
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useCompare } from '../../contexts/CompareContext';
import type { DuplicateResult } from '../../contexts/CompareContext';
import type { DuplicateReport } from '../../lib/compare/api';
import { fetchDuplicateReports, fetchMergedInto } from '../../lib/compare/api';
import { typeFamily } from '../../lib/compare/itemTypes';
import { brandId, nameWords } from '../../lib/compare/productName';
import type { CatalogProduct } from '../../lib/compare/types';
import { productSize, similarSize } from '../../lib/compare/units';
import { Btn, Icon, Sheet } from '../ui';
import { ProductRow } from './compareParts';
import { sectionLabel } from './compareHelpers';
import { StoreSearch } from './storePicker';

const SUGGESTED = 20;
const FOUND = 30;

/** What a report's outcome tells the user. */
function resultMessage(r: DuplicateResult, kind: DuplicateReport['kind']): string {
  if (typeof r === 'object') {
    return kind === 'same' ? 'Thanks — we’ll join them once enough people agree' : 'Thanks — we’ll split them again once enough people agree';
  }
  if (r === 'already') return 'You’ve already told us — thanks';
  if (r === 'limit') return 'That’s a lot of reports for one day — try again tomorrow';
  if (r === 'gone') return 'One of these products has changed meanwhile — open it again and retry';
  if (r === 'offline') return 'You’re offline — try again when you’re back online';
  return 'Couldn’t send — try again';
}

/**
 * How alike two products' names are: shared words over all words (0 up to a third,
 * so a shared brand alone never makes a match), plus a little for the same brand.
 */
function likeness(a: CatalogProduct, b: CatalogProduct): number {
  const wa = new Set(nameWords(a.name, [a.brand, b.brand]));
  const wb = nameWords(b.name, [a.brand, b.brand]);
  if (!wa.size || !wb.length) return 0;
  const shared = wb.filter((w) => wa.has(w)).length;
  const words = shared / (wa.size + wb.length - shared);
  if (words <= 1 / 3) return 0;
  const sameBrand = !!a.brand && !!b.brand && brandId(a.brand) === brandId(b.brand);
  return words + (sameBrand ? 0.5 : 0);
}

export function SameProductSection({ product, onToast }: { product: CatalogProduct; onToast: (message: string) => void }) {
  const app = useApp();
  const compare = useCompare();
  const [merged, setMerged] = useState<CatalogProduct[]>([]);
  const [reports, setReports] = useState<DuplicateReport[]>([]);
  const [picking, setPicking] = useState(false);
  const [notSame, setNotSame] = useState<CatalogProduct | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const shared = !product.ownerId && product.status === 'active';
  const sameReports = useMemo(() => reports.filter((r) => r.kind === 'same'), [reports]);
  // Products already named here aren't offered again.
  const exclude = useMemo(
    () => new Set([...merged.map((m) => m.id), ...sameReports.flatMap((r) => [r.productId, r.otherId])]),
    [merged, sameReports],
  );

  useEffect(() => {
    setMerged([]);
    setReports([]);
    if (!shared || !compare.online) return;
    let live = true;
    Promise.all([fetchMergedInto(product.id), fetchDuplicateReports(product.id)])
      .then(([m, r]) => {
        if (!live) return;
        setMerged(m);
        setReports(r);
      })
      .catch((error) => console.error('Loading other names failed:', error instanceof Error ? error.message : error));
    return () => {
      live = false;
    };
  }, [product.id, shared, compare.online]);

  if (!shared) return null;

  const notSameReport = (other: CatalogProduct) =>
    reports.find((r) => r.kind === 'not_same' && ((r.productId === other.id && r.otherId === product.id) || (r.productId === product.id && r.otherId === other.id)));

  const undo = async (r: DuplicateReport) => {
    setBusy(r.id);
    const ok = await compare.withdrawDuplicate(r.id);
    setBusy(null);
    if (!ok) return onToast('Couldn’t undo — try again');
    setReports((cur) => cur.filter((x) => x.id !== r.id));
    onToast('Done — your report is withdrawn');
  };

  const sentNotSame = (r: DuplicateReport) => setReports((cur) => [...cur, r]);

  return (
    <section className="mt-6" aria-labelledby="same-product-title">
      <div className="flex items-center gap-1">
        <h2 id="same-product-title" className={`m-0 flex-1 ${sectionLabel}`}>
          {merged.length ? 'Also sold as' : 'Same product, other names'}
        </h2>
        <button
          type="button"
          onClick={() => app.openSheet('help', 'same-product')}
          aria-label="How products with different names are joined"
          className="grid place-items-center rounded-full text-ink-soft"
          style={{ width: 40, height: 40 }}
        >
          <Icon name="bulb" size={18} stroke={2.2} />
        </button>
      </div>
      {merged.length > 0 && (
        <div className="mt-1.5 flex flex-col gap-2">
          {merged.map((m) => {
            const said = notSameReport(m);
            return (
              <div key={m.id} className="rounded-2xl bg-surface shadow-[inset_0_0_0_1px_var(--line)] flex items-center gap-2.5" style={{ padding: '10px 12px 10px 14px' }}>
                <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <span className="text-[14px] leading-snug line-clamp-2">{m.name}</span>
                  {said && <span className="text-[12px] text-ink-soft">You said they’re different</span>}
                </span>
                {said ? (
                  <Btn size="sm" variant="ghost" icon="undo" onClick={() => void undo(said)} disabled={!compare.online || busy === said.id} className="shrink-0 whitespace-nowrap">
                    Undo
                  </Btn>
                ) : (
                  <Btn size="sm" variant="ghost" onClick={() => setNotSame(m)} disabled={!compare.online} className="shrink-0 whitespace-nowrap">
                    Not the same?
                  </Btn>
                )}
              </div>
            );
          })}
        </div>
      )}
      {sameReports.length > 0 && (
        <div className="mt-2 flex flex-col gap-2">
          {sameReports.map((r) => {
            const other = compare.productById(r.productId === product.id ? r.otherId : r.productId);
            return (
              <div key={r.id} className="flex items-center gap-2.5 text-[13px] text-ink-soft">
                <Icon name="checkCircle" size={16} stroke={2.2} className="shrink-0" />
                <span className="flex-1 min-w-0 leading-snug line-clamp-2">
                  You said it’s the same as <strong className="text-ink">{other?.name ?? 'another product'}</strong>
                </span>
                <Btn size="sm" variant="ghost" onClick={() => void undo(r)} disabled={!compare.online || busy === r.id} className="shrink-0">
                  Undo
                </Btn>
              </div>
            );
          })}
        </div>
      )}
      <p className="m-0 mt-2 text-[12.5px] leading-relaxed text-ink-soft">
        {merged.length
          ? 'Stores’ other names for this product. Their prices count here.'
          : 'Another store sells this under a different name? Tell us, and their prices will count for one product.'}
      </p>
      <Btn variant="ghost" full icon="list" className="mt-2.5" onClick={() => setPicking(true)} disabled={!compare.online}>
        Same as another product?
      </Btn>
      {picking && (
        <SameProductSheet
          product={product}
          exclude={exclude}
          onClose={() => setPicking(false)}
          onDone={(message, row) => {
            if (row) setReports((cur) => [...cur, row]);
            onToast(message);
          }}
        />
      )}
      <NotSameSheet product={product} other={notSame} onClose={() => setNotSame(null)} onDone={(message, row) => {
        if (row) sentNotSame(row);
        onToast(message);
      }} />
    </section>
  );
}

/** Pick the product that's the same thing under another name. */
function SameProductSheet({
  product,
  exclude,
  onClose,
  onDone,
}: {
  product: CatalogProduct;
  exclude: Set<string>;
  onClose: () => void;
  onDone: (message: string, row: DuplicateReport | null) => void;
}) {
  const compare = useCompare();
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<CatalogProduct | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const size = productSize(product);

  // Shared products of the same kind and a similar size, the most alike first.
  const suggested = useMemo(() => {
    const family = product.itemType ? typeFamily(product.itemType) : null;
    return compare.products
      .filter(
        (x) =>
          x.id !== product.id && !x.ownerId && x.status === 'active' && !exclude.has(x.id) &&
          (!family || !x.itemType || family.has(x.itemType)) &&
          (!size || !productSize(x) || similarSize(size, productSize(x))),
      )
      .map((x) => ({ x, score: likeness(product, x) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, SUGGESTED)
      .map((r) => r.x);
  }, [compare.products, product, exclude, size]);

  const found = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter((w) => w.length >= 2);
    if (!words.length) return null;
    return compare.products
      .filter((x) => x.id !== product.id && !x.ownerId && x.status === 'active' && !exclude.has(x.id) && words.every((w) => x.name.toLowerCase().includes(w)))
      .map((x) => ({ x, score: likeness(product, x) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, FOUND)
      .map((r) => r.x);
  }, [compare.products, product, exclude, query]);

  const rows = found ?? suggested;

  const save = async () => {
    if (!picked) {
      setError('Pick the product that’s the same.');
      return;
    }
    setSaving(true);
    setError('');
    const r = await compare.reportDuplicate('same', product.id, picked.id);
    setSaving(false);
    if (r === 'offline' || r === 'error' || r === 'limit') {
      setError(resultMessage(r, 'same'));
      return;
    }
    onDone(resultMessage(r, 'same'), typeof r === 'object' ? r.ok : null);
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="Same as another product?"
      footer={
        <Btn full size="lg" onClick={() => void save()} disabled={saving || !picked || !compare.online}>
          {saving ? 'Sending…' : 'These are the same product'}
        </Btn>
      }
    >
      <p className="m-0 mb-3 text-[13.5px] leading-relaxed text-ink-soft">
        Pick the product that’s <strong className="text-ink">{product.name}</strong> under another name — the same brand, size and flavour. Once enough people agree, we join them.
      </p>
      <StoreSearch id="same-product-search" value={query} onChange={setQuery} label="Search products by name" />
      <div className={`mt-3.5 mb-2 ${sectionLabel}`}>{found ? 'Found' : 'Looks similar'}</div>
      {rows.length ? (
        <div className="flex flex-col gap-2" role="list">
          {rows.map((x) => (
            <div role="listitem" key={x.id}>
              <ProductRow product={x} selected={picked?.id === x.id} onClick={() => setPicked(picked?.id === x.id ? null : x)} />
            </div>
          ))}
        </div>
      ) : (
        <p className="m-0 text-[13px] leading-relaxed text-ink-soft">
          {found ? 'Nothing by that name in your city.' : 'Nothing similar here. Search for it by name.'}
        </p>
      )}
      {error && (
        <div role="alert" className="text-[13px] mt-3" style={{ color: 'var(--danger)' }}>
          {error}
        </div>
      )}
      <p className="m-0 mt-3 text-[12.5px] leading-relaxed text-ink-soft">Your name is never shown.</p>
    </Sheet>
  );
}

/** Say a product merged into this one isn't it. */
function NotSameSheet({
  product,
  other,
  onClose,
  onDone,
}: {
  product: CatalogProduct;
  other: CatalogProduct | null;
  onClose: () => void;
  onDone: (message: string, row: DuplicateReport | null) => void;
}) {
  const compare = useCompare();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    setSaving(false);
    setError('');
  }, [other?.id]);
  if (!other) return null;

  const send = async () => {
    setSaving(true);
    setError('');
    const r = await compare.reportDuplicate('not_same', other.id, product.id);
    setSaving(false);
    if (r === 'offline' || r === 'error' || r === 'limit') {
      setError(resultMessage(r, 'not_same'));
      return;
    }
    onDone(resultMessage(r, 'not_same'), typeof r === 'object' ? r.ok : null);
    onClose();
  };

  return (
    <Sheet
      open
      onClose={saving ? () => undefined : onClose}
      title="Not the same product?"
      footer={
        <div className="flex flex-col gap-1.5">
          <Btn full size="lg" onClick={() => void send()} disabled={saving || !compare.online}>
            {saving ? 'Sending…' : 'They’re different products'}
          </Btn>
          <Btn variant="ghost" full onClick={onClose} disabled={saving} className="shadow-none">
            Cancel
          </Btn>
        </div>
      }
    >
      <div className="flex flex-col gap-2 mb-3">
        <div className="rounded-2xl bg-surface shadow-[inset_0_0_0_1px_var(--line)] text-[14px] font-bold leading-snug" style={{ padding: '10px 14px' }}>
          {other.name}
        </div>
        <div className="rounded-2xl bg-surface shadow-[inset_0_0_0_1px_var(--line)] text-[14px] font-bold leading-snug" style={{ padding: '10px 14px' }}>
          {product.name}
        </div>
      </div>
      <p className="m-0 text-[13.5px] leading-relaxed text-ink-soft">
        We joined these because their names and prices match. If they’re different (another size, flavour or pack), say so — once enough people agree, we split them again and each keeps its own prices.
      </p>
      {error && (
        <div role="alert" className="text-[13px] mt-3" style={{ color: 'var(--danger)' }}>
          {error}
        </div>
      )}
    </Sheet>
  );
}
