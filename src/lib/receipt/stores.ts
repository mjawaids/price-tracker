// Which shop a receipt is from: the chain (from its header, or its own-brand items),
// online order or in-store, a pharmacy or not, and the area when printed.
// Plain TS with no app imports so scripts can use it too.

export interface StoreGuess {
  /** Known chain, canonical spelling ("Panda Mart", "Chase Up"). */
  chain: string | null;
  /** Shop name from the header when it isn't a known chain ("Burhani Medicos"). */
  name: string | null;
  kind: 'online' | 'physical' | null;
  pharmacy: boolean;
  /** Area or branch when printed ("North Karachi"). */
  area: string | null;
}

/** Chains seen on Karachi receipts and how they're written. Order matters: "Chase Value" before "Chase Up". */
export const CHAINS: { chain: string; re: RegExp; pharmacy?: boolean }[] = [
  { chain: 'Panda Mart', re: /\bpanda\s*-?\s*mart\b|\bfood\s*panda\b/i },
  { chain: 'Chase Value', re: /\bchase\s*-?\s*value\b/i },
  { chain: 'Chase Up', re: /\bchase\s*-?\s*up\b/i },
  { chain: 'Imtiaz', re: /\bimtiaz\b/i },
  { chain: 'Naheed', re: /\bnaheed\b/i },
  { chain: 'Carrefour', re: /\bcarrefour\b/i },
  { chain: 'Al-Fatah', re: /\bal[\s-]?fatah\b/i },
  { chain: 'Diamond Super Market', re: /\bdiamond\s*super\s*-?\s*market\b/i },
  { chain: 'Hydri Super Market', re: /\bhydri\b/i },
  { chain: 'Spar', re: /\bspar\b/i },
  { chain: 'Bin Hashim', re: /\bbin\s*-?\s*hashim\b/i, pharmacy: true },
  { chain: 'Kifayah', re: /\bkifayah\b/i },
  { chain: 'Al-Khidmat', re: /\bal[\s-]?khidmat\b/i, pharmacy: true },
  { chain: 'Dvago', re: /\bdvago\b/i, pharmacy: true },
  { chain: 'Sehat', re: /\bsehat\.com\b/i, pharmacy: true },
];

const ONLINE = /\b(?:order from|delivered (?:on|to)|delivery (?:fee|charges?|address|time)|order (?:details|number|no|#)|online|pre order|cash on delivery|card on delivery|rider|app order)\b/i;
const PHYSICAL = /\b(?:original slip|sales? receipt|cash memo|change (?:due|back)|cash received|cashier|operator|shift|pos name|counter|terminal|till|patient|pickup|walk[\s-]?in)\b/i;
const PHARMACY = /\b(?:pharmacy|medicos?|chemists?|medical (?:store|hall)|drug|dawa\s*khana|dawakhana)\b/i;

// Karachi areas often printed on receipts (for the branch picker's search).
const AREAS = [
  'North Nazimabad', 'Naya Nazimabad', 'Nazimabad', 'North Karachi', 'Gulshan-e-Iqbal', 'Gulshan', 'Gulistan-e-Jauhar',
  'Johar', 'DHA', 'Defence', 'Clifton', 'PECHS', 'Bahadurabad', 'Saddar', 'Tariq Road', 'Federal B Area', 'FB Area',
  'Korangi', 'Malir', 'Shah Faisal', 'Gulberg', 'Bahria Town', 'Scheme 33', 'Buffer Zone', 'KDA', 'Garden', 'Kharadar',
  'Lyari', 'Orangi', 'Landhi', 'Saadi Town', 'Askari', 'Model Colony', 'Nazimabad', 'Liaquatabad', 'Surjani',
  'Shahrah-e-Faisal', 'Shahra-e-Faisal', 'Naseerabad', 'Hyderi', 'Water Pump', 'Ayesha Manzil', 'Karimabad',
];
const AREA_RE = new RegExp(`\\b(${AREAS.map((a) => a.replace(/[-\s]/g, '[\\s-]?')).join('|')})\\b`, 'i');

const NOT_NAME = /^(?:helpline|order|items?|date|address|payment|delivery|delivered|original|sale|sales|cash|invoice|receipt|thank|welcome|tax|ntn|strn|gst|by\b|this is)/i;

const title = (s: string) => s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());

/**
 * Guess the store from the header lines (above the items), the whole text, and
 * the item names (an own-brand like "Chaseup Almond" gives the chain away).
 */
export function guessStore(header: string[], allLines: string[], itemNames: string[] = []): StoreGuess {
  const top = header.join('\n');
  const all = allLines.join('\n');

  let chain: string | null = null;
  let chainPharmacy = false;
  for (const c of CHAINS) {
    if (c.re.test(top) || c.re.test(allLines.slice(0, 12).join('\n'))) {
      chain = c.chain;
      chainPharmacy = !!c.pharmacy;
      break;
    }
  }
  if (!chain && itemNames.length) {
    // Own-brand items: "Chaseup Almond 200Gm", "Chaseup Roasted Chana"
    for (const c of CHAINS) {
      const own = itemNames.filter((n) =>
        c.re.test(n.split(' ').slice(0, 2).join(' ').replace(/^(chase)(up|value)\b/i, '$1 $2')),
      ).length;
      if (own >= 2 && own >= itemNames.length / 3) {
        chain = c.chain;
        chainPharmacy = !!c.pharmacy;
        break;
      }
    }
  }

  const online = (all.match(new RegExp(ONLINE.source, 'gi')) ?? []).length;
  const physical = (all.match(new RegExp(PHYSICAL.source, 'gi')) ?? []).length;
  const kind = online > physical ? 'online' : physical > online ? 'physical' : null;

  // A shop name from the top lines when it isn't a known chain (till receipts only).
  let name: string | null = null;
  if (!chain && kind !== 'online') {
    for (const l of header.slice(0, 4)) {
      const words = l.replace(/[()[\]]/g, ' ').trim().split(/\s+/);
      if (NOT_NAME.test(l) || /\d/.test(l) || words.length > 5 || l.replace(/[^a-z]/gi, '').length < 4) continue;
      name = title(l).replace(/\s+/g, ' ').trim();
      break;
    }
  }

  const areaLine = allLines.slice(0, 15).find((l) => AREA_RE.test(l)) ?? null;
  let area = areaLine?.match(AREA_RE)?.[1] ?? null;
  // "Pandamart - North Karachi (KHI)"
  const dash = header.find((l) => CHAINS.some((c) => c.re.test(l)) && / - /.test(l));
  if (dash) area = dash.split(' - ').slice(1).join(' - ').replace(/\([^)]*\)/g, '').trim() || area;
  if (area) area = AREAS.find((a) => a.toLowerCase().replace(/[\s-]/g, '') === area!.toLowerCase().replace(/[\s-]/g, '')) ?? area;

  const pharmacy = chainPharmacy || PHARMACY.test(top) || PHARMACY.test(name ?? '') || /\bpatient\b/i.test(all);
  return { chain, name, kind, pharmacy, area };
}
