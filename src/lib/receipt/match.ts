// A receipt line → the catalogue product it is. Scores every plausible product on
// rare words shared (IDF), brand, size, item type and price at that store, and only
// picks one on its own when it's clearly the one: from the receipt's store (or the
// user's own products), a strong score, well ahead of the next, nothing contradicting.
// Everything else becomes up to three suggestions. Plain TS.
import { matchItemType, tokens, typeFamily } from '../compare/itemTypes.ts';
import { parseSize } from '../compare/productName.ts';
import type { ParsedSize } from '../compare/productName.ts';
import { similarSize } from '../compare/units.ts';
import { ABBREVIATIONS_OF, expand, skeleton, wordMatch } from './abbrev.ts';

export interface Candidate {
  id: string;
  name: string;
  brandKey: string | null;
  itemType: string | null;
  size: ParsedSize | null;
  /** Price of one pack at the receipt's store, when known. */
  price: number | null;
  /** Sold at the receipt's store, or the user's own product. */
  local: boolean;
}

export interface MatchIndex {
  cands: Candidate[];
  words: string[][];
  df: Map<string, number>;
  byWord: Map<string, number[]>;
  bySkeleton: Map<string, string[]>;
  /** Every catalogue word, sorted (for "starts with" lookups). */
  vocab: string[];
  brandKeys: string[];
  maxIdf: number;
}

export interface LineQuery {
  name: string;
  /** Price for one on the receipt. */
  unitPrice: number;
  truncated: boolean;
}

export interface Scored {
  id: string;
  score: number;
  local: boolean;
  /** What contradicts it: a different size, brand, or a price far off. */
  conflict: 'size' | 'brand' | 'price' | null;
  /** Every telling word matches both ways (packaging words aside): needed to pick on its own. */
  covered: boolean;
  /** Score used for ordering (not capped at 1). */
  rank: number;
}

export interface MatchResult {
  /** Picked on its own (safe to save without asking). */
  auto: Scored | null;
  best: Scored | null;
  suggestions: Scored[];
}

/** Thresholds, tuned on the sample receipts so that wrong automatic picks stay at zero. */
export const AUTO_MIN = 0.75;
export const AUTO_MARGIN = 0.12;
export const SUGGEST_MIN = 0.35;

const FILLER = new Set(['and', 'of', 'with', 'the', 'x', 'rs', 'for', 'in', 'a', 'new', 'offer', 'pack', 'pc', 'pcs', 'piece', 'unit']);
// Words that name the pack, not the product: they may differ between a receipt and the
// catalogue without making it another product ("… 1Ltr Tetra" = "… 1Ltr").
const NEUTRAL = new Set([
  'tetra', 'pouch', 'standing', 'standup', 'stand', 'up', 'bottle', 'btl', 'jar', 'tin', 'can', 'nr', 'pet', 'pb',
  'packet', 'pkt', 'box', 'bag', 'local', 'imported', 'family', 'value', 'saver', 'carton', 'ctn', 'piece',
  'mineral', 'bact', 'antibacterial', 'sachet',
]);
// Containers: when both names say one and they differ (can vs bottle), it's another product.
const CONTAINER: Record<string, string> = {
  can: 'can', bottle: 'bottle', btl: 'bottle', pb: 'bottle', pet: 'bottle', jar: 'jar', pouch: 'pouch',
  tetra: 'tetra', box: 'box', bag: 'bag', tin: 'tin', carton: 'carton', ctn: 'carton', sachet: 'sachet',
};
const containers = (ws: string[]) => new Set(ws.map((w) => CONTAINER[w]).filter(Boolean));
// Sizes and counts in a name ("1 Ltr", "45 G", "4x110g", "10 Pk", "12's"): compared as sizes, not words.
const SIZE_TEXT =
  /\b\d+(?:[.,]\d+)?\s*(?:x\s*\d+(?:[.,]\d+)?\s*)?(?:kgs?|kilo(?:gram)?s?|grams?|gms?|grm|gr|g|mg|mls?|ltrs?|lt|litres?|liters?|l|cl|oz|pcs?|pieces?|packs?|pk|sachets?|rolls?|sheets?|tabs?|tablets?|capsules?|caps|ply|count|ct|units?|eggs?|dozen|s|'s)(?![a-z])/gi;
// One word in one store, two in another.
const COMPOUNDS = new Map([
  ['tooth paste', 'toothpaste'], ['tooth brush', 'toothbrush'], ['face wash', 'facewash'], ['facial wash', 'facewash'],
  ['hand wash', 'handwash'], ['dish wash', 'dishwash'], ['body wash', 'bodywash'], ['corn flour', 'cornflour'],
  ['corn flake', 'cornflake'], ['sun flower', 'sunflower'], ['pop corn', 'popcorn'], ['milk shake', 'milkshake'],
  ['tomato ketchup', 'ketchup'], ['mineral water', 'water'],
]);
const SIZE_WORD = /^\d+(?:\.\d+)?(?:g|gm|gms|gr|grm|gram|kg|kgs|mg|ml|mls|l|lt|ltr|ltrs|litre|liter|cc|oz)$/;

export const brandKeyOf = (s: string) => s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9&]+/g, ' ').trim();

/** The words of a name that tell products apart (sizes are compared separately). */
export function nameWords(name: string): string[] {
  const raw = tokens(name.replace(/[’']/g, '').replace(SIZE_TEXT, ' '));
  const merged: string[] = [];
  for (let i = 0; i < raw.length; i++) {
    const pair = COMPOUNDS.get(`${raw[i]} ${raw[i + 1]}`);
    if (pair) {
      merged.push(pair);
      i++;
    } else merged.push(raw[i] === 'facial' ? 'face' : raw[i]);
  }
  const out: string[] = [];
  for (let w of merged) {
    w = w.replace(/^(\d+)s$/, '$1'); // "66s", "8s" → the count
    if (!w || FILLER.has(w) || SIZE_WORD.test(w)) continue;
    if (!out.includes(w)) out.push(w);
  }
  return out;
}

export function buildIndex(cands: Candidate[], brandKeys: Iterable<string> = []): MatchIndex {
  const words = cands.map((c) => nameWords(c.name));
  const df = new Map<string, number>();
  const byWord = new Map<string, number[]>();
  words.forEach((ws, i) => {
    for (const w of ws) {
      df.set(w, (df.get(w) ?? 0) + 1);
      const list = byWord.get(w);
      if (list) list.push(i);
      else byWord.set(w, [i]);
    }
  });
  const vocab = [...df.keys()].sort();
  const bySkeleton = new Map<string, string[]>();
  for (const w of vocab) {
    const s = skeleton(w);
    if (s.length < 3 || s === w) continue;
    const list = bySkeleton.get(s);
    if (list) list.push(w);
    else bySkeleton.set(s, [w]);
  }
  const keys = new Set<string>(brandKeys);
  for (const c of cands) if (c.brandKey) keys.add(c.brandKey);
  return {
    cands,
    words,
    df,
    byWord,
    bySkeleton,
    vocab,
    brandKeys: [...keys].filter((k) => k.length >= 2).sort((a, b) => b.length - a.length),
    maxIdf: Math.log(1 + cands.length),
  };
}

const idfOf = (ix: MatchIndex, w: string) => {
  const d = ix.df.get(w);
  return d ? Math.log(1 + ix.cands.length / d) : ix.maxIdf;
};

/** Catalogue words starting with `w` (binary search in the sorted vocabulary). */
function withPrefix(vocab: string[], w: string): string[] {
  let lo = 0;
  let hi = vocab.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (vocab[mid] < w) lo = mid + 1;
    else hi = mid;
  }
  const out: string[] = [];
  for (let i = lo; i < vocab.length && vocab[i].startsWith(w); i++) if (vocab[i] !== w) out.push(vocab[i]);
  return out;
}

/** Catalogue words a receipt word could stand for (itself, shortened forms, a cut-off start). */
function variantsOf(ix: MatchIndex, w: string, cutOff: boolean): string[] {
  const out = new Set<string>();
  if (ix.df.has(w)) out.add(w);
  for (const v of ix.bySkeleton.get(skeleton(w)) ?? []) out.add(v);
  if (w.length >= 3 || cutOff) for (const v of withPrefix(ix.vocab, w)) out.add(v);
  const full = expand(w);
  if (ix.df.has(full)) out.add(full);
  for (const v of ABBREVIATIONS_OF.get(full) ?? []) if (ix.df.has(v)) out.add(v);
  return [...out];
}

/** Find the product for one receipt line. */
export function matchLine(ix: MatchIndex, q: LineQuery): MatchResult {
  const qWords = nameWords(q.name);
  if (!qWords.length) return { auto: null, best: null, suggestions: [] };
  const last = qWords.length - 1;
  const qSize = parseSize(q.name);
  const qKey = brandKeyOf(q.name);
  const qBrand = ix.brandKeys.find((b) => qKey === b || qKey.startsWith(`${b} `)) ?? null;
  const qType = matchItemType(q.name)?.type.id ?? null;
  const qNorm = qWords.join(' ');

  // Candidates sharing at least one informative word (or its shortened forms)
  const hits = new Map<number, number>();
  const minIdf = Math.log(1 + ix.cands.length / Math.max(50, ix.cands.length * 0.05));
  qWords.forEach((w, i) => {
    for (const v of variantsOf(ix, w, q.truncated && i === last)) {
      if (idfOf(ix, v) < minIdf && qWords.length > 1) continue;
      for (const c of ix.byWord.get(v) ?? []) hits.set(c, (hits.get(c) ?? 0) + idfOf(ix, v));
    }
  });
  const pool = [...hits.entries()].sort((a, b) => b[1] - a[1]).slice(0, 400).map(([i]) => i);

  const brandWords = qBrand ? new Set(nameWords(qBrand)) : null;
  const scored: Scored[] = [];
  for (const i of pool) {
    const c = ix.cands[i];
    let cw = ix.words[i].filter((w) => !NEUTRAL.has(w));
    let qw = qWords.filter((w) => !NEUTRAL.has(w));
    let brandBonus = 0;
    let conflict: Scored['conflict'] = null;
    let factor = 1;

    // Brand: compared on its own, so its words don't drown out the rest ("Happy Home
    // Pudding Egg" vs "… Mango").
    if (qBrand && c.brandKey) {
      const same = qBrand === c.brandKey || c.brandKey.startsWith(`${qBrand} `) || qBrand.startsWith(`${c.brandKey} `);
      if (same || brandKeyOf(c.name).startsWith(qBrand)) {
        brandBonus = 0.04;
        const bw = new Set([...brandWords!, ...nameWords(c.brandKey)]);
        qw = qw.filter((w) => !bw.has(w));
        cw = cw.filter((w) => !bw.has(w));
      } else {
        conflict = 'brand';
        factor *= 0.5;
      }
    }

    let text: number;
    let covered = false;
    if (!qw.length) {
      text = cw.length ? 0.7 : 1;
      covered = !cw.length;
    } else {
      // recall: how much of the receipt line the product explains
      let rNum = 0;
      let rDen = 0;
      const used = new Map<string, number>();
      const lastQ = qw.length - 1;
      qw.forEach((w, k) => {
        const weight = idfOf(ix, w);
        rDen += weight;
        let best = 0;
        let bestWord = '';
        for (const u of cw) {
          const m = wordMatch(w, u, q.truncated && k === lastQ);
          if (m > best) {
            best = m;
            bestWord = u;
          }
        }
        if (best > 0) {
          rNum += weight * best;
          used.set(bestWord, Math.max(used.get(bestWord) ?? 0, best));
        }
      });
      // precision: how much of the product's name the line accounts for
      let pNum = 0;
      let pDen = 0;
      for (const u of cw) {
        const weight = idfOf(ix, u);
        pDen += weight;
        pNum += weight * (used.get(u) ?? 0);
      }
      const recall = rDen ? rNum / rDen : 0;
      const precision = pDen ? pNum / pDen : 1;
      // Coverage for picking on its own: telling words matched both ways.
      // (a shortened word or a word's start isn't proof: those lines get checked instead)
      const qMiss = qw.filter((w) => !cw.some((u) => wordMatch(w, u) >= 0.8));
      const cMiss = cw.filter((u) => (used.get(u) ?? 0) < 0.8);
      covered = !qMiss.length && !cMiss.length;
      const qc = containers(qWords);
      const cc = containers(ix.words[i]);
      if (qc.size && cc.size && ![...qc].some((x) => cc.has(x))) covered = false;
      text = q.truncated ? 0.75 * recall + 0.25 * precision : 0.55 * recall + 0.45 * precision;
    }
    let score = text * factor + brandBonus;

    if (qSize && c.size) {
      if (similarSize(qSize, c.size, 0.03) && qSize.pack === c.size.pack) {
        score += 0.08;
        // On its own only with the same size (440 g ≠ 430 g)
        if (!similarSize(qSize, c.size, 0.01)) covered = false;
      } else {
        conflict = conflict ?? 'size';
        score *= 0.4;
      }
    } else if (qSize && !c.size) {
      score -= 0.03;
      covered = false;
    }

    if (qType && c.itemType && !typeFamily(qType).has(c.itemType) && !typeFamily(c.itemType).has(qType)) score -= 0.08;

    if (c.price && q.unitPrice > 0) {
      const r = q.unitPrice / c.price;
      if (r >= 0.85 && r <= 1.18) score += 0.06;
      else if (r > 2.2 || r < 0.45) {
        conflict = conflict ?? 'price';
        score -= 0.15;
      }
      // On its own only near the store's price (closer still when the line has no size)
      if (qSize ? r < 0.67 || r > 1.5 : r < 0.8 || r > 1.25) covered = false;
    }
    if (!conflict && ix.words[i].join(' ') === qNorm && !q.truncated) score = Math.max(score, 0.97);

    // Rank on the uncapped score (an exact match beats a near one even when both pass 1).
    const rank = score + (covered ? 0.05 : 0);
    score = Math.max(0, Math.min(1, Math.round(score * 1000) / 1000));
    if (score >= SUGGEST_MIN * 0.8) scored.push({ id: c.id, score, local: c.local, conflict, covered, rank });
  }
  scored.sort((a, b) => b.rank - a.rank || Number(b.local) - Number(a.local));

  const best = scored[0] ?? null;
  // Picked on its own only from the store's products: clearly ahead of the store's
  // next one, and not beaten by a product we only know from other stores.
  const local = scored.filter((x) => x.local);
  const top = local[0] ?? null;
  const next = local[1] ?? null;
  const other = scored.find((x) => !x.local) ?? null;
  const auto =
    top &&
    !q.truncated &&
    !top.conflict &&
    top.covered &&
    top.score >= AUTO_MIN &&
    (!next || top.rank - next.rank >= AUTO_MARGIN) &&
    (!other || top.rank >= other.rank - 0.02)
      ? top
      : null;
  // Suggestions: the store's own products first when close
  const suggestions = scored
    .filter((s) => s.score >= SUGGEST_MIN)
    .sort((a, b) => b.rank + (b.local ? 0.05 : 0) - (a.rank + (a.local ? 0.05 : 0)))
    .slice(0, 3);
  return { auto, best, suggestions };
}
