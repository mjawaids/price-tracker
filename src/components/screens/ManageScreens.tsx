import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Product, Store, Price, DeliveryRule } from '../../types';
import { supabase } from '../../lib/supabase';
import { CATEGORIES, resolveCategory, storeHue } from '../../lib/categories';
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

function ProductSheet({ target, onClose }: { target: ‘new’ | Product | null; onClose: () => void }) {
  const app = useApp();
  const isNew = target === ‘new’;
  const p = isNew ? null : (target as Product | null);
  const defaultCat = CATEGORIES[0].name;
  const [name, setName] = useState(‘’);
  const [unit, setUnit] = useState(‘’);
  const [cat, setCat] = useState(defaultCat);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (p) {
      setName(p.name);
      setUnit(p.unit || ‘’);
      setCat(resolveCategory(p.category).name);
      setImagePreview(p.imageUrl ?? null);
    } else {
      setName(‘’);
      setUnit(‘’);
      setCat(defaultCat);
      setImagePreview(null);
    }
    setImageFile(null);
    setIsRemoving(false);
    setSaving(false);
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!target) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (imagePreview?.startsWith(‘blob:’)) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setIsRemoving(false);
    if (fileInputRef.current) fileInputRef.current.value = ‘’;
  };

  const handleRemoveImage = () => {
    if (imagePreview?.startsWith(‘blob:’)) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    setIsRemoving(true);
  };

  const save = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      if (isNew) {
        const created = await app.addProduct({
          name: name.trim(),
          category: cat,
          unit: unit.trim() || ‘1 unit’,
          prices: [],
        });
        if (!created) return;
        if (imageFile) {
          const url = await app.uploadProductImage(created.id, imageFile);
          if (url) await app.updateProduct({ ...created, imageUrl: url });
        }
      } else if (p) {
        let nextImageUrl = p.imageUrl;
        if (isRemoving && p.imageUrl) {
          await app.deleteProductImage(p.id, p.imageUrl);
          nextImageUrl = undefined;
        } else if (imageFile) {
          const url = await app.uploadProductImage(p.id, imageFile);
          if (url) {
            if (p.imageUrl) {
              const marker = ‘/product-images/’;
              const idx = p.imageUrl.indexOf(marker);
              if (idx !== -1) {
                await supabase.storage.from(‘product-images’).remove([p.imageUrl.slice(idx + marker.length)]);
              }
            }
            nextImageUrl = url;
          }
        }
        await app.updateProduct({ ...p, name: name.trim(), category: cat, unit: unit.trim(), imageUrl: nextImageUrl });
      }
      onClose();
    } catch (err) {
      console.error(‘ProductSheet save error:’, err);
    } finally {
      setSaving(false);
    }
  };

  const del = () => {
    if (p) app.deleteProduct(p.id);
    onClose();
  };

  return (
    <Sheet open={!!target} onClose={onClose} title={isNew ? ‘New product’ : ‘Edit product’}>
      {/* Image picker */}
      <div className="flex items-end gap-4 mb-5">
        <div className="relative shrink-0" style={{ width: 80, height: 80 }}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-full overflow-hidden"
            style={{
              borderRadius: 18,
              background: imagePreview ? ‘transparent’ : ‘var(--surface)’,
              boxShadow: ‘inset 0 0 0 1.5px var(--line)’,
            }}
            aria-label="Choose product image"
          >
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Preview"
                style={{ width: ‘100%’, height: ‘100%’, objectFit: ‘cover’, display: ‘block’ }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-ink-faint">
                <Icon name="camera" size={26} stroke={1.8} />
              </div>
            )}
          </button>
          {imagePreview && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute grid place-items-center bg-ink text-paper rounded-full shadow-md"
              style={{ width: 26, height: 26, bottom: -6, right: -6 }}
              aria-label="Replace image"
            >
              <Icon name="camera" size={13} stroke={2.2} />
            </button>
          )}
        </div>
        {imagePreview && (
          <Btn variant="ghost" size="sm" icon="trash" onClick={handleRemoveImage}>
            Remove
          </Btn>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <Field label="Name">
        <TextIn value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Whole Milk" />
      </Field>
      <Field label="Unit / size" hint="How it’s sold — shown next to the price.">
        <TextIn value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. 1 gal, dozen, 500 g" />
      </Field>
      <Field label="Category">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
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
        <Btn full onClick={save} disabled={saving}>
          {saving ? ‘Saving…’ : isNew ? ‘Add product’ : ‘Save changes’}
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
