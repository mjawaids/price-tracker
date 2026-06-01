import { useEffect, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useCategories } from '../../contexts/CategoriesContext';
import { Product, Store, Price, DeliveryRule } from '../../types';
import { resolveCategory, storeHue, catTint, catInk } from '../../lib/categories';
import { priceMap, priceRange, deliveryLabel, deliveryRuleOf } from '../../utils/optimizer';
import { Icon, Thumb, Chip, Btn, Sheet, StoreDot } from '../ui';
import { Field, TextIn, NumIn, ManageHeader } from './manageParts';

const listGrid = 'grid grid-cols-1 md:grid-cols-2 gap-2.5 px-[18px] md:px-7 max-w-full md:max-w-[860px] mx-auto';

// ── PRODUCTS ──────────────────────────────────────────────────────────────────
export function ManageProducts() {
  const app = useApp();
  const [sheet, setSheet] = useState<'new' | Product | null>(null);
  return (
    <div className="pb-6">
      <ManageHeader
        title="Products"
        sub={`${app.products.length} products`}
        action={
          <Btn size="sm" icon="plus" onClick={() => setSheet('new')}>
            Add
          </Btn>
        }
      />
      <div className={listGrid}>
        {app.products.map((p) => {
          const n = Object.keys(priceMap(p)).length;
          return (
            <div
              key={p.id}
              onClick={() => setSheet(p)}
              className="flex items-center gap-3 bg-surface rounded-2xl p-[11px] shadow-card cursor-pointer"
            >
              <Thumb product={p} size={48} radius={12} />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[15px]">{p.name}</div>
                <div className="text-[12.5px] text-ink-faint">
                  {p.unit ? `${p.unit} · ` : ''}
                  {n ? `priced at ${n} store${n > 1 ? 's' : ''}` : 'no prices yet'}
                </div>
              </div>
              <Icon name="chevR" size={18} color="var(--ink-faint)" />
            </div>
          );
        })}
      </div>
      <ProductSheet target={sheet} onClose={() => setSheet(null)} />
    </div>
  );
}

function ProductSheet({ target, onClose }: { target: 'new' | Product | null; onClose: () => void }) {
  const app = useApp();
  const { categories } = useCategories();
  const isNew = target === 'new';
  const p = isNew ? null : (target as Product | null);
  const defaultCat = categories[0]?.name || 'Pantry';
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [cat, setCat] = useState(defaultCat);

  useEffect(() => {
    if (p) {
      setName(p.name);
      setUnit(p.unit || '');
      setCat(resolveCategory(p.category).name);
    } else {
      setName('');
      setUnit('');
      setCat(defaultCat);
    }
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!target) return null;

  const save = () => {
    if (!name.trim()) return;
    if (isNew) {
      app.addProduct({ name: name.trim(), category: cat, unit: unit.trim() || '1 unit', prices: [] });
    } else if (p) {
      app.updateProduct({ ...p, name: name.trim(), category: cat, unit: unit.trim() });
    }
    onClose();
  };
  const del = () => {
    if (p) app.deleteProduct(p.id);
    onClose();
  };

  return (
    <Sheet open={!!target} onClose={onClose} title={isNew ? 'New product' : 'Edit product'}>
      <Field label="Name">
        <TextIn value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Whole Milk" />
      </Field>
      <Field label="Unit / size" hint="How it’s sold — shown next to the price.">
        <TextIn value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. 1 gal, dozen, 500 g" />
      </Field>
      <Field label="Category">
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <Chip key={c.id} active={cat === c.name} onClick={() => setCat(c.name)}>
              {c.name}
            </Chip>
          ))}
        </div>
      </Field>
      <div className="flex gap-2.5 mt-1.5">
        {!isNew && (
          <Btn variant="ghost" icon="trash" onClick={del}>
            Delete
          </Btn>
        )}
        <Btn full onClick={save}>
          {isNew ? 'Add product' : 'Save changes'}
        </Btn>
      </div>
    </Sheet>
  );
}

// ── STORES ──────────────────────────────────────────────────────────────────
export function ManageStores() {
  const app = useApp();
  const [sheet, setSheet] = useState<'new' | Store | null>(null);
  return (
    <div className="pb-6">
      <ManageHeader
        title="Stores"
        sub={`${app.stores.length} stores`}
        action={
          <Btn size="sm" icon="plus" onClick={() => setSheet('new')}>
            Add
          </Btn>
        }
      />
      <div className={listGrid}>
        {app.stores.map((s) => (
          <div
            key={s.id}
            onClick={() => setSheet(s)}
            className="flex items-center gap-3 bg-surface rounded-2xl shadow-card cursor-pointer"
            style={{ padding: '14px 14px' }}
          >
            <StoreDot store={s} size={14} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base">{s.name}</span>
                <span className="text-[10.5px] font-mono uppercase text-ink-faint bg-paper rounded-full shadow-[inset_0_0_0_1px_var(--line)]" style={{ padding: '2px 7px' }}>
                  {s.type}
                </span>
              </div>
              <div className="text-[12.5px] text-ink-soft mt-0.5 flex items-center gap-1.5">
                <Icon name="truck" size={13} stroke={1.8} color="var(--ink-faint)" />
                {deliveryLabel(s, app.fmt)}
              </div>
            </div>
            <Icon name="chevR" size={18} color="var(--ink-faint)" />
          </div>
        ))}
      </div>
      <StoreSheet target={sheet} onClose={() => setSheet(null)} />
    </div>
  );
}

const RULE_OPTS: { id: DeliveryRule['type']; label: string; desc: string }[] = [
  { id: 'none', label: 'No delivery', desc: 'In-store / pickup only' },
  { id: 'free', label: 'Always free', desc: 'Never charges delivery' },
  { id: 'over', label: 'Free over amount', desc: 'Free above a threshold, else a fee' },
  { id: 'flat', label: 'Flat fee', desc: 'Same fee on every order' },
];

function StoreSheet({ target, onClose }: { target: 'new' | Store | null; onClose: () => void }) {
  const app = useApp();
  const isNew = target === 'new';
  const s = isNew ? null : (target as Store | null);
  const [name, setName] = useState('');
  const [type, setType] = useState<'online' | 'physical'>('online');
  const [dtype, setDtype] = useState<DeliveryRule['type']>('free');
  const [fee, setFee] = useState('5.99');
  const [thr, setThr] = useState('40');

  useEffect(() => {
    if (s) {
      const rule = deliveryRuleOf(s);
      setName(s.name);
      setType(s.type);
      setDtype(rule.type);
      setFee(String('fee' in rule ? rule.fee : 5.99));
      setThr(String('threshold' in rule ? rule.threshold : 40));
    } else {
      setName('');
      setType('online');
      setDtype('free');
      setFee('5.99');
      setThr('40');
    }
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!target) return null;

  const buildRule = (): DeliveryRule => {
    if (dtype === 'none') return { type: 'none' };
    if (dtype === 'free') return { type: 'free' };
    if (dtype === 'flat') return { type: 'flat', fee: parseFloat(fee) || 0 };
    return { type: 'over', threshold: parseFloat(thr) || 0, fee: parseFloat(fee) || 0 };
  };

  const save = () => {
    if (!name.trim()) return;
    const rule = buildRule();
    const hasDelivery = rule.type !== 'none';
    const deliveryFee = rule.type === 'flat' || rule.type === 'over' ? rule.fee : undefined;
    if (isNew) {
      app.addStore({ name: name.trim(), type, hasDelivery, deliveryFee, deliveryRule: rule });
    } else if (s) {
      app.updateStore({ ...s, name: name.trim(), type, hasDelivery, deliveryFee, deliveryRule: rule });
    }
    onClose();
  };
  const del = () => {
    if (s) app.deleteStore(s.id);
    onClose();
  };

  return (
    <Sheet open={!!target} onClose={onClose} title={isNew ? 'New store' : 'Edit store'}>
      <Field label="Store name">
        <TextIn value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. QuickCart" />
      </Field>
      <Field label="Type">
        <div className="flex gap-2">
          <Chip active={type === 'online'} onClick={() => setType('online')} className="flex-1 justify-center">
            Online
          </Chip>
          <Chip active={type === 'physical'} onClick={() => setType('physical')} className="flex-1 justify-center">
            Physical
          </Chip>
        </div>
      </Field>
      <Field label="Delivery rule">
        <div className="flex flex-col gap-2">
          {RULE_OPTS.map((o) => {
            const on = dtype === o.id;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => setDtype(o.id)}
                className="text-left rounded-[14px] flex items-center gap-3"
                style={{
                  padding: '12px 14px',
                  background: on ? 'var(--accent-wash)' : 'var(--surface)',
                  boxShadow: on ? 'inset 0 0 0 1.5px var(--accent)' : 'inset 0 0 0 1.5px var(--line)',
                }}
              >
                <span
                  className="shrink-0 bg-paper"
                  style={{ width: 18, height: 18, borderRadius: 999, boxShadow: on ? '0 0 0 5px var(--accent) inset' : 'inset 0 0 0 2px var(--line)' }}
                />
                <span>
                  <div className="font-bold text-[14.5px]">{o.label}</div>
                  <div className="text-[12px] text-ink-faint">{o.desc}</div>
                </span>
              </button>
            );
          })}
        </div>
      </Field>
      {(dtype === 'flat' || dtype === 'over') && (
        <div className="flex gap-3">
          {dtype === 'over' && (
            <div className="flex-1">
              <Field label="Free over">
                <NumIn value={thr} onChange={(e) => setThr(e.target.value)} />
              </Field>
            </div>
          )}
          <div className="flex-1">
            <Field label="Delivery fee">
              <NumIn value={fee} onChange={(e) => setFee(e.target.value)} />
            </Field>
          </div>
        </div>
      )}
      <div className="flex gap-2.5 mt-0.5">
        {!isNew && (
          <Btn variant="ghost" icon="trash" onClick={del}>
            Delete
          </Btn>
        )}
        <Btn full onClick={save}>
          {isNew ? 'Add store' : 'Save changes'}
        </Btn>
      </div>
    </Sheet>
  );
}

// ── PRICES ────────────────────────────────────────────────────────────────────
export function ManagePrices() {
  const app = useApp();
  const [sheet, setSheet] = useState<Product | null>(null);
  return (
    <div className="pb-6">
      <ManageHeader title="Prices" sub="Tap a product to set store prices" />
      <div className={listGrid}>
        {app.products.map((p) => {
          const n = Object.keys(priceMap(p)).length;
          const r = n ? priceRange(p) : null;
          return (
            <div
              key={p.id}
              onClick={() => setSheet(p)}
              className="flex items-center gap-3 bg-surface rounded-2xl p-[11px] shadow-card cursor-pointer"
            >
              <Thumb product={p} size={46} radius={11} />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[15px]">{p.name}</div>
                <div className="text-[12.5px] font-mono" style={{ color: n ? 'var(--ink-soft)' : 'var(--accent-ink)' }}>
                  {r ? `${app.fmt(r.min)}–${app.fmt(r.max)} · ${n}/${app.stores.length} stores` : 'needs prices'}
                </div>
              </div>
              <Icon name="tag" size={17} color="var(--ink-faint)" stroke={2} />
            </div>
          );
        })}
      </div>
      <PriceSheet target={sheet} onClose={() => setSheet(null)} />
    </div>
  );
}

function PriceSheet({ target, onClose }: { target: Product | null; onClose: () => void }) {
  const app = useApp();
  const [vals, setVals] = useState<Record<string, string>>({});

  useEffect(() => {
    if (target) {
      const pm = priceMap(target);
      const v: Record<string, string> = {};
      app.stores.forEach((s) => {
        v[s.id] = pm[s.id] != null ? String(pm[s.id]) : '';
      });
      setVals(v);
    }
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!target) return null;

  const save = () => {
    const existing = new Map(target.prices.map((pr) => [pr.storeId, pr]));
    const next: Price[] = [];
    app.stores.forEach((s) => {
      const num = parseFloat(vals[s.id]);
      if (!isNaN(num) && num > 0) {
        const prev = existing.get(s.id);
        next.push({
          id: prev?.id || `${target.id}-${s.id}`,
          storeId: s.id,
          price: Math.round(num * 100) / 100,
          currency: app.currencyCode,
          lastUpdated: new Date(),
          isAvailable: true,
          discountPercentage: prev?.discountPercentage,
        });
      }
    });
    app.updateProduct({ ...target, prices: next });
    onClose();
  };

  return (
    <Sheet open={!!target} onClose={onClose} title={target.name}>
      <div className="text-[13px] text-ink-faint -mt-1 mb-3.5">
        Leave a store blank if {target.name} isn’t sold there.
      </div>
      {app.stores.length === 0 ? (
        <div className="text-sm text-ink-faint py-6 text-center">Add stores first in Manage › Stores.</div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {app.stores.map((s) => (
            <div key={s.id} className="flex items-center gap-3">
              <span
                className="shrink-0"
                style={{ width: 11, height: 11, borderRadius: s.type === 'online' ? 3 : 999, background: `oklch(0.6 0.16 ${storeHue(s)})` }}
              />
              <span className="flex-1 font-semibold text-[15px]">{s.name}</span>
              <div style={{ width: 120 }}>
                <NumIn value={vals[s.id] || ''} placeholder="—" onChange={(e) => setVals({ ...vals, [s.id]: e.target.value })} />
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-5">
        <Btn full onClick={save}>
          Save prices
        </Btn>
      </div>
    </Sheet>
  );
}

// ── CATEGORIES ──────────────────────────────────────────────────────────────
export function ManageCategories() {
  const app = useApp();
  const { categories, addCategory, renameCategory, deleteCategory, resetCategories } = useCategories();
  const [sheet, setSheet] = useState<'new' | string | null>(null);

  // products per category id
  const counts = new Map<string, number>();
  app.products.forEach((p) => {
    const id = resolveCategory(p.category).id;
    counts.set(id, (counts.get(id) || 0) + 1);
  });

  return (
    <div className="pb-6">
      <ManageHeader
        title="Categories"
        sub={`${categories.length} categories`}
        action={
          <Btn size="sm" icon="plus" onClick={() => setSheet('new')}>
            Add
          </Btn>
        }
      />
      <div className={listGrid}>
        {categories.map((c) => {
          const n = counts.get(c.id) || 0;
          return (
            <div
              key={c.id}
              onClick={() => setSheet(c.id)}
              className="flex items-center gap-3 bg-surface rounded-2xl p-[11px] shadow-card cursor-pointer"
            >
              <span
                className="grid place-items-center shrink-0"
                style={{ width: 38, height: 38, borderRadius: 11, background: catTint(c.hue) }}
              >
                <span style={{ width: 12, height: 12, borderRadius: 4, background: `oklch(0.62 0.13 ${c.hue})` }} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[15px]" style={{ color: catInk(c.hue) }}>
                  {c.name}
                </div>
                <div className="text-[12.5px] text-ink-faint">
                  {n ? `${n} product${n > 1 ? 's' : ''}` : 'no products yet'}
                </div>
              </div>
              <Icon name="chevR" size={18} color="var(--ink-faint)" />
            </div>
          );
        })}
      </div>
      <div className="flex justify-center mt-5">
        <Btn size="sm" variant="ghost" onClick={resetCategories}>
          Reset to defaults
        </Btn>
      </div>
      <CategorySheet
        target={sheet}
        onClose={() => setSheet(null)}
        onAdd={addCategory}
        onRename={renameCategory}
        onDelete={deleteCategory}
        categories={categories}
      />
    </div>
  );
}

function CategorySheet({
  target,
  onClose,
  onAdd,
  onRename,
  onDelete,
  categories,
}: {
  target: 'new' | string | null;
  onClose: () => void;
  onAdd: (name: string) => boolean;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  categories: { id: string; name: string }[];
}) {
  const isNew = target === 'new';
  const existing = isNew ? null : categories.find((c) => c.id === target) || null;
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setName(existing?.name || '');
    setError('');
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!target) return null;

  const save = () => {
    const next = name.trim();
    if (!next) return;
    if (isNew) {
      if (!onAdd(next)) {
        setError('That category already exists.');
        return;
      }
    } else if (existing) {
      onRename(existing.id, next);
    }
    onClose();
  };
  const del = () => {
    if (existing) onDelete(existing.id);
    onClose();
  };

  return (
    <Sheet open={!!target} onClose={onClose} title={isNew ? 'New category' : 'Edit category'}>
      <Field label="Name" hint="Products keep their existing label even if a category is removed.">
        <TextIn
          value={name}
          autoFocus
          onChange={(e) => {
            setName(e.target.value);
            setError('');
          }}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          placeholder="e.g. Frozen, Snacks, Personal care"
        />
      </Field>
      {error && <div className="text-[12.5px] -mt-2 mb-3" style={{ color: 'oklch(0.55 0.16 25)' }}>{error}</div>}
      <div className="flex gap-2.5 mt-1.5">
        {!isNew && (
          <Btn variant="ghost" icon="trash" onClick={del}>
            Delete
          </Btn>
        )}
        <Btn full onClick={save}>
          {isNew ? 'Add category' : 'Save changes'}
        </Btn>
      </div>
    </Sheet>
  );
}
