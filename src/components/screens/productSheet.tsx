// Add or edit one of your own (private) catalogue products.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useCompare } from '../../contexts/CompareContext';
import { CATEGORIES, resolveCategory } from '../../lib/categories';
import { ITEM_TYPES, ITEM_TYPE_BY_ID, findTypes, tokens } from '../../lib/compare/itemTypes';
import { parseProductName } from '../../lib/compare/productName';
import { CatalogProduct } from '../../lib/compare/types';
import { Btn, Chip, Icon, Sheet } from '../ui';
import { Field, TextIn } from './manageParts';

type FormUnit = 'g' | 'kg' | 'ml' | 'L' | 'pc';
const FORM_UNITS: { id: FormUnit; label: string }[] = [
  { id: 'g', label: 'g' },
  { id: 'kg', label: 'kg' },
  { id: 'ml', label: 'ml' },
  { id: 'L', label: 'L' },
  { id: 'pc', label: 'pcs' },
];
const MAX_IMAGE_MB = 10;

/** Stored size (g / ml / pc) → what the form shows ("1.5 kg" rather than "1500 g"). */
function toForm(value: number | null, unit: 'g' | 'ml' | 'pc' | null): { value: string; unit: FormUnit } {
  if (!value || !unit) return { value: '', unit: 'g' };
  if (unit !== 'pc' && value >= 1000) return { value: String(+(value / 1000).toFixed(3)), unit: unit === 'g' ? 'kg' : 'L' };
  return { value: String(value), unit };
}

function fromForm(value: string, unit: FormUnit): { sizeValue: number | null; sizeUnit: 'g' | 'ml' | 'pc' | null } {
  const n = parseFloat(value);
  if (!(n > 0 && n < 1_000_000)) return { sizeValue: null, sizeUnit: null };
  if (unit === 'kg') return { sizeValue: n * 1000, sizeUnit: 'g' };
  if (unit === 'L') return { sizeValue: n * 1000, sizeUnit: 'ml' };
  return { sizeValue: n, sizeUnit: unit };
}

export function ProductFormSheet({
  target,
  initialName = '',
  onClose,
  onSaved,
}: {
  target: 'new' | CatalogProduct | null;
  initialName?: string;
  onClose: () => void;
  onSaved?: (p: CatalogProduct) => void;
}) {
  const compare = useCompare();
  const product = target && target !== 'new' ? target : null;
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [typeId, setTypeId] = useState<string | null>(null);
  const [typeQuery, setTypeQuery] = useState('');
  const [size, setSize] = useState('');
  const [unit, setUnit] = useState<FormUnit>('g');
  const [pack, setPack] = useState('1');
  const [category, setCategory] = useState<string>(CATEGORIES[0].id);
  // Fields the user has set themselves aren't overwritten by what we read from the name.
  const [touched, setTouched] = useState<{ brand?: boolean; type?: boolean; size?: boolean; category?: boolean }>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!target) return;
    const f = toForm(product?.sizeValue ?? null, product?.sizeUnit ?? null);
    setName(product?.name ?? '');
    setBrand(product?.brand ?? '');
    setTypeId(product?.itemType ?? null);
    setTypeQuery('');
    setSize(f.value);
    setUnit(f.unit);
    setPack(String(product?.packCount ?? 1));
    setCategory(resolveCategory(product?.category ?? undefined).id);
    setTouched(product ? { brand: true, type: true, size: true, category: true } : {});
    setImageFile(null);
    setPreview(product?.imageUrl ?? null);
    setRemoveImage(false);
    setSaving(false);
    setError('');
    if (!product && initialName) readName(initialName, {});
    // Reset when a different product (or a new one) opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  // Revoke a local preview when it's replaced or the sheet closes.
  useEffect(() => () => {
    if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
  }, [preview]);

  function readName(text: string, t: typeof touched) {
    setName(text);
    const parsed = parseProductName(text);
    if (!t.brand) setBrand(parsed.brand ?? '');
    if (!t.type) setTypeId(parsed.itemType?.id ?? null);
    if (!t.size) {
      const f = toForm(parsed.size?.value ?? null, parsed.size?.unit ?? null);
      setSize(f.value);
      setUnit(f.unit);
      setPack(String(parsed.size?.pack ?? 1));
    }
    if (!t.category && parsed.itemType) setCategory(parsed.itemType.category);
  }

  const typeChoices = useMemo(() => {
    const q = tokens(typeQuery);
    if (q.length) {
      return ITEM_TYPES.filter((it) => {
        const have = [...tokens(it.name), ...it.keywords.flatMap(tokens)];
        return q.every((w) => have.some((x) => x.startsWith(w)));
      }).slice(0, 8);
    }
    const seen = new Set<string>();
    return findTypes(name)
      .map((m) => m.type)
      .filter((it) => !seen.has(it.id) && !!seen.add(it.id))
      .slice(0, 5);
  }, [typeQuery, name]);

  if (!target) return null;
  const type = typeId ? ITEM_TYPE_BY_ID.get(typeId) : undefined;

  const pickType = (id: string | null) => {
    setTypeId(id);
    setTypeQuery('');
    const it = id ? ITEM_TYPE_BY_ID.get(id) : undefined;
    if (it && !touched.category) setCategory(it.category);
    setTouched((cur) => ({ ...cur, type: true }));
  };

  const chooseFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setError(`Pick a photo under ${MAX_IMAGE_MB} MB.`);
      return;
    }
    setError('');
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
    setRemoveImage(false);
  };

  const save = async () => {
    const clean = name.trim();
    if (!clean) {
      setError('Give it a name, e.g. “Dawn Milky Bread 800 g”.');
      return;
    }
    setSaving(true);
    setError('');
    const s = fromForm(size, unit);
    const input = {
      name: clean,
      brand: brand.trim() || null,
      variant: product?.variant ?? null,
      itemType: typeId,
      category: CATEGORIES.find((c) => c.id === category)?.name ?? null,
      sizeValue: s.sizeValue,
      sizeUnit: s.sizeUnit,
      packCount: Math.max(1, Math.round(parseFloat(pack) || 1)),
      unitLabel: product?.unitLabel ?? null,
      imageUrl: product?.imageUrl ?? null,
    };
    let saved = product ? await compare.updateProduct(product.id, input) : await compare.addProduct(input);
    if (saved && (imageFile || (removeImage && product?.imageUrl))) {
      const url = imageFile ? await compare.uploadProductImage(saved.id, imageFile) : null;
      if (url || removeImage) {
        const old = saved.imageUrl;
        saved = (await compare.updateProduct(saved.id, { ...input, imageUrl: url })) ?? saved;
        if (old && old !== url) void compare.removeProductImage(old);
      } else {
        setError('The product was saved, but the photo didn’t upload.');
      }
    }
    setSaving(false);
    if (!saved) {
      setError('Couldn’t save — check your connection and try again.');
      return;
    }
    onSaved?.(saved);
    onClose();
  };

  const del = async () => {
    if (!product || saving) return;
    setSaving(true);
    const ok = await compare.deleteProduct(product.id);
    setSaving(false);
    if (ok) onClose();
    else setError('Couldn’t delete — check your connection and try again.');
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={product ? 'Edit product' : 'New product'}
      footer={
        <div className="flex gap-2.5">
          {product && (
            <Btn variant="ghost" icon="trash" onClick={() => void del()} disabled={saving}>
              Delete
            </Btn>
          )}
          <Btn full size="lg" className="flex-1" onClick={() => void save()} disabled={saving || !compare.online}>
            {saving ? 'Saving…' : product ? 'Save changes' : 'Add product'}
          </Btn>
        </div>
      }
    >
      <p className="m-0 -mt-1 mb-4 text-[13px] leading-relaxed text-ink-soft">Your products are private — only you see them.</p>

      <div className="flex items-end gap-4 mb-5">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative shrink-0 overflow-hidden grid place-items-center text-ink-faint"
          style={{ width: 80, height: 80, borderRadius: 18, background: 'var(--surface)', boxShadow: 'inset 0 0 0 1.5px var(--line)' }}
          aria-label={preview ? 'Replace photo' : 'Add a photo'}
        >
          {preview ? <img src={preview} alt="" className="w-full h-full object-cover block" /> : <Icon name="camera" size={26} stroke={1.8} />}
        </button>
        {preview && (
          <Btn
            variant="ghost"
            size="sm"
            icon="trash"
            onClick={() => {
              setImageFile(null);
              setPreview(null);
              setRemoveImage(true);
            }}
          >
            Remove photo
          </Btn>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={chooseFile} />
      </div>

      <Field label="Name" hint="As it’s written on the pack — we read the brand, type and size from it.">
        <TextIn value={name} maxLength={160} onChange={(e) => readName(e.target.value, touched)} placeholder="e.g. Dawn Milky Bread 800 g" />
      </Field>

      <Field label="Brand">
        <TextIn
          value={brand}
          maxLength={60}
          onChange={(e) => {
            setBrand(e.target.value);
            setTouched((cur) => ({ ...cur, brand: true }));
          }}
          placeholder="Optional"
        />
      </Field>

      <div className="mb-4">
        <div className="font-mono text-[12.5px] font-bold text-ink-soft mb-[7px] tracking-[0.04em] uppercase">What is it?</div>
        {type && (
          <div className="flex items-center gap-2 mb-2">
            <Chip active onClick={() => pickType(null)}>
              {type.name}
              <span aria-hidden> ✕</span>
              <span className="sr-only">, tap to remove</span>
            </Chip>
            <span className="text-[12.5px] text-ink-soft">Lets “{type.name.toLowerCase()}” on a list find this.</span>
          </div>
        )}
        <label htmlFor="type-search" className="sr-only">
          Find a type
        </label>
        <TextIn id="type-search" value={typeQuery} maxLength={40} onChange={(e) => setTypeQuery(e.target.value)} placeholder={type ? 'Change type…' : 'e.g. bread, milk, atta'} />
        {typeChoices.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {typeChoices
              .filter((it) => it.id !== typeId)
              .map((it) => (
                <Chip key={it.id} onClick={() => pickType(it.id)}>
                  {it.name}
                </Chip>
              ))}
          </div>
        )}
      </div>

      <div className="mb-4">
        <div className="font-mono text-[12.5px] font-bold text-ink-soft mb-[7px] tracking-[0.04em] uppercase">Size</div>
        <div className="flex gap-2 items-center">
          <label htmlFor="size-value" className="sr-only">
            Size of one
          </label>
          <TextIn
            id="size-value"
            type="number"
            inputMode="decimal"
            value={size}
            onChange={(e) => {
              setSize(e.target.value);
              setTouched((cur) => ({ ...cur, size: true }));
            }}
            placeholder="800"
            className="font-mono"
            style={{ maxWidth: 110 }}
          />
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Size unit">
            {FORM_UNITS.map((u) => (
              <Chip
                key={u.id}
                active={unit === u.id}
                onClick={() => {
                  setUnit(u.id);
                  setTouched((cur) => ({ ...cur, size: true }));
                }}
              >
                {u.label}
              </Chip>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <label htmlFor="pack-count" className="text-[13.5px] text-ink-soft">
            In a pack of
          </label>
          <TextIn
            id="pack-count"
            type="number"
            inputMode="numeric"
            min={1}
            value={pack}
            onChange={(e) => {
              setPack(e.target.value);
              setTouched((cur) => ({ ...cur, size: true }));
            }}
            className="font-mono"
            style={{ maxWidth: 90 }}
          />
        </div>
        <div className="text-[12px] text-ink-faint mt-1.5">Used to compare price per kg or litre across sizes.</div>
      </div>

      <div className="mb-2">
        <div className="font-mono text-[12.5px] font-bold text-ink-soft mb-[7px] tracking-[0.04em] uppercase">Aisle</div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <Chip
              key={c.id}
              active={category === c.id}
              onClick={() => {
                setCategory(c.id);
                setTouched((cur) => ({ ...cur, category: true }));
              }}
            >
              {c.name}
            </Chip>
          ))}
        </div>
      </div>

      {error && (
        <div role="alert" className="text-[13px] mt-3" style={{ color: 'var(--danger)' }}>
          {error}
        </div>
      )}
    </Sheet>
  );
}
