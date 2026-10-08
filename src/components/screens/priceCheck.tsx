// Price checks while shopping (lazy, from the list): "What did it cost?" after
// "Different" on the tick toast, and "Done at <store>" when a store's part of a planned
// list is all ticked. Answers go through CompareContext.checkPrices (kept on this
// device when offline).
import { useEffect, useState } from 'react';
import { PriceCheck, useCompare } from '../../contexts/CompareContext';
import { AgeChip, Btn, ConfirmSheet, Icon, Sheet, ToggleTrack } from '../ui';
import { Field, NumIn } from './manageParts';
import { checkMessage, PriceAsk } from './priceCheckHelpers';

const validPrice = (v: number) => v > 0 && v < 10_000_000;

function PrivacyLine({ shared }: { shared: boolean }) {
  const compare = useCompare();
  return (
    <p className="m-0 text-[12.5px] leading-relaxed text-ink-soft">
      {shared ? `Shared with shoppers in ${compare.region?.name ?? 'your city'} without your name.` : 'Your own store: only you see its prices.'}
    </p>
  );
}

// ── "What did it cost?" ──────────────────────────────────────────────────────
export function PriceCheckSheet({
  ask,
  onClose,
  onDone,
}: {
  ask: PriceAsk | null;
  onClose: () => void;
  /** Called with the toast to show; `answered` when it was saved (or kept to send later). */
  onDone: (message: string, answered: boolean) => void;
}) {
  const compare = useCompare();
  const [price, setPrice] = useState('');
  const [gone, setGone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    setPrice('');
    setGone(false);
    setSaving(false);
    setError('');
  }, [ask?.itemId]);
  if (!ask) return null;

  const save = async () => {
    const value = parseFloat(price);
    if (!gone && !validPrice(value)) {
      setError('Enter the price you paid for one pack.');
      return;
    }
    setSaving(true);
    setError('');
    const r = await compare.checkPrices(
      [{ storeId: ask.storeId, productId: ask.productId, price: gone ? null : value, isAvailable: !gone, source: 'trip' }],
      'tick',
    );
    setSaving(false);
    if (!r) {
      setError('Couldn’t save — check your connection and try again.');
      return;
    }
    onDone(checkMessage(r, ask, gone ? 'gone' : 'changed', compare.fmt), true);
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="What did it cost?"
      footer={
        <Btn full size="lg" onClick={() => void save()} disabled={saving}>
          {saving ? 'Saving…' : 'Save price'}
        </Btn>
      }
    >
      <div className="flex flex-col gap-1 mb-4">
        <div className="font-bold text-[16px]">{ask.productName}</div>
        <div className="flex items-center gap-1.5 flex-wrap text-[13px] text-ink-soft">
          <span>
            {ask.storeName} · we had <span className="font-mono font-bold text-ink">{compare.fmt(ask.price)}</span>
          </span>
          <AgeChip observedAt={ask.observedAt} />
        </div>
      </div>
      {!gone && (
        <Field label="Price for one pack">
          <NumIn currency={compare.currency} value={price} onChange={(e) => setPrice(e.target.value)} placeholder={String(ask.price)} autoFocus />
        </Field>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={gone}
        onClick={() => setGone((v) => !v)}
        className="w-full flex items-center justify-between gap-3 text-left mb-3"
        style={{ minHeight: 52 }}
      >
        <span>
          <span className="block font-semibold text-[15px]">They didn’t have it</span>
          <span className="block text-[12.5px] text-ink-soft">Marks it out of stock there</span>
        </span>
        <ToggleTrack on={gone} />
      </button>
      {error && (
        <div role="alert" className="text-[13px] mb-2 text-danger">
          {error}
        </div>
      )}
      <PrivacyLine shared={ask.shared} />
    </Sheet>
  );
}

// ── "Done at <store>" ────────────────────────────────────────────────────────
type Answer = { state: 'right' } | { state: 'changed'; value: string } | { state: 'gone' };

export function StoreDoneSheet({
  storeName,
  asks,
  ticked,
  already,
  onSave,
  onNotNow,
}: {
  storeName: string;
  /** The ticked items still to check, with their prices. */
  asks: PriceAsk[];
  /** How many of the store's items are ticked ("All 6 in your cart"). */
  ticked: number;
  /** Names of the ones already checked from the tick toast. */
  already: string[];
  /** Saves the answers; false when they couldn't be saved. */
  onSave: (rows: PriceCheck[]) => Promise<boolean>;
  /** "Not now", or closed: no more questions for this store on this list for now. */
  onNotNow: () => void;
}) {
  const compare = useCompare();
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [discard, setDiscard] = useState(false);

  const answerOf = (id: string): Answer => answers[id] ?? { state: 'right' };
  const set = (id: string, a: Answer) => {
    setAnswers((cur) => ({ ...cur, [id]: a }));
    setError('');
  };
  const dirty = asks.some((a) => answerOf(a.itemId).state !== 'right');
  const n = asks.length;
  const shared = asks.some((a) => a.shared);

  const leave = () => (dirty ? setDiscard(true) : onNotNow());

  const save = async () => {
    const bad = asks.find((a) => {
      const x = answerOf(a.itemId);
      return x.state === 'changed' && !validPrice(parseFloat(x.value));
    });
    if (bad) {
      setError(`Enter the price for ${bad.itemName}, or tap Undo.`);
      return;
    }
    const rows: PriceCheck[] = asks.map((a) => {
      const x = answerOf(a.itemId);
      if (x.state === 'changed') return { storeId: a.storeId, productId: a.productId, price: parseFloat(x.value), isAvailable: true, source: 'trip' };
      if (x.state === 'gone') return { storeId: a.storeId, productId: a.productId, price: null, isAvailable: false, source: 'trip' };
      return { storeId: a.storeId, productId: a.productId, price: a.price, isAvailable: true, source: 'confirm' };
    });
    setSaving(true);
    setError('');
    const ok = await onSave(rows);
    setSaving(false);
    if (!ok) setError('Couldn’t save — check your connection and try again.');
  };

  if (discard) {
    return (
      <ConfirmSheet
        open
        title="Discard your answers?"
        icon="undo"
        confirmLabel="Discard answers"
        keepLabel="Keep editing"
        onConfirm={() => {
          setDiscard(false);
          onNotNow();
        }}
        onClose={() => setDiscard(false)}
      >
        <p className="m-0 text-[14.5px] leading-relaxed text-ink-soft">The prices you changed here won’t be saved, and we won’t ask about {storeName} again on this list today.</p>
      </ConfirmSheet>
    );
  }

  const label = dirty ? `Save ${n} ${n === 1 ? 'answer' : 'answers'}` : n === 1 ? 'It was right' : `All ${n} were right`;

  return (
    <Sheet
      open
      onClose={leave}
      title={`Done at ${storeName}`}
      footer={
        <div className="flex gap-2.5">
          <Btn variant="ghost" size="lg" onClick={leave} disabled={saving} className="whitespace-nowrap">
            Not now
          </Btn>
          <Btn full size="lg" className="flex-1 whitespace-nowrap" onClick={() => void save()} disabled={saving}>
            {saving ? 'Saving…' : label}
          </Btn>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="-mt-1">
          <span className="inline-flex items-center gap-1.5 text-[12.5px] font-extrabold text-ok-ink">
            <Icon name="check" size={15} stroke={2.6} />
            All {ticked} in your cart
          </span>
          <p className="m-0 mt-1 text-[14px] leading-snug text-ink-soft">Were these the prices? Change any that weren’t.</p>
        </div>
        {!compare.online && (
          <div role="status" className="flex gap-2.5 items-start rounded-[14px] bg-warn-wash text-warn-ink text-[13px] leading-snug" style={{ padding: '10px 12px' }}>
            <Icon name="wifiOff" size={16} stroke={2.3} className="shrink-0 mt-px" />
            <span>
              <strong>You’re offline.</strong> Your answers wait on this device and go out when you’re back online.
            </span>
          </div>
        )}
        <ul className="list-none m-0 p-0 rounded-[18px] bg-surface shadow-card overflow-hidden">
          {asks.map((a, i) => {
            const x = answerOf(a.itemId);
            return (
              <li
                key={a.itemId}
                className={`flex flex-wrap items-start gap-3 ${x.state === 'changed' ? 'bg-accent-wash' : ''}`}
                style={{ padding: '8px 8px 8px 14px', borderTop: i ? '1px solid var(--line)' : 'none' }}
              >
                <span
                  aria-hidden
                  className={`grid place-items-center rounded-full shrink-0 mt-1 ${
                    x.state === 'right' ? 'bg-ok-wash text-ok-ink' : x.state === 'changed' ? 'bg-accent text-accent-on' : 'bg-[var(--backdrop)] text-ink-soft'
                  }`}
                  style={{ width: 28, height: 28 }}
                >
                  <Icon name={x.state === 'right' ? 'check' : x.state === 'changed' ? 'edit' : 'x'} size={14} stroke={2.6} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className={`block font-bold text-[15px] ${x.state === 'gone' ? 'text-ink-soft' : ''}`}>{a.itemName}</span>
                  <span className="block text-[12.5px] text-ink-soft leading-snug line-clamp-2">
                    {a.productName}
                    {x.state === 'gone' ? ' · wasn’t there' : ''}
                  </span>
                  {x.state === 'changed' && (
                    <span className="flex items-center gap-1.5 mt-0.5 text-[12.5px] text-ink-soft">
                      was <span className="font-mono">{compare.fmt(a.price)}</span>
                      <AgeChip observedAt={a.observedAt} />
                    </span>
                  )}
                </span>
                {x.state === 'right' && (
                  <span className="shrink-0 flex flex-col items-end gap-[3px] mt-0.5">
                    <span className="font-mono text-[15px] font-bold">
                      {compare.fmt(a.price)}
                      {a.each ? <span className="font-sans text-[12px] font-semibold text-ink-soft"> each</span> : null}
                    </span>
                    <AgeChip observedAt={a.observedAt} />
                  </span>
                )}
                {x.state === 'right' ? (
                  <button
                    type="button"
                    onClick={() => set(a.itemId, { state: 'changed', value: '' })}
                    aria-label={`Change the price of ${a.itemName}`}
                    className="shrink-0 font-extrabold text-[13.5px] text-accent-ink"
                    style={{ minHeight: 44, padding: '0 6px' }}
                  >
                    Change
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => set(a.itemId, { state: 'right' })}
                    aria-label={`Undo: ${a.itemName} was ${compare.fmt(a.price)}`}
                    className="shrink-0 font-extrabold text-[13.5px] text-accent-ink"
                    style={{ minHeight: 44, padding: '0 6px' }}
                  >
                    Undo
                  </button>
                )}
                {x.state === 'changed' && (
                  <span className="basis-full flex gap-2" style={{ paddingLeft: 40 }}>
                    <span className="flex-1 min-w-0">
                      <NumIn
                        currency={compare.currency}
                        value={x.value}
                        onChange={(e) => set(a.itemId, { state: 'changed', value: e.target.value })}
                        placeholder={String(a.price)}
                        aria-label={`Price of ${a.itemName}`}
                        autoFocus
                      />
                    </span>
                    <button
                      type="button"
                      onClick={() => set(a.itemId, { state: 'gone' })}
                      className="shrink-0 rounded-[14px] bg-surface font-extrabold text-[13.5px] shadow-[inset_0_0_0_1.5px_var(--line)]"
                      style={{ minHeight: 48, padding: '0 12px' }}
                    >
                      Wasn’t there
                    </button>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        {already.length > 0 && <p className="m-0 mx-1 text-[13px] text-ink-soft leading-snug">Already checked: {already.join(', ')}.</p>}
        {error && (
          <div role="alert" className="text-[13px] text-danger">
            {error}
          </div>
        )}
        <PrivacyLine shared={shared} />
      </div>
    </Sheet>
  );
}
