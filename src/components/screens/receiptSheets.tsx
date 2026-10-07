// Sheets for the receipt screen: the one-time reader download, pasting text, the
// date, the store, choosing a line's product and editing a line.
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useCompare } from '../../contexts/CompareContext';
import { freshness } from '../../lib/compare/describe';
import { tokens } from '../../lib/compare/itemTypes';
import { tidyName } from '../../lib/compare/productName';
import type { CatalogProduct, CatalogStore, CurrentPrice } from '../../lib/compare/types';
import { MAX_AGE_DAYS } from '../../lib/receipt/dates';
import { OCR_MB, saveDataOn } from '../../lib/receipt/ocr';
import { MAX_UNIT_PRICE } from '../../lib/receipt/parse';
import type { StoreGuess } from '../../lib/receipt/stores';
import { MAX_CHARS } from '../../lib/receipt/text';
import { Btn, Icon, Sheet, Toggle } from '../ui';
import type { IconName } from '../ui';
import { StoreFormSheet } from './compareSheets';
import { StorePickerSheet as SharedStorePicker } from './storePicker';
import { productSizeText, sectionLabel } from './compareHelpers';
import { Field, NumIn, TextIn } from './manageParts';
import { ProductFormSheet } from './productSheet';
import type { Line } from './receiptHelpers';
import { localISO, shortDate, todayISO, useDeviceWord } from './receiptHelpers';

function Point({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <div className="flex gap-3 items-start text-[14.5px] leading-snug">
      <span className="grid place-items-center shrink-0 bg-accent-wash text-accent-ink" style={{ width: 30, height: 30, borderRadius: 10 }}>
        <Icon name={icon} size={16} stroke={2.2} />
      </span>
      <span className="pt-1">{children}</span>
    </div>
  );
}

// ── One-time reader download ─────────────────────────────────────────────────
export function ReaderConsentSheet({
  open,
  kind = 'image',
  onClose,
  onDownload,
  onPaste,
}: {
  open: boolean;
  /** pdf = a PDF whose pages are pictures (a scan), so it needs the reader too. */
  kind?: 'image' | 'pdf';
  onClose: () => void;
  onDownload: () => void;
  onPaste: () => void;
}) {
  const compare = useCompare();
  const device = useDeviceWord();
  const offline = !compare.online;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Get the receipt reader"
      footer={
        <div className="flex flex-col gap-2">
          <Btn full size="lg" icon="download" onClick={onDownload} disabled={offline}>
            Download and read
          </Btn>
          <Btn full variant="ghost" onClick={onPaste}>
            Paste text instead
          </Btn>
        </div>
      }
    >
      <p className="m-0 text-[15px] leading-relaxed text-ink-soft">
        {kind === 'pdf' ? 'This PDF is a scan — a picture of the receipt — so SpendLess needs its text reader' : 'To read pictures, SpendLess needs its text reader'} on
        this {device}. It’s a one-time download of about {OCR_MB} MB.
      </p>
      <div className="flex flex-col gap-3 mt-4">
        <Point icon="lock">Your receipts are read on the {device}. Nothing is sent anywhere.</Point>
        <Point icon="cloudOff">Downloaded once, then it works offline too.</Point>
        <Point icon="smartphone">{saveDataOn() ? 'Data Saver is on — use Wi-Fi if you can.' : 'On mobile data? Use Wi-Fi if you can.'}</Point>
      </div>
      {offline && (
        <p role="status" className="m-0 mt-4 flex gap-2 items-start text-[13.5px] font-bold text-warn-ink">
          <Icon name="wifiOff" size={17} stroke={2.2} className="shrink-0" />
          You’re offline. Connect once to get the reader — or paste the receipt’s text.
        </p>
      )}
    </Sheet>
  );
}

// ── Paste text ───────────────────────────────────────────────────────────────
export function PasteSheet({ open, onClose, onRead }: { open: boolean; onClose: () => void; onRead: (text: string) => void }) {
  const [text, setText] = useState('');
  // Cleared on close (not on open, so nothing typed straight away is lost).
  useEffect(() => {
    if (!open) setText('');
  }, [open]);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Paste the receipt"
      footer={
        <Btn full size="lg" onClick={() => onRead(text)} disabled={!text.trim()}>
          Read text
        </Btn>
      }
    >
      <p className="m-0 mb-3 text-[14px] text-ink-soft leading-snug">Copy the order from an email or message — the part with the items and prices.</p>
      <label htmlFor="receipt-paste" className="sr-only">
        Receipt text
      </label>
      <textarea
        id="receipt-paste"
        value={text}
        maxLength={MAX_CHARS}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        placeholder={'2 x Dairy milk 1L   Rs 560\nBread large        Rs 220'}
        className="w-full box-border border-none outline-none bg-surface shadow-[inset_0_0_0_1.5px_var(--line)] rounded-[13px] font-mono text-base leading-relaxed resize-y"
        style={{ padding: '12px 14px', minHeight: 200 }}
      />
    </Sheet>
  );
}

// ── Date ─────────────────────────────────────────────────────────────────────
export function DateSheet({
  open,
  date,
  read,
  alternative,
  onClose,
  onPick,
}: {
  open: boolean;
  date: string;
  /** The date read from the receipt, and its other reading when day/month was unclear. */
  read: string | null;
  alternative: string | null;
  onClose: () => void;
  onPick: (date: string) => void;
}) {
  const [value, setValue] = useState(date);
  useEffect(() => {
    if (open) setValue(date);
  }, [open, date]);
  const today = todayISO();
  const min = localISO(new Date(Date.now() - MAX_AGE_DAYS * 86_400_000));
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(value) && value <= today;
  const options = [read, alternative].filter((d): d is string => !!d && d <= today);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="When was this?"
      footer={
        <Btn full size="lg" onClick={() => onPick(value)} disabled={!valid}>
          Use this date
        </Btn>
      }
    >
      {options.length > 1 && (
        <>
          <p className="m-0 mb-2.5 text-[14px] text-ink-soft leading-snug">The receipt’s date could be read two ways.</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {options.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setValue(d)}
                aria-pressed={value === d}
                className={`rounded-full font-bold text-[14px] ${value === d ? 'bg-ink text-paper' : 'bg-surface text-ink shadow-[inset_0_0_0_1.5px_var(--line)]'}`}
                style={{ minHeight: 44, padding: '0 16px' }}
              >
                {shortDate(d)}
              </button>
            ))}
          </div>
        </>
      )}
      <Field label="Date" hint={`Prices from the last ${MAX_AGE_DAYS} days can be added.`}>
        <TextIn type="date" value={value} min={min} max={today} onChange={(e) => setValue(e.target.value)} />
      </Field>
    </Sheet>
  );
}

// ── Store ────────────────────────────────────────────────────────────────────
export function StorePickerSheet({
  open,
  current,
  guess,
  onClose,
  onPick,
}: {
  open: boolean;
  current: CatalogStore | null;
  guess: StoreGuess | null;
  onClose: () => void;
  onPick: (s: CatalogStore) => void;
}) {
  const [adding, setAdding] = useState<{ name: string; kind: CatalogStore['kind'] } | null>(null);
  return (
    <>
      <SharedStorePicker
        open={open && !adding}
        current={current}
        initialKind={guess?.kind ?? 'online'}
        initialQuery={guess?.chain ?? guess?.name ?? ''}
        preferChain={guess?.chain ?? null}
        onClose={onClose}
        onPick={onPick}
        onAddStore={(q, kind) => setAdding({ name: q || guess?.name || guess?.chain || '', kind })}
      />
      <StoreFormSheet
        target={adding ? 'new' : null}
        initialName={adding?.name ?? ''}
        initialKind={adding?.kind ?? 'physical'}
        onClose={() => setAdding(null)}
        onSaved={(s) => {
          setAdding(null);
          onPick(s);
        }}
      />
    </>
  );
}

// ── Which product is this? ───────────────────────────────────────────────────
const MAX_RESULTS = 20;

function priceMeta(p: CurrentPrice | undefined, fmt: (n: number) => string): string | null {
  if (!p || p.price == null) return null;
  const f = freshness(p.observedAt);
  return `${fmt(p.price)} here · ${f.old ? `seen in ${f.label}` : f.label}`;
}

export function ChooseProductSheet({
  line,
  store,
  prices,
  chainName,
  onClose,
  onPick,
  onNotProduct,
}: {
  line: Line | null;
  store: CatalogStore | null;
  prices: Map<string, CurrentPrice>;
  chainName: string;
  onClose: () => void;
  onPick: (productId: string, remember: boolean) => void;
  onNotProduct: (remember: boolean) => void;
}) {
  const compare = useCompare();
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<string | null>(null);
  const [remember, setRemember] = useState(true);
  const [adding, setAdding] = useState(false);
  useEffect(() => {
    if (!line) return;
    setQ('');
    setPicked(line.productId);
    setRemember(true);
    setAdding(false);
  }, [line?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const suggestions = useMemo(
    () => (line ? line.suggestions.map((s) => compare.productById(s.id)).filter((p): p is CatalogProduct => !!p) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [line, compare.products],
  );
  const results = useMemo(() => {
    const words = tokens(q);
    if (!words.length) return [];
    const shown = new Set(suggestions.map((p) => p.id));
    return [...compare.resolveContext.profiles.values()]
      .filter((p) => !shown.has(p.product.id))
      .filter((p) => {
        const have = [...p.words, ...(p.itemType ? tokens(p.itemType) : [])];
        return words.every((w) => have.some((x) => x.startsWith(w)));
      })
      .sort((a, b) => Number(prices.has(b.product.id)) - Number(prices.has(a.product.id)))
      .slice(0, MAX_RESULTS)
      .map((p) => p.product);
  }, [q, compare.resolveContext, suggestions, prices]);

  if (!line) return null;
  const raw = line.item.lines.join(' ') || line.item.name;
  const option = (p: CatalogProduct) => {
    const size = productSizeText(p);
    const meta = priceMeta(prices.get(p.id), compare.fmt) ?? (p.ownerId ? 'Your product' : size || 'Not priced here yet');
    return (
      <label
        key={p.id}
        className="flex items-center gap-3 rounded-[16px] bg-surface cursor-pointer"
        style={{ padding: '10px 14px', minHeight: 60, boxShadow: picked === p.id ? 'inset 0 0 0 2px var(--accent)' : 'inset 0 0 0 1.5px var(--line)' }}
      >
        <input type="radio" name="receipt-product" checked={picked === p.id} onChange={() => setPicked(p.id)} className="m-0 shrink-0" style={{ width: 20, height: 20, accentColor: 'var(--accent)' }} />
        <span className="flex-1 min-w-0">
          <span className="block font-bold text-[14.5px] leading-snug line-clamp-2">{p.name}</span>
          <span className="block text-[12.5px] text-ink-soft truncate">{meta}</span>
        </span>
      </label>
    );
  };

  return (
    <>
      <Sheet
        open={!adding}
        onClose={onClose}
        title="Which product is this?"
        footer={
          <div className="flex flex-col gap-2.5">
            <label className="flex items-center gap-2.5 text-[14px] font-semibold cursor-pointer" style={{ minHeight: 32 }}>
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="m-0" style={{ width: 20, height: 20, accentColor: 'var(--accent)' }} />
              Remember this for {chainName}
            </label>
            <Btn full size="lg" onClick={() => picked && onPick(picked, remember)} disabled={!picked}>
              Use this product
            </Btn>
          </div>
        }
      >
        <div className="rounded-[14px] bg-surface shadow-[inset_0_0_0_1px_var(--line)] mb-4" style={{ padding: '10px 12px' }}>
          <div className="font-mono text-[12.5px] break-words">{raw}</div>
          <div className="text-[12.5px] text-ink-soft mt-1">
            On the receipt: <span className="font-mono">{compare.fmt(line.unitPrice)}</span>
            {store ? ` · ${store.name}` : ''}
          </div>
        </div>
        {suggestions.length > 0 && (
          <div role="radiogroup" aria-labelledby="receipt-best" className="flex flex-col gap-2 mb-4">
            <h3 id="receipt-best" className={`m-0 ${sectionLabel}`}>
              Best matches
            </h3>
            {suggestions.map(option)}
          </div>
        )}
        <div className="flex items-center gap-2.5 bg-surface rounded-[14px] shadow-[inset_0_0_0_1.5px_var(--line)]" style={{ padding: '0 12px', height: 50 }}>
          <Icon name="search" size={19} color="var(--ink-soft)" stroke={2.2} />
          <label htmlFor="receipt-product-search" className="sr-only">
            Search other products
          </label>
          <input
            id="receipt-product-search"
            type="search"
            value={q}
            maxLength={60}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search other products"
            className="flex-1 min-w-0 bg-transparent outline-none border-none font-sans text-base"
          />
        </div>
        {q.trim() && (
          <div role="radiogroup" aria-label="Search results" className="flex flex-col gap-2 mt-2.5">
            {results.map(option)}
            {!results.length && <p className="m-0 text-[13.5px] text-ink-soft">Nothing called “{q.trim()}”.</p>}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <Btn variant="ghost" icon="plus" onClick={() => setAdding(true)} disabled={!compare.online}>
            Add as my product
          </Btn>
          <Btn variant="ghost" icon="x" onClick={() => onNotProduct(remember)}>
            Not a product
          </Btn>
        </div>
      </Sheet>
      <ProductFormSheet
        target={adding ? 'new' : null}
        initialName={tidyName(line.item.name)}
        onClose={() => setAdding(false)}
        onSaved={(p) => {
          setAdding(false);
          onPick(p.id, remember);
        }}
      />
    </>
  );
}

// ── Edit a line ──────────────────────────────────────────────────────────────
export function EditRowSheet({
  line,
  store,
  prices,
  onClose,
  onSave,
  onChange,
  onNotProduct,
}: {
  line: Line | null;
  store: CatalogStore | null;
  prices: Map<string, CurrentPrice>;
  onClose: () => void;
  onSave: (e: { unitPrice: number; quantity: number; include: boolean }) => void;
  /** Pick a different product. */
  onChange: () => void;
  onNotProduct: () => void;
}) {
  const compare = useCompare();
  const [price, setPrice] = useState('');
  const [qty, setQty] = useState('1');
  const [include, setInclude] = useState(true);
  useEffect(() => {
    if (!line) return;
    setPrice(String(line.unitPrice));
    setQty(String(line.quantity));
    setInclude(line.include || !line.saveable);
  }, [line?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!line) return null;

  const product = line.productId ? compare.productById(line.productId) : undefined;
  const raw = line.item.lines.join(' ') || line.item.name;
  const p = Number(price);
  const n = Math.round(Number(qty));
  const priceOk = Number.isFinite(p) && p > 0 && p <= MAX_UNIT_PRICE;
  const qtyOk = Number.isFinite(n) && n >= 1 && n <= 999;
  const medicine = line.group === 'medicine';
  const shared = store && !store.ownerId && !medicine && !product?.ownerId;
  const why =
    line.item.quantity > 1
      ? `The receipt shows ${compare.fmt(line.item.lineTotal)} for ${line.item.quantity}${line.item.discountPct ? ` after ${line.item.discountPct}% off` : ''}, so one is ${compare.fmt(line.item.unitPrice)}.`
      : line.item.discountPct
        ? `That’s after the ${line.item.discountPct}% off on the receipt.`
        : null;
  const here = product ? priceMeta(prices.get(product.id), compare.fmt) : null;

  return (
    <Sheet
      open
      onClose={onClose}
      title="Edit this line"
      footer={
        <div className="grid grid-cols-2 gap-2">
          <Btn variant="ghost" onClick={onNotProduct}>
            Not a product
          </Btn>
          <Btn onClick={() => onSave({ unitPrice: p, quantity: n, include: include && line.saveable })} disabled={!priceOk || !qtyOk}>
            Done
          </Btn>
        </div>
      }
    >
      <div className="font-mono text-[12.5px] rounded-[14px] bg-surface shadow-[inset_0_0_0_1px_var(--line)] mb-4 break-words" style={{ padding: '10px 12px' }}>
        {raw}
      </div>
      <div className="font-mono text-[12.5px] font-bold text-ink-soft mb-[7px] tracking-[0.04em] uppercase">Product</div>
      <button
        type="button"
        onClick={onChange}
        className="w-full flex items-center gap-3 text-left rounded-[16px] bg-surface shadow-[inset_0_0_0_1.5px_var(--line)] mb-4"
        style={{ padding: '10px 14px', minHeight: 60 }}
      >
        <span className="flex-1 min-w-0">
          <span className="block font-bold text-[14.5px] leading-snug line-clamp-2">{product?.name ?? (medicine ? tidyName(line.item.name) : 'Choose the product')}</span>
          <span className="block text-[12.5px] text-ink-soft truncate">{product ? here ?? (product.ownerId ? 'Your product' : 'Not priced here yet') : medicine ? 'Saved as your own product' : 'Not chosen yet'}</span>
        </span>
        <span className="shrink-0 font-extrabold text-[13.5px] text-accent-ink">Change</span>
      </button>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Price for one">
          <NumIn currency={compare.currency} value={price} min={0} step="any" onChange={(e) => setPrice(e.target.value)} aria-invalid={!priceOk} />
        </Field>
        <Field label="Bought">
          <TextIn type="number" inputMode="numeric" min={1} max={999} value={qty} onChange={(e) => setQty(e.target.value)} aria-invalid={!qtyOk} />
        </Field>
      </div>
      {why && <p className="m-0 -mt-1 mb-4 text-[13px] text-ink-soft leading-snug">{why}</p>}
      {line.saveable && (
        <div className="flex items-center gap-3 rounded-[16px] bg-surface shadow-[inset_0_0_0_1px_var(--line)]" style={{ padding: '10px 14px', minHeight: 60 }}>
          <span className="flex-1 min-w-0">
            <span className="block font-bold text-[14.5px]">Save this price</span>
            <span className="block text-[12.5px] text-ink-soft">
              {shared ? `Shared with others at ${store?.name}` : medicine ? 'Only you see medicine prices' : 'Only you see it'}
            </span>
          </span>
          <Toggle on={include} onChange={setInclude} label="Save this price" />
        </div>
      )}
    </Sheet>
  );
}
