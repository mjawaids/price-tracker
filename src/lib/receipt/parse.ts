// Receipt lines → items (name, quantity, price for one after the item's own discount),
// fees, discounts, totals and the header (for the store). One pass, no layout templates:
// each item's numbers are explained by arithmetic (qty × rate − discount = total), which
// also tells a quantity from a row number, a GST column or a discount column.
//
// Layouts it was tuned on (all seen in Karachi receipts):
//   "1x Name Rs. 140.00" / "7x Name Rs. 350.00" (line total)        — app screenshots
//   "1 x Name 230.00" + the name again on the next line               — app screenshot
//   "Name Rs. 4,009.00" + "Pcs x1" (rest of the name, quantity)       — app screenshot
//   "Name" + "10 96.00 0.00 960.00" (qty, price, discount, total)     — printed invoice
//   "1 NAME 2265" + "710535717914 2,265.00" (barcode, total)          — till, sections
//   "28 NAME" + "Total: … Less Disc.(12.00%): …" + "71.43" + "PH03318 1,760.04"
//   "A189477 156.78 28.22 1.00 185.00" + "Name" (price, GST, qty, amount)
//   "1 [CAP0210]-NAME 30 11.00 15 280.50" + "CAP" + "30-OCT-27 44938" (expiry row)
//   "1 [PON-000877]- 2 3,600 7 6,696" + name lines
//   "7 NAME 20MG CAP 29.05 10.00 183.00" (qty, rate, disc %, amount)
//   "HERBAL" + "1x SYRUP120ML 0 180 180" + "1S" (name around the numbers)
import { parseSize } from '../compare/productName.ts';
import { findDate } from './dates.ts';
import type { ReceiptDate } from './dates.ts';
import { hasLetters, money, toLines, tokenize, trailingAmounts } from './text.ts';
import type { TextLine, Token } from './text.ts';

export interface ReceiptItem {
  id: string;
  /** Name as printed (lines joined), without quantity markers. */
  name: string;
  /** The printed lines it came from. */
  lines: string[];
  quantity: number;
  /** Price for one, after the item's own discount. */
  unitPrice: number;
  /** Line total as printed. */
  lineTotal: number;
  discountPct: number | null;
  /** The name was cut off ("Chocolate Filled C…"). */
  truncated: boolean;
  /** Section header above it ("pharmacy", "grocery"). */
  section: string | null;
  /** Store code printed with it ("TAB0078", "PH01452", a barcode). */
  code: string | null;
  /** Lowest OCR confidence of its lines (0–100), null for pasted text. */
  confidence: number | null;
  /** Its numbers agree with each other (qty × price − discount = total). */
  consistent: boolean;
}

export type SummaryKind = 'subtotal' | 'total' | 'fee' | 'discount' | 'tax' | 'payment';

export interface SummaryLine {
  kind: SummaryKind;
  label: string;
  amount: number;
}

export interface ParsedReceipt {
  items: ReceiptItem[];
  summary: SummaryLine[];
  /** Lines above the items (store name, address, order details). */
  header: string[];
  /** Sum of the items' printed line totals. */
  itemsSum: number;
  /** Items (or items + fees) match a printed subtotal/total; null when none was printed. */
  addsUp: boolean | null;
  /** The printed total the items were checked against. */
  checkedAgainst: number | null;
  date: ReceiptDate | null;
  /** Lines read (after cleaning). */
  lineCount: number;
}

// ── Line classes ─────────────────────────────────────────────────────────────
const SECTION = /^(?:grocery|groceries|pharmacy|medicines?|general(?: items?)?|cosmetics?|household|frozen|bakery|fresh|dairy|beverages?|food|sales items?)\s*:?$/i;
const ITEMS_START = /^(?:items?|item list|order items|your order|order summary|products?)\s*:?$/i;
const HEADER_WORDS = new Set([
  'qty', 'quantity', 'description', 'desc', 'item', 'items', 'name', 'product', 'price', 'rate', 'total', 'amount',
  'amt', 'gst', 'disc', 'dis', 'discount', 'box', 'pcs', 'unit', 'mrp', 's.no', 'sno', '#', 'sr', 'tax', 'value', 'net',
]);

const COUNT = /^(?:no\.?\s*of\s*items|#\s*of\s*items|total\s*items?(?:\(s\))?|total\s*qty|total\s*quantity|items?\s*count)\b/i;
const SUMMARY: [SummaryKind, RegExp][] = [
  ['subtotal', /^(?:sub\s*-?\s*total|gross\s*(?:amount|total)|item\s*total|total\s*before)\b/i],
  ['discount', /^(?:less\b|discount|disc\s*amount|promo|voucher|coupon|you\s*saved|saved|scheme|special\s*discount|offer)\b/i],
  ['tax', /^(?:tax\b|gst\b|sales?\s*tax|vat\b|fed\b)/i],
  ['fee', /^(?:delivery\s*(?:fee|charges?)|packaging|packing|platform|pos\s*(?:fee|charges?)|fbr\s*(?:fee|charges?|pos)|service\s*(?:fee|charges?)|bag\b|handling|convenience|rider|tip\b|small\s*order|bank\s*charges?)/i],
  ['total', /^(?:grand\s*total|total\b|net\s*(?:amount|total|payable)|bill\s*(?:inclusive|amount)|invoices?\s*value|amount\s*payable|payable|cash\s*amount)/i],
  ['payment', /^(?:cash\b|card\b|credit|debit|change|received|paid|payment|tender|balance|amount\s*received|jazz\s*cash|easy\s*paisa|cod\b)/i],
];
const META = /^(?:date|time|receipt|order|invoice|ntn|strn|s\.?t\.?r\.?n|gst\s*(?:#|no|number)|contact|phone|ph\b|tel\b|mobile|cell|whatsapp|address|customer|patient|gender|cashier|operator|user|shift|pos\s*name|terminal|counter|branch|transaction|trans\b|fbr\s*inv|manual|number|delivered|delivery\s*(?:address|time|slot|to)|payment\s*(?:method|mode)|order\s*type|helpline|member|points|loyalty|amount\s*in\s*words|thank|powered|printed|print\b|software|designed|verify|note\b|exchange|refund|www\.|https?:|e-?mail|expiry|batch|original|duplicate|sale\s*receipt|sales\s*receipt|cash\s*memo|this\s*is)/i;

/** Kifayah-style item detail: "Total: 146 Less Disc.(12.00%): 17.52". */
const ITEM_DISC = /^total\s*:?\s*([\d,.]+)\s*less\s*disc[^(\d]*\(?\s*([\d.]+)\s*%\s*\)?\s*:?\s*([\d,.]+)/i;
/** Expiry/batch row under an item: "30-OCT-27 44938", "30-NOV-27 | 24-May-2026". */
const EXPIRY_ROW = /^\d{1,2}-[a-z]{3}-\d{2,4}\b/i;
/** A barcode or item code on its own line: "(726529872415)", "PH01452". */
const CODE_ONLY = /^\(?[a-z]{0,4}[\d*]{6,}\)?$|^[a-z]{1,4}\d{4,}$/i;
/** Leading code before amounts: "PH03318", "A189477", "8964003083832", "7*5114675057". */
const LEAD_CODE = /^(?:[a-z]{0,4}[\d*]{6,}|[a-z]{1,4}\d{4,})$/i;

// Quantity markers
const QTY_X = /^(\d{1,4})\s*[x×]\s+/i; // "1x ", "7x ", "1 x "
// "28 GENERIC TAB" (not "120 ML", the end of a name)
const QTY_PLAIN = /^(\d{1,4})\s+(?!(?:kgs?|g|gms?|grams?|mg|mls?|l|ltrs?|litres?|liters?|pcs?|pieces?|tabs?|caps?|s|'s)\b)(?=\S*[a-z])/i;
const ROW_CODE = /^(\d{1,3})\s+\[([^\]]{2,20})\]\s*-?\s*/; // "1 [CAP0210]-"
const TRAIL_X = /\s[x×«]\s?(\d{1,3})$/i; // "… 200Gm x1" (the reader sometimes sees "«1")
// A "1x" column the reader garbled ("ux Choco", "x Choco"): only on receipts that use "1x".
const QTY_X_NOISY = /^(?:[uUlIi|])?[x×]\s+(?=[a-z])/i;

interface Info {
  text: string;
  confidence: number | null;
  tokens: Token[];
  amounts: number[];
  /** Index of the first trailing amount token. */
  amountStart: number;
  letters: boolean;
  numbersOnly: boolean;
}

interface Draft {
  qty: number | null;
  rowNumber: boolean;
  code: string | null;
  nameParts: string[];
  prefix: string[];
  nums: number[];
  /** The amounts as printed, when they ended a name line (a misread size may hide there). */
  numTexts: string[];
  /** A quantity column we couldn't read ("ux Name"): the row gets checked. */
  qtyUnclear: boolean;
  discPct: number | null;
  /** Opened by "qty NAME [price]" on a till receipt: its total may follow on a code line. */
  awaitingCode: boolean;
  /** Numbers came first; the name is on the lines after. */
  nameAfter: boolean;
  /** Took one continuation line already. */
  continued: boolean;
  /** An expiry row ended it: no more name lines. */
  closed: boolean;
  section: string | null;
  lines: string[];
  confidence: number | null;
}

const minConf = (a: number | null, b: number | null) => (a == null ? b : b == null ? a : Math.min(a, b));
const isHeaderRow = (i: Info) => {
  if (i.amounts.length) return false;
  const words = i.text.toLowerCase().replace(/[.:%()]/g, ' ').split(/\s+/).filter(Boolean);
  return new Set(words.filter((w) => HEADER_WORDS.has(w))).size >= 3;
};
const summaryKind = (text: string): SummaryKind | 'count' | null => {
  if (COUNT.test(text)) return 'count';
  for (const [k, re] of SUMMARY) if (re.test(text)) return k;
  return null;
};
const normName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
/** Same name read twice, a word or two misread: starts alike, mostly the same words. */
function sameName(a: string, b: string): boolean {
  const x = a.split(' ');
  const y = b.split(' ');
  if (x.length < 2 || y.length < 2 || x[0] !== y[0] || x[1] !== y[1]) return false;
  const ys = new Set(y);
  const shared = x.filter((w) => ys.has(w)).length;
  return shared / Math.max(x.length, y.length) >= 0.6;
}
/** Units the reader misreads: "600MI" → "600ml", "1Itr" → "1ltr". */
const fixUnits = (s: string) => s.replace(/(\d\s?[mM])[I1|](?![a-zA-Z])/g, '$1l').replace(/(\d\s?)[I|](tr|TR)(?![a-zA-Z])/g, '$1l$2');

/** Read a receipt. `now` is used for the date (tests pass a fixed one). */
export function parseReceipt(raw: string | TextLine[], now: Date = new Date()): ParsedReceipt {
  const lines = toLines(raw);
  const infos: Info[] = lines.map((l) => {
    // OCR reads "1x" as "lx" / "Ix" / "|x"
    const text = l.text.replace(/^[lI|]\s?[x×]\s/, '1x ');
    const tokens = tokenize(text);
    const { amounts, start } = trailingAmounts(tokens);
    const letters = hasLetters(text.replace(/^(?:rs\.?|pkr)\s*/i, '').replace(/\b(?:rs\.?|pkr)\b/gi, ''));
    return {
      text,
      confidence: l.confidence ?? null,
      tokens,
      amounts,
      amountStart: start,
      letters,
      numbersOnly: !letters && amounts.length > 0 && start === 0,
    };
  });

  const usesX = infos.filter((i) => QTY_X.test(i.text)).length >= 2;

  // When prices are marked ("Rs. 140.00"), a bare number ends a name, not a price.
  if (infos.filter((i) => i.tokens.some((t) => t.marked)).length >= 3) {
    for (const i of infos) {
      if (i.tokens.some((t) => t.marked) || summaryKind(i.text)) continue;
      i.amounts = [];
      i.amountStart = i.tokens.length;
      i.numbersOnly = false;
    }
  }

  const items: ReceiptItem[] = [];
  const summary: SummaryLine[] = [];
  const header: string[] = [];
  let phase: 'header' | 'items' | 'footer' = 'header';
  let section: string | null = null;
  // The item being read, and name lines waiting for the next item.
  const st: { open: Draft | null; pending: string[] } = { open: null, pending: [] };

  const newDraft = (over: Partial<Draft>, info: Info): Draft => ({
    qty: null, rowNumber: false, code: null, nameParts: [], prefix: [], nums: [], numTexts: [], qtyUnclear: false, discPct: null,
    awaitingCode: false, nameAfter: false, continued: false, closed: false, section,
    lines: [info.text], confidence: info.confidence, ...over,
  });
  const finish = () => {
    if (st.open) {
      const item = finalize(st.open, items.length);
      if (item) items.push(item);
    }
    st.open = null;
  };
  const startItem = (d: Draft) => {
    finish();
    if (st.pending.length) {
      d.prefix = st.pending;
      st.pending = [];
    }
    st.open = d;
    phase = 'items';
  };

  for (let i = 0; i < infos.length; i++) {
    const info = infos[i];
    const text = info.text;
    const next = infos[i + 1];

    // ── Footer: totals, fees, payments ───────────────────────────────────────
    const kind = /^\d/.test(text) && !COUNT.test(text) ? null : summaryKind(text);
    if (kind && !ITEM_DISC.test(text)) {
      const rec = summaryFrom(kind, info);
      if (rec) summary.push(rec);
      if ((kind === 'subtotal' || kind === 'total' || kind === 'count') && (items.length || st.open)) {
        finish();
        st.pending = [];
        phase = 'footer';
      }
      continue;
    }
    if (phase === 'footer') continue;

    // ── Structure lines ──────────────────────────────────────────────────────
    if (isHeaderRow(info) || ITEMS_START.test(text)) {
      finish();
      st.pending = [];
      if (phase === 'header') phase = 'items';
      continue;
    }
    if (SECTION.test(text)) {
      finish();
      st.pending = [];
      section = text.replace(/:$/, '').trim().toLowerCase();
      if (section.startsWith('sales item')) section = null;
      if (phase === 'header') phase = 'items';
      continue;
    }

    // ── Details that belong to the item above ───────────────────────────────
    const disc = text.match(ITEM_DISC);
    if (disc) {
      const d = st.open;
      if (d) {
        d.discPct = Number(disc[2]);
        d.lines.push(text);
      }
      continue;
    }
    if (EXPIRY_ROW.test(text)) {
      const d = st.open;
      if (d) d.closed = true;
      continue;
    }
    if (CODE_ONLY.test(text)) continue;

    // ── Lines with amounts ──────────────────────────────────────────────────
    if (info.amounts.length) {
      const lead = info.tokens[0]?.text ?? '';
      // Code + amounts: "PH03318 1,760.04", "A189477 156.78 28.22 1.00 185.00"
      if (info.amountStart === 1 && LEAD_CODE.test(lead) && phase !== 'header') {
        const d = st.open;
        if (d && d.awaitingCode) {
          d.nums.push(...info.amounts);
          d.code = d.code ?? lead;
          d.awaitingCode = false;
          d.lines.push(text);
          d.confidence = minConf(d.confidence, info.confidence);
        } else {
          startItem(newDraft({ code: lead, nums: info.amounts, nameAfter: true }, info));
        }
        continue;
      }
      // Numbers only: "3455", "71.43", "10 96.00 0.00 960.00"
      if (info.numbersOnly) {
        const d = st.open;
        if (d && !d.closed && (d.awaitingCode || (!d.nums.length && !d.nameAfter))) {
          d.nums.push(...info.amounts);
          d.lines.push(text);
          d.confidence = minConf(d.confidence, info.confidence);
        } else if (st.pending.length && (info.amounts.length >= 2 || info.tokens.some((t) => t.marked))) {
          startItem(newDraft({ nums: info.amounts }, info));
        }
        continue;
      }
      // Name + amounts
      const parsed = leadOf(text, usesX);
      const nameText = info.tokens
        .slice(0, info.amountStart)
        .map((t) => t.text)
        .join(' ')
        .slice(parsed.cut)
        .trim();
      if (phase === 'header') {
        // Above the items, only clear item lines count (a quantity, a row code or "Rs.").
        const clear = parsed.qty != null || parsed.rowCode != null || info.tokens.some((t) => t.marked);
        if (!clear || META.test(text)) {
          header.push(text);
          continue;
        }
      } else if (!parsed.qty && !parsed.rowCode && META.test(text) && !info.tokens.some((t) => t.marked)) {
        continue;
      }
      const qtyPlain = parsed.qty != null && !parsed.x;
      startItem(
        newDraft(
          {
            qty: parsed.rowCode ? null : parsed.qty,
            rowNumber: !!parsed.rowCode,
            code: parsed.rowCode,
            nameParts: nameText ? [nameText] : [],
            nums: info.amounts,
            numTexts: info.tokens.slice(info.amountStart).map((t) => t.text),
            qtyUnclear: !!parsed.unclear,
            awaitingCode: qtyPlain && info.amounts.length === 1,
            nameAfter: !nameText,
          },
          info,
        ),
      );
      continue;
    }

    // ── Text without amounts ────────────────────────────────────────────────
    const parsed = leadOf(text, usesX);
    // Above the items only "1x Name" with its price on the next line starts one.
    if (phase === 'header' && !(parsed.x && next?.numbersOnly)) {
      header.push(text);
      continue;
    }
    if (META.test(text)) continue;
    if ((parsed.qty != null || parsed.unclear) && /[a-z]{2}/i.test(text.slice(parsed.cut))) {
      // "1 MORINAGA BF-3 900GM VANILA" (till: price and total on the next lines),
      // "1x Choco Lava" + "Rs. 320.00" (pasted text split the line)
      startItem(newDraft({ qty: parsed.qty, nameParts: [text.slice(parsed.cut).trim()], awaitingCode: !parsed.x, qtyUnclear: !!parsed.unclear }, info));
      continue;
    }
    if (parsed.rowCode) {
      startItem(newDraft({ code: parsed.rowCode, rowNumber: true, nameParts: [text.slice(parsed.cut).trim()].filter(Boolean), nameAfter: true }, info));
      continue;
    }
    // A name line that belongs to the numbers on the next line
    if (next && next.numbersOnly && (next.amounts.length >= 2 || next.tokens.some((t) => t.marked)) && !st.open?.awaitingCode) {
      st.pending.push(text);
      continue;
    }
    const d = st.open;
    if (d && !d.closed) {
      const joined = normName([...d.prefix, ...d.nameParts].join(' '));
      const line = normName(text);
      if (line && (joined === line || joined.startsWith(line) || joined.endsWith(line) || sameName(joined, line))) {
        // The name printed twice: keep the print that has a size ("2509" was "250g")
        if (!parseSize(joined) && parseSize(text)) {
          d.nameParts = [text];
          d.prefix = [];
        }
        d.lines.push(text);
        continue;
      }
      if (d.nameAfter || !d.continued || /[-/]$/.test(d.nameParts[d.nameParts.length - 1] ?? '')) {
        d.nameParts.push(text);
        d.lines.push(text);
        d.confidence = minConf(d.confidence, info.confidence);
        if (!d.nameAfter) d.continued = true;
        continue;
      }
    }
    st.pending.push(text);
  }
  finish();

  const itemsSum = money(items.reduce((a, it) => a + it.lineTotal, 0));
  const { addsUp, against } = checkTotal(itemsSum, summary);
  return {
    items,
    summary,
    header,
    itemsSum,
    addsUp,
    checkedAgainst: against,
    date: findDate(lines.map((l) => l.text), now),
    lineCount: lines.length,
  };
}

/** Quantity / row-code prefix of a line, and how many characters it takes. */
function leadOf(text: string, usesX = false): { qty: number | null; x: boolean; rowCode: string | null; cut: number; unclear?: boolean } {
  if (usesX) {
    const noisy = text.match(QTY_X_NOISY);
    if (noisy) return { qty: null, x: true, rowCode: null, cut: noisy[0].length, unclear: true };
  }
  const row = text.match(ROW_CODE);
  if (row) return { qty: Number(row[1]), x: false, rowCode: row[2], cut: row[0].length };
  const x = text.match(QTY_X);
  if (x) return { qty: Number(x[1]), x: true, rowCode: null, cut: x[0].length };
  const plain = text.match(QTY_PLAIN);
  if (plain && Number(plain[1]) > 0) return { qty: Number(plain[1]), x: false, rowCode: null, cut: plain[0].length };
  return { qty: null, x: false, rowCode: null, cut: 0 };
}

function summaryFrom(kind: SummaryKind | 'count', info: Info): SummaryLine | null {
  const label = info.text.replace(/[\s:.-]*(?:rs\.?|pkr)?\s*[\d,.]+\s*(?:free)?$/i, '').trim() || info.text;
  if (kind === 'count') {
    // Drop the counts ("No of Items = 6 Total Quantity = 33 8,646.15" → 8,646.15)
    const rest = info.text.replace(/(?:items?(?:\(s\))?|quantity|qty)\s*[:=]?\s*\d+(?:\.\d+)?/gi, ' ');
    const disc = rest.match(/discount\s*:?\s*([\d,.]+)/i);
    if (disc) return { kind: 'discount', label: 'Discount', amount: Number(disc[1].replace(/,/g, '')) };
    const nums = trailingAmounts(tokenize(rest.trim())).amounts;
    return nums.length ? { kind: 'subtotal', label, amount: nums[nums.length - 1] } : null;
  }
  if (kind === 'fee' && /\bfree\b/i.test(info.text)) return { kind, label, amount: 0 };
  const nums = info.amounts.length ? info.amounts : info.tokens.filter((t) => t.amount != null).map((t) => t.amount as number);
  if (!nums.length) return null;
  return { kind, label, amount: Math.abs(nums[nums.length - 1]) };
}

// ── Numbers → quantity and price ─────────────────────────────────────────────
/** Highest believable price for one item on a grocery/pharmacy receipt (PKR). */
export const MAX_UNIT_PRICE = 100_000;
const isCount = (n: number) => n >= 1 && n <= 999 && Math.abs(n - Math.round(n)) < 1e-9;
const close = (a: number, b: number) => Math.abs(a - b) <= Math.max(0.06, 0.01 * Math.abs(b));

interface Solved {
  qty: number;
  total: number;
  discountPct: number | null;
  consistent: boolean;
}

/** Explain an item's numbers. The last number is always the line total. */
export function solve(nums: number[], qty0: number | null, discPct: number | null): Solved {
  const k = nums.length;
  const T = nums[k - 1];
  const q0 = qty0 && qty0 > 0 ? qty0 : null;
  const d0 = discPct ?? 0;
  const off = (d: number) => 1 - d / 100;
  const ok = (qty: number, discountPct: number | null): Solved => ({ qty, total: T, discountPct, consistent: true });

  if (k >= 4) {
    const [a, b, c] = nums.slice(k - 4);
    // qty, rate, disc %, total — or qty, price, discount amount, total
    if (isCount(a) && c >= 0 && c < 100 && close(a * b * off(c), T)) return ok(a, c || null);
    if (isCount(a) && c >= 0 && close(a * b - c, T)) return ok(a, c && a * b > 0 ? money((c / (a * b)) * 100) : null);
    // price, tax, qty, amount
    if (isCount(c) && close((a + b) * c, T)) return ok(c, null);
  }
  if (k >= 3) {
    const [a, b] = nums.slice(k - 3);
    // (qty) rate, disc %, total
    if (q0 && b >= 0 && b < 100 && close(q0 * a * off(b), T)) return ok(q0, b || null);
    // qty, rate, total
    if (isCount(a) && close(a * b, T) && (!q0 || q0 === a || q0 === 1)) return ok(a, null);
    // (qty) gst/other, price, total
    if (q0 && close(q0 * b * off(d0), T)) return ok(q0, discPct);
    if (!q0 && close(b * off(d0), T)) return ok(1, discPct);
  }
  if (k >= 2) {
    const a = nums[k - 2];
    const q = q0 ?? 1;
    if (close(q * a * off(d0), T)) return ok(q, discPct);
    if (!q0 && isCount(a) && T / a >= 1) {
      // "10 960.00" (qty, total) only when nothing else explains it
      return { qty: a, total: T, discountPct: discPct, consistent: false };
    }
  }
  if (k === 1) return ok(q0 ?? 1, discPct);
  return { qty: q0 ?? 1, total: T, discountPct: discPct, consistent: false };
}

function finalize(d: Draft, n: number): ReceiptItem | null {
  if (!d.nums.length) return null;
  let name = [...d.prefix, ...d.nameParts].join(' ').replace(/\s+/g, ' ').trim();
  let qty0 = d.rowNumber ? null : d.qty;
  const tx = name.match(TRAIL_X);
  if (tx) {
    if (qty0 == null) qty0 = Number(tx[1]);
    name = name.slice(0, tx.index).trim();
  }
  name = name.replace(/^[\s\-|:]+|[\s|:]+$/g, '');
  let truncated = false;
  if (/…$/.test(name)) {
    truncated = true;
    name = name.replace(/\s*…$/, '').trim();
  }
  name = fixUnits(name);
  if (!/[a-z]{2}/i.test(name)) return null;
  let s = solve(d.nums, qty0, d.discPct);
  // Numbers that don't agree: the first may belong to the name ("Natural 2509 439.00",
  // a misread "250g"). Keep it in the name only when the name has no size yet.
  if (!s.consistent && d.numTexts.length === d.nums.length) {
    for (let k = 1; k < d.nums.length; k++) {
      const retry = solve(d.nums.slice(k), qty0, d.discPct);
      if (!retry.consistent) continue;
      if (!parseSize(name)) name = `${name} ${d.numTexts.slice(0, k).join(' ')}`;
      s = retry;
      break;
    }
  }
  if (!(s.total > 0)) return null;
  const qty = s.qty > 0 ? s.qty : 1;
  // A grocery line beyond this is a misread, not a price: kept, but checked.
  const sane = s.total / qty <= MAX_UNIT_PRICE;
  return {
    id: `r${n}`,
    name,
    lines: d.lines,
    quantity: qty,
    unitPrice: money(s.total / qty),
    lineTotal: money(s.total),
    discountPct: s.discountPct,
    truncated,
    section: d.section,
    code: d.code,
    confidence: d.confidence,
    consistent: s.consistent && !d.qtyUnclear && sane,
  };
}

/** Do the items add up to a printed subtotal or total (fees included or not)? */
function checkTotal(itemsSum: number, summary: SummaryLine[]): { addsUp: boolean | null; against: number | null } {
  const targets = summary.filter((s) => s.kind === 'subtotal' || s.kind === 'total').map((s) => s.amount);
  if (!targets.length || itemsSum <= 0) return { addsUp: targets.length ? false : null, against: targets[0] ?? null };
  const fees = summary.filter((s) => s.kind === 'fee').reduce((a, s) => a + s.amount, 0);
  const tol = (x: number) => Math.max(1, 0.002 * x);
  for (const t of targets) {
    if (Math.abs(itemsSum - t) <= tol(t) || Math.abs(itemsSum + fees - t) <= tol(t)) return { addsUp: true, against: t };
  }
  return { addsUp: false, against: targets[0] };
}
