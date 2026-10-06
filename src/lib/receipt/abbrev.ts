// Till receipts shorten names ("CHKI ATTA", "BF-3 900GM VANILA", "MSL"). These helpers
// let the matcher meet a shortened or cut-off word halfway. Plain TS.

/** Common till spellings → the word catalogues use (as `tokens()` gives it: singular). */
const ABBREV: Record<string, string> = {
  vanila: 'vanilla', bottel: 'bottle', btl: 'bottle', pkt: 'packet', pck: 'pack', chki: 'chakki', msl: 'masala',
  sft: 'soft', liq: 'liquid', choc: 'chocolate', choco: 'chocolate', ckn: 'chicken', chkn: 'chicken', bisc: 'biscuit',
  crm: 'cream', shmp: 'shampoo', shmpo: 'shampoo', dtrgnt: 'detergent', det: 'detergent', pwdr: 'powder', pdr: 'powder',
  wht: 'white', blk: 'black', grn: 'green', strwbry: 'strawberry', mng: 'mango', frsh: 'fresh', mlk: 'milk',
  yog: 'yogurt', yoghurt: 'yogurt', ktchp: 'ketchup', ketchp: 'ketchup', tmt: 'tomato',
  bsmti: 'basmati', bsmt: 'basmati', sela: 'sella', dishwsh: 'dishwash', dshwsh: 'dishwash', tpaste: 'toothpaste', tp: 'toothpaste', hndwsh: 'handwash', sanitzr: 'sanitizer', nood: 'noodle', ndl: 'noodle',
  macroni: 'macaroni', spgti: 'spaghetti', jly: 'jelly', cerel: 'cereal', crnflk: 'cornflake', kajoo: 'cashew', kaju: 'cashew', badam: 'almond', pista: 'pistachio',
};

/** The catalogue word for a till abbreviation, or the word itself. */
export const expand = (w: string) => ABBREV[w] ?? w;

/** Till abbreviations for a catalogue word ("chakki" → ["chki"]). */
export const ABBREVIATIONS_OF = new Map<string, string[]>();
for (const [short, full] of Object.entries(ABBREV)) ABBREVIATIONS_OF.set(full, [...(ABBREVIATIONS_OF.get(full) ?? []), short]);

/** First letter + consonants, no repeats: "chakki" → "chk", "masala" → "msl". */
export function skeleton(w: string): string {
  if (w.length < 3 || /\d/.test(w)) return w;
  const rest = w.slice(1).replace(/[aeiou]/g, '').replace(/(.)\1+/g, '$1');
  return w[0] + rest;
}

/** Does a receipt word plausibly stand for a catalogue word? 1 = same, 0.7 = shortened, 0 = no. */
export function wordMatch(receipt: string, catalogue: string, cutOff = false): number {
  if (receipt === catalogue) return 1;
  if (expand(receipt) === catalogue || expand(receipt) === expand(catalogue)) return 0.9;
  if (cutOff && receipt.length >= 1 && catalogue.startsWith(receipt)) return 0.8;
  if (receipt.length >= 3 && catalogue.length > receipt.length && catalogue.startsWith(receipt)) return 0.7;
  if (receipt.length >= 3 && !/\d/.test(receipt) && skeleton(receipt).length >= 3 && skeleton(receipt) === skeleton(catalogue)) return 0.6;
  return 0;
}
