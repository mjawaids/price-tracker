// Which public products the nightly job may merge without anyone checking
// (merge-products.ts --auto → merge-auto.sql, which then checks prices, stores and
// packs). Every rule here also needs the names to agree (productName.ts nameWords:
// brand, sizes, pack words and noise aside, in any order), because the match key alone
// can't tell "Shan Ginger Paste" from "Shan Garlic Paste" or a 6mg from a 1.5mg:
//   same-key   the same match key and the same name words;
//   near-name  the same key but for the variant, and name words that differ only by a
//              slip or two ("Malai Kulfa" / "Malai Kulfi", "Danerdar" / "Danedar");
//   import     a product every store listing left for another (the importer matched
//              them by key), when the names agree as for same-key or near-name.
import { nameWords } from '../../src/lib/compare/productName.ts';

export type AutoRule = 'same-key' | 'near-name' | 'import';
export interface AutoPair {
  a: string;
  b: string;
  rule: AutoRule;
}

/** At most one edit apart: a letter changed, added, dropped, or two neighbours swapped. */
export function oneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  if (a.length === b.length) {
    const diff: number[] = [];
    for (let i = 0; i < a.length && diff.length <= 2; i++) if (a[i] !== b[i]) diff.push(i);
    if (diff.length === 1) return true;
    const [i, j] = diff;
    return diff.length === 2 && j === i + 1 && a[i] === b[j] && a[j] === b[i];
  }
  const [s, l] = a.length < b.length ? [a, b] : [b, a];
  let i = 0;
  while (i < s.length && s[i] === l[i]) i++;
  return s.slice(i) === l.slice(i + 1);
}

// Slips only in words long enough that one letter can't make another word…
const MIN_LETTERS = 5;
// …and only where one side is rare in the catalogue: "Kulfa" (a slip) next to "Kulfi"
// is one product, but "Greek" and "Green" are both common words, so they're two.
const RARE = 3;
const MAX_SLIPS = 2;

/**
 * Name words that differ only by slips: the same number of words, and the words that
 * aren't shared pair up one edit apart (at most two pairs), each long enough, the rarer
 * side of each pair rare.
 */
export function nearWords(a: string[], b: string[], uses: Map<string, number>): boolean {
  if (!a.length || a.length !== b.length) return false;
  const left = a.filter((w) => !b.includes(w));
  const right = b.filter((w) => !a.includes(w));
  if (!left.length || left.length !== right.length || left.length > MAX_SLIPS) return false;
  for (const w of left) {
    const k = right.findIndex(
      (v) =>
        w.length >= MIN_LETTERS && v.length >= MIN_LETTERS && oneEdit(w, v) &&
        Math.min(uses.get(w) ?? 0, uses.get(v) ?? 0) <= RARE,
    );
    if (k < 0) return false;
    right.splice(k, 1);
  }
  return true;
}

const same = (a: string[], b: string[]) => a.length > 0 && a.join(' ') === b.join(' ');

/**
 * products: [id, match_key, name, brand] for every public product with a key of the
 * current format; moved: [from, into, from_name, from_brand, into_name, into_brand].
 */
export function autoPairs(
  products: [string, string, string, string | null][],
  moved: [string, string, string, string | null, string, string | null][],
): AutoPair[] {
  type P = { id: string; key: string; loose: string; name: string; brand: string | null };
  const list: P[] = [];
  for (const [id, key, name, brand] of products) {
    const parts = key.split('|');
    if (parts.length < 7 || parts[0] !== 'k2') continue;
    list.push({ id, key, loose: [...parts.slice(0, 3), ...parts.slice(4)].join('|'), name, brand });
  }
  // How often each name word appears, to tell a slip from a word of its own.
  const uses = new Map<string, number>();
  for (const p of list) for (const w of nameWords(p.name, [p.brand])) uses.set(w, (uses.get(w) ?? 0) + 1);
  for (const m of moved) for (const w of nameWords(m[2], [m[3]])) uses.set(w, (uses.get(w) ?? 0) + 1);

  const out: AutoPair[] = [];
  const groups = new Map<string, P[]>();
  for (const p of list) groups.set(p.loose, [...(groups.get(p.loose) ?? []), p]);
  for (const g of groups.values()) {
    if (g.length < 2 || g.length > 400) continue;
    const brands = [...new Set(g.map((p) => p.brand))];
    const words = g.map((p) => nameWords(p.name, brands));
    const first = new Map<string, number>(); // same key + same words → its first product
    for (let i = 0; i < g.length; i++) {
      const k = `${g[i].key}#${words[i].join(' ')}`;
      const f = first.get(k);
      if (f === undefined) first.set(k, i);
      else if (words[i].length) out.push({ a: g[i].id, b: g[f].id, rule: 'same-key' });
    }
    for (let i = 0; i < g.length; i++) {
      for (let j = i + 1; j < g.length; j++) {
        if (same(words[i], words[j])) continue;
        if (nearWords(words[i], words[j], uses)) out.push({ a: g[i].id, b: g[j].id, rule: 'near-name' });
      }
    }
  }
  for (const [from, into, fromName, fromBrand, intoName, intoBrand] of moved) {
    const x = nameWords(fromName, [fromBrand, intoBrand]);
    const y = nameWords(intoName, [fromBrand, intoBrand]);
    if (same(x, y) || nearWords(x, y, uses)) out.push({ a: from, b: into, rule: 'import' });
  }
  return out;
}
