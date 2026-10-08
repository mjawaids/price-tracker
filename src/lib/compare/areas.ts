// Naming a shared shop: "<chain or shop name> · <area>". A city's areas (with the other
// ways people write them), the checks a name must pass, and how names are compared.
// `placeKey` mirrors spendless.place_key() (migration 20261008000000_branch_suggestions):
// the database decides; the app uses it to point at a shop that's already shared.
// Plain TS, no app imports.

/** "DHA Phase VIII", "dha ph 8" and "DHA Phase 8" → "dha phase 8". Whole keys only are compared. */
export function placeKey(text: string): string {
  let s = text.toLowerCase().replace(/&/g, ' and ').replace(/[^\p{L}\p{N}]+/gu, ' ');
  s = s.replace(/\bph\b/g, 'phase').replace(/\bdefen[cs]e\b/g, 'dha');
  const romans: [string, string][] = [['viii', '8'], ['vii', '7'], ['vi', '6'], ['iv', '4'], ['v', '5'], ['iii', '3'], ['ii', '2'], ['i', '1']];
  for (const [r, n] of romans) s = s.replace(new RegExp(`\\bphase ${r}\\b`, 'g'), `phase ${n}`);
  return s.replace(/\s+/g, ' ').trim();
}

/** Longest shop name and area; together they fit a store name ("<chain> · <area>", 80). */
export const PLACE_MAX = { chain: 60, area: 40, both: 77 } as const;

/** Spaces collapsed; curly quotes and dashes made plain (phones type them). */
export const cleanPlace = (text: string) =>
  text
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

/** Why a shop name or area can't be used (the database checks the same), else null. */
export function placeProblem(text: string, max: number): string | null {
  const t = cleanPlace(text);
  if (t.length < 2) return 'Too short';
  if (t.length > max) return `Keep it to ${max} characters`;
  if (!/^[A-Za-z0-9 &'().,/-]+$/.test(t)) return 'Use English letters, numbers and simple punctuation';
  if (!/[A-Za-z]/.test(t)) return 'Needs a letter';
  if (/[0-9]{6,}/.test(t)) return 'No phone numbers';
  if (/(www\.|\.(com|net|org|pk|io|co|app|shop|store)\b)/i.test(t)) return 'No web addresses';
  return null;
}

export interface Area {
  name: string;
  /** Other ways people write it; they all mean `name`. */
  aliases?: string[];
}

const KARACHI: Area[] = [
  { name: 'Ancholi' },
  { name: 'Awami Markaz' },
  { name: 'Bahadurabad' },
  { name: 'Bahria Town', aliases: ['Bahria Town Karachi'] },
  { name: 'Baldia Town', aliases: ['Baldia'] },
  { name: 'Bath Island' },
  { name: 'Boat Basin' },
  { name: 'Buffer Zone' },
  { name: 'Clifton' },
  { name: 'Defence View' },
  ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ name: `DHA Phase ${n}`, aliases: [`DHA ${n}`, `Phase ${n}`] })),
  { name: 'Dhoraji' },
  { name: 'FB Area', aliases: ['Federal B Area', 'F.B. Area', 'FB Area Karachi'] },
  { name: 'Garden' },
  { name: 'Gulberg' },
  { name: 'Gulistan-e-Jauhar', aliases: ['Johar', 'Jauhar', 'Gulistan-e-Johar', 'Gulistan e Jauhar'] },
  { name: 'Gulshan', aliases: ['Gulshan-e-Iqbal', 'Gulshan e Iqbal', 'Gulshan Iqbal'] },
  { name: 'Gulshan-e-Hadeed' },
  { name: 'Gulshan-e-Maymar' },
  { name: 'Gulzar-e-Hijri' },
  { name: 'Jamshed Road' },
  { name: 'KDA', aliases: ['KDA Scheme 1'] },
  { name: 'Keamari' },
  { name: 'Kharadar' },
  { name: 'Korangi' },
  { name: 'Landhi' },
  { name: 'Liaquatabad' },
  { name: 'Lyari' },
  { name: 'Malir' },
  { name: 'Malir Cantt', aliases: ['Malir Cantonment'] },
  { name: 'Model Colony' },
  { name: 'Nazimabad' },
  { name: 'Naya Nazimabad' },
  { name: 'New Karachi' },
  { name: 'North Karachi' },
  { name: 'North Nazimabad' },
  { name: 'Orangi Town', aliases: ['Orangi'] },
  { name: 'PECHS' },
  { name: 'Qayyumabad' },
  { name: 'Saadi Town' },
  { name: 'Saddar' },
  { name: 'Safoora', aliases: ['Safoora Goth'] },
  { name: 'Scheme 33' },
  { name: 'Shah Faisal Colony', aliases: ['Shah Faisal'] },
  { name: 'Sharfabad' },
  { name: 'Soldier Bazaar' },
  { name: 'Surjani Town', aliases: ['Surjani'] },
  { name: 'Tariq Road' },
  { name: 'Zamzama' },
];

const BY_REGION: Record<string, Area[]> = { karachi: KARACHI };

/** A city's areas, A–Z (none for a city we haven't listed: people type theirs). */
export const areasFor = (regionId: string | null | undefined): Area[] => (regionId && BY_REGION[regionId]) || [];

/** What was typed, as the city's own name for that area when it's one we know ("Johar" → "Gulistan-e-Jauhar"). */
export function canonicalArea(regionId: string | null | undefined, text: string): string {
  const t = cleanPlace(text);
  const k = placeKey(t);
  if (!k) return t;
  for (const a of areasFor(regionId)) if (placeKey(a.name) === k || a.aliases?.some((x) => placeKey(x) === k)) return a.name;
  return t;
}

/** Areas matching a search: every word starts a word of the name or one of its aliases. */
export function searchAreas(regionId: string | null | undefined, query: string): Area[] {
  const words = placeKey(query).split(' ').filter(Boolean);
  const all = areasFor(regionId);
  if (!words.length) return all;
  return all.filter((a) =>
    [a.name, ...(a.aliases ?? [])].some((n) => {
      const have = placeKey(n).split(' ');
      return words.every((w) => have.some((h) => h.startsWith(w)));
    }),
  );
}

/** The city's area a free-text address starts with ("Gulshan Block 5" → "Gulshan"), else null. */
export function findArea(regionId: string | null | undefined, text: string | null | undefined): string | null {
  const k = placeKey(text ?? '');
  if (!k) return null;
  let best: { name: string; len: number } | null = null;
  for (const a of areasFor(regionId)) {
    for (const n of [a.name, ...(a.aliases ?? [])]) {
      const nk = placeKey(n);
      if ((k === nk || k.startsWith(`${nk} `)) && (!best || nk.length > best.len)) best = { name: a.name, len: nk.length };
    }
  }
  return best?.name ?? null;
}
