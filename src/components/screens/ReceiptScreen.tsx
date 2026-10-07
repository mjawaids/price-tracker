import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { useCompare } from '../../contexts/CompareContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { trackUserAction } from '../../utils/analytics';
import { ageInDays, MAX_AGE_DAYS, OLDISH_DAYS } from '../../lib/receipt/dates';
import { cancelRead, readFiles, readText, retryRead } from '../../lib/receipt/flow';
import { lastStore } from '../../lib/receipt/memory';
import { OCR_MB, readerDownloaded } from '../../lib/receipt/ocr';
import { getReceipt, resetReceipt, setReceipt, useReceipt } from '../../lib/receipt/session';
import type { ReceiptSource, ReceiptState, RowEdit } from '../../lib/receipt/session';
import { Btn, Icon, Toast } from '../ui';
import { CompareNotice } from './compareParts';
import type { Group, Line } from './receiptHelpers';
import { guessKey, longDate, receiptDate, saveReceipt, shortDate, storeForGuess, todayISO, tooOld, useDeviceWord, useReview } from './receiptHelpers';
import {
  cardCls,
  GroupHeader,
  LineRow,
  NotProductsPanel,
  PrivacyNote,
  ProblemCard,
  ProgressBar,
  ScreenHeader,
  SkeletonRows,
  SourceTile,
  StepRow,
  SummaryChips,
} from './receiptParts';
import { ChooseProductSheet, DateSheet, EditRowSheet, PasteSheet, ReaderConsentSheet, StorePickerSheet } from './receiptSheets';

const track = (action: string, details: Record<string, unknown>) => {
  if (typeof window !== 'undefined' && typeof window.gtag !== 'undefined') trackUserAction(action, details);
};

/** Compare → Contribute → Add a receipt: read a receipt on the device, check it, save its prices. */
export default function ReceiptScreen() {
  const app = useApp();
  const { settings, updateSettings } = useSettings();
  const r = useReceipt();
  const { compact, isTablet } = useBreakpoint();
  const wide = !compact && !isTablet;
  const [pasteOpen, setPasteOpen] = useState(false);
  const back = () => (app.canGoBack ? app.back() : app.tab('contribute'));

  const paste = (
    <PasteSheet
      open={pasteOpen}
      onClose={() => setPasteOpen(false)}
      onRead={(text) => {
        setPasteOpen(false);
        readText(text);
      }}
    />
  );

  let body: JSX.Element;
  if (!settings.features.receipts) {
    body = (
      <>
        <ScreenHeader title="Add a receipt" onBack={back} />
        <div className="mt-5">
          <ProblemCard icon="receipt" title="Receipt import is off" body="Turn it on in Profile → Shopping features.">
            <Btn full onClick={() => updateSettings({ features: { ...settings.features, receipts: true } })}>
              Turn on
            </Btn>
          </ProblemCard>
        </div>
      </>
    );
  } else if (r.step.name === 'reading') {
    body = <ReadingStep r={r} onBack={back} />;
  } else if (r.step.name === 'failed') {
    body = <FailedStep r={r} onBack={back} onPaste={() => setPasteOpen(true)} />;
  } else if (r.step.name === 'review') {
    body = <ReviewStep r={r} wide={wide} onBack={back} />;
  } else if (r.step.name === 'saved') {
    body = (
      <SavedStep
        r={r}
        onDone={() => {
          resetReceipt();
          back();
        }}
      />
    );
  } else {
    body = <StartStep onBack={back} onPaste={() => setPasteOpen(true)} />;
  }
  const consent = r.step.name === 'consent' ? r.step : null;

  return (
    <div className="px-[18px] pt-3.5 pb-6 md:px-7 md:pt-6 mx-auto box-border min-h-full flex flex-col" style={{ maxWidth: wide && r.step.name === 'review' ? 1080 : 640 }}>
      {body}
      {paste}
      <ReaderConsentSheet
        open={!!consent && settings.features.receipts}
        kind={consent?.kind ?? 'image'}
        onClose={() => setReceipt({ step: { name: 'start' } })}
        onDownload={() => {
          if (consent) void readFiles(consent.files, consent.source, { consented: true });
        }}
        onPaste={() => {
          setReceipt({ step: { name: 'start' } });
          setPasteOpen(true);
        }}
      />
    </div>
  );
}

// ── 1 · Start ────────────────────────────────────────────────────────────────
function StartStep({ onBack, onPaste }: { onBack: () => void; onPaste: () => void }) {
  const app = useApp();
  const device = useDeviceWord();
  const pickRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  // A camera tile only where there's likely a camera to point (phones, tablets).
  const touch = useMemo(() => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches, []);

  const onFiles = (source: ReceiptSource) => (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    // Asks for the reader download first when it's needed (see flow.ts).
    if (files.length) void readFiles(files, source);
  };

  return (
    <>
      <ScreenHeader
        title="Add a receipt"
        onBack={onBack}
        action={
          <button
            type="button"
            onClick={() => app.openSheet('help', 'receipts')}
            aria-label="How receipts work"
            className="grid place-items-center rounded-full text-ink-soft shrink-0"
            style={{ width: 44, height: 44 }}
          >
            <Icon name="bulb" size={19} stroke={2.2} />
          </button>
        }
      />
      <p className="m-0 mt-[18px] mx-0.5 text-[15px] leading-relaxed text-ink-soft">
        Add a whole shop’s prices in one go — from an order screenshot, a PDF invoice, a photo of a till receipt, or copied text.
      </p>
      <div className="flex flex-col gap-2.5 mt-[18px]">
        <SourceTile icon="image" title="Screenshot or image" sub="Order screens from Imtiaz, Chase Up or Pandamart work best" onClick={() => pickRef.current?.click()} />
        <SourceTile icon="file" title="PDF" sub="An invoice from an email or app" onClick={() => pdfRef.current?.click()} />
        {touch && <SourceTile icon="camera" title="Take a photo" sub="A till receipt, flat and well lit" onClick={() => cameraRef.current?.click()} />}
        <SourceTile icon="clipboard" title="Paste text" sub="From an order email or message" onClick={onPaste} />
      </div>
      {/* Pictures and PDFs pick apart: image/* keeps Android's photo picker. */}
      <input ref={pickRef} type="file" accept="image/*" multiple className="hidden" tabIndex={-1} aria-hidden onChange={onFiles('image')} />
      <input ref={pdfRef} type="file" accept="application/pdf,.pdf" className="hidden" tabIndex={-1} aria-hidden onChange={onFiles('pdf')} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" tabIndex={-1} aria-hidden onChange={onFiles('photo')} />
      <div className="mt-4">
        <PrivacyNote>Read on your {device}. The receipt never leaves it — only the prices you confirm are saved. Medicines stay private to you.</PrivacyNote>
      </div>
      <div className="flex-1 min-h-6" />
      <div className="flex flex-col gap-1.5 mt-6">
        <h2 className="m-0 mx-0.5 text-[12.5px] font-extrabold tracking-[0.05em] uppercase text-ink-soft">Tips</h2>
        <ul className="m-0 pl-5 pr-0.5 text-[13.5px] text-ink-soft leading-relaxed">
          <li>Receipts from the last {MAX_AGE_DAYS} days can be added.</li>
          <li>Several screenshots of one order? Pick them together.</li>
        </ul>
      </div>
    </>
  );
}

// ── 3 · Reading ──────────────────────────────────────────────────────────────
function ReadingStep({ r, onBack }: { r: ReceiptState; onBack: () => void }) {
  const device = useDeviceWord();
  const [firstTime] = useState(() => !readerDownloaded());
  if (r.step.name !== 'reading') return null;
  const { count, progress, adding } = r.step;
  const stage = progress?.stage ?? 'download';
  const overall = !progress || stage === 'open' ? 0 : stage === 'download' ? progress.progress * 0.15 : 0.15 + progress.progress * 0.85;
  const read = stage === 'read' && (progress?.progress ?? 0) >= 1;
  const pdf = r.source === 'pdf';
  const noun = pdf ? 'PDF page' : r.source === 'photo' ? 'photo' : 'screenshot';
  return (
    <div aria-busy="true" className="flex flex-col flex-1">
      <ScreenHeader title={adding ? 'Reading another…' : 'Reading…'} onBack={onBack} />
      <div className={`${cardCls} flex gap-3.5 items-center mt-[18px]`} style={{ padding: 14 }}>
        <div aria-hidden className="grid place-items-center shrink-0 bg-[var(--backdrop)] text-ink-soft" style={{ width: 54, height: 72, borderRadius: 10 }}>
          <Icon name="receipt" size={26} stroke={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-extrabold text-[15.5px]">
            {stage === 'open' ? 'PDF' : `${count} ${noun}${count === 1 ? '' : 's'}`}
          </div>
          <div className="text-[13.5px] text-ink-soft mt-0.5">
            {stage === 'open' ? `Opening the PDF on your ${device}` : stage === 'download' && firstTime ? `Getting the reader (about ${OCR_MB} MB, once)` : `Reading on your ${device}`}
          </div>
          <div className="mt-2.5">
            <ProgressBar value={overall} label="Reading progress" />
          </div>
        </div>
        <div className="font-mono font-bold text-[14px] text-ink-soft" aria-hidden>
          {Math.round(overall * 100)}%
        </div>
      </div>
      <div className="flex flex-col gap-2 mt-[18px] px-1">
        <StepRow state={read ? 'done' : 'now'}>Reading the text</StepRow>
        <StepRow state={read ? 'now' : 'next'}>Finding items and prices</StepRow>
        <StepRow state="next">Matching products</StepRow>
      </div>
      <div className="mt-[22px]">
        <SkeletonRows />
      </div>
      <div className="flex-1 min-h-6" />
      <p className="m-0 mb-3 text-center text-[13.5px] text-ink-soft">Usually a few seconds. You can keep using the app.</p>
      <Btn full variant="ghost" onClick={cancelRead}>
        Cancel
      </Btn>
    </div>
  );
}

// ── 10 · Reading problems ────────────────────────────────────────────────────
function FailedStep({ r, onBack, onPaste }: { r: ReceiptState; onBack: () => void; onPaste: () => void }) {
  const device = useDeviceWord();
  if (r.step.name !== 'failed') return null;
  const again = () => resetReceipt();
  const pasteInstead = () => {
    resetReceipt();
    onPaste();
  };
  let card: JSX.Element;
  if (r.step.reason === 'nothing' && r.source === 'pdf') {
    card = (
      <ProblemCard icon="search" title="We couldn’t find any prices" body="This PDF doesn’t look like an order or a receipt. Try another one, or paste the order’s text.">
        <Btn full onClick={again}>
          Try another PDF
        </Btn>
        <Btn full variant="ghost" onClick={pasteInstead}>
          Paste text
        </Btn>
      </ProblemCard>
    );
  } else if (r.step.reason === 'pdf') {
    const p = r.step.problem;
    const [title, body] =
      p === 'password'
        ? ['This PDF is locked', 'It has a password, so it can’t be read here. Take a screenshot of the order instead, or paste its text.']
        : p === 'size'
          ? ['This PDF is too big', 'PDFs over 10 MB can’t be read. Take a screenshot of the order instead, or paste its text.']
          : p === 'unsupported'
            ? ['PDFs can’t be read on this browser', 'Update your browser to read PDFs here. A screenshot of the order works now, or paste its text.']
            : ['We couldn’t open that PDF', 'It may be damaged. Take a screenshot of the order instead, or paste its text.'];
    card = (
      <ProblemCard icon="file" tone="warn" title={title} body={body}>
        <Btn full onClick={again}>
          Try something else
        </Btn>
        <Btn full variant="ghost" onClick={pasteInstead}>
          Paste text instead
        </Btn>
      </ProblemCard>
    );
  } else if (r.step.reason === 'nothing') {
    card =
      r.source === 'text' ? (
        <ProblemCard icon="search" title="We couldn’t find any prices" body="Paste the part of the order with the items and their prices.">
          <Btn full onClick={pasteInstead}>
            Paste again
          </Btn>
        </ProblemCard>
      ) : (
        <ProblemCard icon="search" title="We couldn’t find any prices" body="Lay the receipt flat, in good light. Get the items and prices in the frame. A long receipt? Take two photos.">
          <Btn full onClick={again}>
            Try another {r.source === 'photo' ? 'photo' : 'picture'}
          </Btn>
          <Btn full variant="ghost" onClick={pasteInstead}>
            Paste text
          </Btn>
        </ProblemCard>
      );
  } else if (r.step.reason === 'image') {
    card = (
      <ProblemCard icon="image" tone="warn" title="We couldn’t open that picture" body={`Try a screenshot or a photo saved on your ${device}. Pictures over 15 MB can’t be read.`}>
        <Btn full onClick={again}>
          Try another picture
        </Btn>
      </ProblemCard>
    );
  } else {
    card = (
      <ProblemCard icon="wifiOff" tone="warn" title="The reader didn’t start" body="Check your connection and try again. Nothing was sent anywhere.">
        <Btn full onClick={() => retryRead() || again()}>
          Try again
        </Btn>
        <Btn full variant="ghost" onClick={pasteInstead}>
          Paste text instead
        </Btn>
      </ProblemCard>
    );
  }
  return (
    <>
      <ScreenHeader title="Add a receipt" onBack={onBack} />
      <div className="mt-5">{card}</div>
    </>
  );
}

// ── 4/5/12 · Review ──────────────────────────────────────────────────────────
type SheetState = { kind: 'store' } | { kind: 'date' } | { kind: 'choose'; id: string } | { kind: 'edit'; id: string } | null;
type SaveError = 'error' | 'rate_limit' | 'denied' | null;

const GROUPS: { id: Group; title: string; icon?: 'pill' }[] = [
  { id: 'ready', title: 'Ready to save' },
  { id: 'check', title: 'Check this' },
  { id: 'choose', title: 'Which product is this?' },
  { id: 'medicine', title: 'Medicines · only for you', icon: 'pill' },
  { id: 'already', title: 'Already added' },
];

function ReviewStep({ r, wide, onBack }: { r: ReceiptState; wide: boolean; onBack: () => void }) {
  const compare = useCompare();
  const { user } = useAuth();
  const device = useDeviceWord();
  const { store, storePrices, lines, notProducts, loading } = useReview(r);
  const prices = useMemo(() => new Map(storePrices.map((p) => [p.productId, p])), [storePrices]);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [notOpen, setNotOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<SaveError>(null);
  const moreRef = useRef<HTMLInputElement>(null);
  const uid = user?.id ?? null;

  // Find the store once: the one the receipt names, else the one picked last time
  // for this chain, else ask.
  useEffect(() => {
    if (r.storeLooked || !compare.ready) return;
    let off = false;
    void (async () => {
      let s = storeForGuess(compare.stores, r.guess);
      const key = guessKey(r.guess);
      if (!s && uid && key) {
        const id = await lastStore(uid, key);
        const last = id ? compare.storeById(id) : undefined;
        if (last && (!r.guess?.kind || last.kind === r.guess.kind)) s = last;
      }
      if (off) return;
      setReceipt({ storeId: s?.id ?? null, storeLooked: true });
      if (!s) setSheet({ kind: 'store' });
    })();
    return () => {
      off = true;
    };
  }, [r.storeLooked, compare.ready]); // eslint-disable-line react-hooks/exhaustive-deps

  const edit = (id: string, patch: RowEdit) => setReceipt((s) => ({ edits: { ...s.edits, [id]: { ...s.edits[id], ...patch } } }));
  const d = receiptDate(r);
  const parsed = r.parsed;
  if (!parsed) return null;

  const dateSheet = (
    <DateSheet
      open={sheet?.kind === 'date'}
      date={d.date}
      read={parsed.date?.date ?? null}
      alternative={parsed.date?.alternative ?? null}
      onClose={() => setSheet(null)}
      onPick={(date) => {
        setReceipt({ date });
        setSheet(null);
      }}
    />
  );

  // Too old to add (or a wrong date read).
  if (tooOld(d.date)) {
    return (
      <>
        <ScreenHeader title="Review prices" onBack={onBack} />
        <div className="mt-5">
          <ProblemCard
            icon="calendar"
            tone="warn"
            title="Too old to add"
            body={`This receipt is from ${longDate(d.date)}. Prices older than ${MAX_AGE_DAYS} days can’t be added — they’d mislead today’s comparisons.`}
          >
            <Btn full onClick={() => resetReceipt()}>
              Add a newer one
            </Btn>
            <Btn full variant="ghost" icon="calendar" onClick={() => setSheet({ kind: 'date' })}>
              Wrong date?
            </Btn>
          </ProblemCard>
        </div>
        {dateSheet}
      </>
    );
  }

  const byGroup = new Map<Group, Line[]>(GROUPS.map((g) => [g.id, []]));
  for (const l of lines) byGroup.get(l.group)?.push(l);
  const toSave = lines.filter((l) => l.include && l.saveable);
  const toCheck = lines.filter((l) => (l.group === 'check' || l.group === 'choose') && !l.include).length;
  const ready = byGroup.get('ready') ?? [];
  const n = toSave.length;
  const privateStore = !!store?.ownerId;
  const age = ageInDays(d.date);
  const chainName = store?.chain || store?.name || 'this shop';
  const canAddMore = r.source === 'image' || r.source === 'photo';
  const choosing = sheet?.kind === 'choose' ? lines.find((l) => l.id === sheet.id) ?? null : null;
  const editing = sheet?.kind === 'edit' ? lines.find((l) => l.id === sheet.id) ?? null : null;

  const save = async () => {
    if (!store || saving || !n) return;
    setSaving(true);
    setSaveError(null);
    const out = await saveReceipt(compare, uid, store, getReceipt(), lines);
    setSaving(false);
    if (out.ok) {
      setReceipt({ step: { name: 'saved', saved: out.saved } });
      return;
    }
    track('receipt_failed', { reason: `save_${out.reason}` });
    if (out.reason !== 'offline') setSaveError(out.reason);
  };

  const addMore = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length) void readFiles(files, r.source ?? 'image', { adding: true });
  };

  const intro = (() => {
    const items = parsed.items.length;
    const parts = [`Found ${items} ${items === 1 ? 'item' : 'items'}.`];
    if (ready.length) parts.push(`${ready.length} ${ready.length === 1 ? 'is' : 'are'} ready${toCheck ? ';' : '.'}`);
    if (toCheck) parts.push(`${toCheck} ${toCheck === 1 ? 'needs' : 'need'} a look.`);
    return parts.join(' ');
  })();

  const chips = (
    <SummaryChips
      store={store}
      date={d.date}
      dateUnsure={d.ambiguous}
      addsUp={parsed.addsUp}
      checkedAgainst={parsed.checkedAgainst}
      fmt={compare.fmt}
      onStore={() => setSheet({ kind: 'store' })}
      onDate={() => setSheet({ kind: 'date' })}
    />
  );

  const notes = (
    <>
      {r.addFailed && (
        <CompareNotice
          icon="alert"
          title="Couldn’t read that one"
          body="The rest of the receipt is still here."
          action={
            <Btn size="sm" variant="ghost" onClick={() => setReceipt({ addFailed: false })}>
              OK
            </Btn>
          }
        />
      )}
      {!store && r.storeLooked && (
        <CompareNotice
          icon="store"
          title="Where was this?"
          body="Pick the shop so we can match the items to its products."
          action={
            <Btn size="sm" onClick={() => setSheet({ kind: 'store' })}>
              Choose the shop
            </Btn>
          }
        />
      )}
      {privateStore && (
        <div className="flex gap-2.5 items-start rounded-[16px] bg-warn-wash text-warn-ink text-[13.5px] font-semibold leading-snug" style={{ padding: '12px 14px' }}>
          <Icon name="lock" size={17} stroke={2.2} className="shrink-0 mt-px" />
          <span>{store?.name} isn’t a shared store, so these prices are just for you.</span>
        </div>
      )}
      {age > OLDISH_DAYS && (
        <div className="flex gap-2.5 items-start rounded-[16px] bg-surface shadow-[inset_0_0_0_1px_var(--line)] text-[13.5px] text-ink-soft leading-snug" style={{ padding: '12px 14px' }}>
          <Icon name="history" size={17} stroke={2.2} className="shrink-0 mt-px" />
          <span>This receipt is {age} days old. Its prices are used only where there’s nothing newer.</span>
        </div>
      )}
      {parsed.addsUp === false && (
        <p className="m-0 mx-1 text-[13px] text-warn-ink font-semibold leading-snug">The items don’t add up to the receipt’s total — a price may have been misread. Tap a line to fix it.</p>
      )}
    </>
  );

  const offline = !compare.online;
  const saveLabel = saving
    ? 'Saving…'
    : !store
      ? 'Choose the shop first'
      : offline
        ? `Connect to save ${n} ${n === 1 ? 'price' : 'prices'}`
        : n
          ? `Save ${n} ${n === 1 ? 'price' : 'prices'}`
          : 'Nothing ticked to save';
  const saveSub = store ? `${privateStore ? `Only you see prices at ${store.name}` : `Shared with others at ${store.name}`}${toCheck ? ` · ${toCheck} still to check` : ''}` : null;

  const saveBox = (
    <div className="flex flex-col gap-2">
      {offline && <CompareNotice icon="wifiOff" title="You’re offline" body="Your receipt stays here. Connect to save the prices — nothing is lost." />}
      {saveError && (
        <div role="alert" className="rounded-[16px] bg-danger-wash text-[13.5px] leading-snug" style={{ padding: '12px 14px' }}>
          <div className="font-extrabold text-danger">{saveError === 'rate_limit' ? 'That’s a lot of prices for one day' : 'Couldn’t save'}</div>
          <div className="text-ink-soft mt-0.5">
            {saveError === 'rate_limit'
              ? 'Nothing from this receipt was saved. You can add it again tomorrow.'
              : saveError === 'denied'
                ? 'A price or the date was refused. Check the date and try again — nothing was lost.'
                : 'Check your connection and try again. Nothing was lost.'}
          </div>
        </div>
      )}
      <Btn full size="lg" onClick={() => (store ? void save() : setSheet({ kind: 'store' }))} disabled={!!store && (saving || offline || !n || saveError === 'rate_limit')}>
        {saveError === 'error' || saveError === 'denied' ? 'Try again' : saveLabel}
      </Btn>
      {saveSub && <p className="m-0 text-center text-[12.5px] text-ink-soft">{saveSub}</p>}
    </div>
  );

  const groups = loading ? (
    <div className="mt-5">
      <SkeletonRows />
    </div>
  ) : (
    <>
      {GROUPS.map((g) => {
        const rows = byGroup.get(g.id) ?? [];
        if (!rows.length) return null;
        const allOn = rows.every((l) => l.include);
        return (
          <section key={g.id} aria-labelledby={`receipt-${g.id}`}>
            <GroupHeader
              id={`receipt-${g.id}`}
              title={g.title}
              count={rows.length}
              icon={g.icon}
              action={
                g.id === 'ready' && rows.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => rows.forEach((l) => edit(l.id, { include: !allOn }))}
                    className="font-extrabold text-[13px] text-accent-ink"
                    style={{ minHeight: 44, padding: '0 4px' }}
                  >
                    {allOn ? 'Untick all' : 'Tick all'}
                  </button>
                ) : undefined
              }
            />
            <div className={`${cardCls} overflow-hidden`}>
              {rows.map((l, i) => (
                <LineRow
                  key={l.id}
                  line={l}
                  first={i === 0}
                  product={l.productId ? compare.productById(l.productId) : undefined}
                  shelfPrice={l.productId ? prices.get(l.productId)?.price ?? null : null}
                  fmt={compare.fmt}
                  onToggle={(on) => edit(l.id, { include: on })}
                  onOpen={() => setSheet(l.saveable ? { kind: 'edit', id: l.id } : { kind: 'choose', id: l.id })}
                  onChoose={() => setSheet({ kind: 'choose', id: l.id })}
                />
              ))}
            </div>
            {g.id === 'medicine' && <p className="m-0 mt-2 mx-1 text-[13px] text-ink-soft leading-snug">Saved as your own products. Nobody else sees medicine prices.</p>}
          </section>
        );
      })}
      {!lines.length && <p className="m-0 mt-5 mx-1 text-[14px] text-ink-soft">Every line here is marked as not a product.</p>}
      <NotProductsPanel items={notProducts} open={notOpen} onToggle={() => setNotOpen((o) => !o)} onRestore={(id) => edit(id, { notProduct: false })} fmt={compare.fmt} />
      {store && <p className="m-0 mt-3 mx-1 text-[13px] text-ink-soft leading-snug">We’ll remember what you choose for {chainName}, so next time these match on their own.</p>}
      <div className="flex flex-wrap gap-2 mt-4">
        {canAddMore && !wide && (
          <Btn variant="ghost" size="sm" icon="plus" onClick={() => moreRef.current?.click()}>
            Add another screenshot
          </Btn>
        )}
        <Btn variant="ghost" size="sm" icon="trash" onClick={() => resetReceipt()}>
          Discard this receipt
        </Btn>
      </div>
    </>
  );

  const sheets = (
    <>
      <StorePickerSheet
        open={sheet?.kind === 'store'}
        current={store}
        guess={r.guess}
        onClose={() => setSheet(null)}
        onPick={(s) => {
          setReceipt({ storeId: s.id, storeLooked: true });
          setSheet(null);
        }}
      />
      {dateSheet}
      <ChooseProductSheet
        line={choosing}
        store={store}
        prices={prices}
        chainName={chainName}
        onClose={() => setSheet(null)}
        onPick={(productId, remember) => {
          if (choosing) edit(choosing.id, { productId, include: true, remember, notProduct: false });
          setSheet(null);
        }}
        onNotProduct={(remember) => {
          if (choosing) edit(choosing.id, { notProduct: true, remember });
          setSheet(null);
        }}
      />
      <EditRowSheet
        line={editing}
        store={store}
        prices={prices}
        onClose={() => setSheet(null)}
        onSave={(e) => {
          if (editing) edit(editing.id, e);
          setSheet(null);
        }}
        onChange={() => editing && setSheet({ kind: 'choose', id: editing.id })}
        onNotProduct={() => {
          if (editing) edit(editing.id, { notProduct: true, remember: true });
          setSheet(null);
        }}
      />
    </>
  );

  const moreInput = <input ref={moreRef} type="file" accept="image/*" multiple className="hidden" tabIndex={-1} aria-hidden onChange={addMore} />;

  if (wide) {
    return (
      <>
        <ScreenHeader
          title="Review prices"
          onBack={onBack}
          action={
            canAddMore ? (
              <Btn variant="ghost" size="sm" icon="plus" onClick={() => moreRef.current?.click()}>
                Add another screenshot
              </Btn>
            ) : undefined
          }
        />
        <div className="grid gap-7 mt-5 items-start" style={{ gridTemplateColumns: '320px minmax(0, 1fr)' }}>
          <aside aria-label="Receipt summary" className="sticky top-4 flex flex-col gap-4">
            <div className={`${cardCls} flex flex-col gap-3`} style={{ padding: 16 }}>
              {chips}
              <dl className="m-0 flex flex-col text-[14px]">
                {GROUPS.map((g) => {
                  const c = byGroup.get(g.id)?.length ?? 0;
                  return c ? (
                    <div key={g.id} className="flex justify-between border-t border-line first:border-t-0" style={{ padding: '8px 2px' }}>
                      <dt className="text-ink-soft">{g.id === 'choose' ? 'Which product?' : g.id === 'medicine' ? 'Medicines' : g.title}</dt>
                      <dd className="m-0 font-mono font-bold">{c}</dd>
                    </div>
                  ) : null;
                })}
                {notProducts.length > 0 && (
                  <div className="flex justify-between border-t border-line" style={{ padding: '8px 2px' }}>
                    <dt className="text-ink-soft">Not products</dt>
                    <dd className="m-0 font-mono font-bold">{notProducts.length}</dd>
                  </div>
                )}
              </dl>
            </div>
            {notes}
            <p className="m-0 mx-1 text-[13px] text-ink-soft leading-snug">Read on this {device}. The receipt isn’t uploaded or kept — only the prices you save.</p>
            {saveBox}
          </aside>
          <section aria-label="Items on the receipt" className="min-w-0">
            <p className="m-0 mx-1 text-[14px] text-ink-soft leading-snug">{intro}</p>
            {groups}
          </section>
        </div>
        {moreInput}
        {sheets}
      </>
    );
  }

  return (
    <>
      <ScreenHeader title="Review prices" onBack={onBack} />
      <div className="mt-4">{chips}</div>
      <p className="m-0 mt-3 mx-1 text-[14px] text-ink-soft leading-snug">{intro}</p>
      <div className="flex flex-col gap-2.5 mt-3 empty:hidden">{notes}</div>
      {groups}
      <div className="flex-1 min-h-4" />
      <div className="sticky bottom-0 -mx-[18px] md:-mx-7 mt-4 bg-paper border-t border-line safe-bottom" style={{ padding: '12px 18px 14px' }}>
        {saveBox}
      </div>
      {moreInput}
      {sheets}
    </>
  );
}

// ── 9 · Saved ────────────────────────────────────────────────────────────────
function SavedStep({ r, onDone }: { r: ReceiptState; onDone: () => void }) {
  const compare = useCompare();
  const [undoing, setUndoing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  if (r.step.name !== 'saved') return null;
  const s = r.step.saved;
  const store = compare.storeById(s.storeId);
  const name = store?.name ?? 'this shop';
  const shared = !!store && !store.ownerId;
  const total = s.accepted + s.pending;
  const sharedNow = shared ? Math.max(0, s.accepted - s.onlyYou) : 0;
  const when = s.date === todayISO() ? 'today' : shortDate(s.date);

  const undo = async () => {
    setUndoing(true);
    const ok = await compare.retractReports(s.storeId, s.ids, s.productIds);
    setUndoing(false);
    if (ok) setReceipt({ step: { name: 'review' } });
    else setToast('Couldn’t undo — check your connection and try again.');
  };

  const item = (icon: 'check' | 'lock' | 'history' | 'bulb' | 'receipt', tone: 'ok' | 'warn' | 'plain', text: string) => (
    <li className="flex gap-3 items-start border-t border-line first:border-t-0 text-[14.5px] leading-snug" style={{ padding: 14 }}>
      <span
        className={`grid place-items-center shrink-0 ${tone === 'ok' ? 'bg-ok-wash text-ok-ink' : tone === 'warn' ? 'bg-warn-wash text-warn-ink' : 'bg-[var(--backdrop)] text-ink-soft'}`}
        style={{ width: 30, height: 30, borderRadius: 10 }}
      >
        <Icon name={icon} size={16} stroke={2.4} />
      </span>
      <span className="pt-1">{text}</span>
    </li>
  );

  return (
    <>
      <div className="flex flex-col items-center text-center mt-8">
        <span className="grid place-items-center bg-ok-wash text-ok-ink animate-sl-pop motion-reduce:animate-none" style={{ width: 72, height: 72, borderRadius: 24 }}>
          <Icon name="checkCircle" size={36} stroke={2} />
        </span>
        <h1 className="m-0 mt-4 font-display font-extrabold text-[26px] tracking-[-0.02em]">
          {total} {total === 1 ? 'price' : 'prices'} saved
        </h1>
        <p className="m-0 mt-1.5 text-[15px] text-ink-soft leading-snug max-w-[320px]">
          {sharedNow ? `Thanks — shoppers at ${name} will see ${when === 'today' ? 'today’s' : 'these'} prices.` : `Only you see these prices at ${name}.`}
        </p>
      </div>
      <ul className={`${cardCls} m-0 mt-6 p-0 list-none`}>
        {sharedNow > 0 && item('check', 'ok', `${sharedNow} shared at ${name} · ${when}`)}
        {s.pending > 0 &&
          item('history', 'warn', `${s.pending} kept just for you for now — ${s.pending === 1 ? 'it’s' : 'they’re'} far from the usual price here. ${s.pending === 1 ? 'It counts' : 'They count'} once others see the same.`)}
        {shared && s.onlyYou > 0 && item('lock', 'plain', `${s.onlyYou} only for you — medicines and your own products stay private.`)}
        {!shared && item('lock', 'plain', `${total} saved at ${name} · ${when} — only you see them.`)}
        {s.remembered > 0 && item('bulb', 'plain', `${s.remembered} ${s.remembered === 1 ? 'choice' : 'choices'} remembered — ${s.remembered === 1 ? 'it’ll' : 'they’ll'} match on ${s.remembered === 1 ? 'its' : 'their'} own next time.`)}
        {item('receipt', 'plain', `${s.skipped ? `${s.skipped} ${s.skipped === 1 ? 'line wasn’t' : 'lines weren’t'} added. ` : ''}The receipt itself wasn’t kept.`)}
      </ul>
      <div className="flex-1 min-h-6" />
      <div className="flex flex-col gap-2 mt-6">
        <Btn full size="lg" onClick={onDone}>
          Done
        </Btn>
        <div className="grid grid-cols-2 gap-2">
          <Btn variant="ghost" icon="plus" onClick={() => resetReceipt()}>
            Add another
          </Btn>
          <Btn variant="ghost" icon="undo" onClick={() => void undo()} disabled={undoing || !compare.online}>
            {undoing ? 'Undoing…' : 'Undo'}
          </Btn>
        </div>
      </div>
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50" style={{ width: 'min(440px, calc(100vw - 32px))' }}>
          <Toast message={toast} icon="alert" onDismiss={() => setToast(null)} />
        </div>
      )}
    </>
  );
}
