// Is a receipt line a medicine? Medicines are saved only for the user (as their own
// private products), never to the shared catalogue. When unsure at a pharmacy, private.
import { findTypes, matchItemType } from '../compare/itemTypes.ts';

const FORM = /\b(?:tabs?|tablets?|caps?|capsules?|softgels?|syp|syr|syrup|susp|suspension|drops?|inj|injections?|ointment|oint|inhaler|lozenges?|chewables?|sachets? of ors|eye drops?|ear drops?|nasal spray|suppositor(?:y|ies)|ampoules?|vials?|i\.?v\.?)\b/i;
const STRENGTH = /\b\d+(?:\.\d+)?\s*(?:mg|mcg|µg|iu)\b|\b\d+\s*\/\s*\d+\s*mg\b/i;
const MED_CODE = /^(?:tab|cap|syp|syr|inj|drp|sus|oint|crm|ph)[-\d]/i;
const PHARMACY_SECTION = /^(?:pharmacy|medicines?)$/i;
const OTHER_SECTION = /^(?:grocery|groceries|general(?: items?)?|cosmetics?|household|frozen|bakery|fresh|dairy|beverages?|food)$/i;

export interface MedicineInput {
  name: string;
  section: string | null;
  code: string | null;
}

/**
 * How sure we are that a line is a medicine: 'yes' (a PHARMACY section, a medicine
 * code, a strength like "500mg"), 'maybe' (a pharmacy word or form, or a pharmacy
 * shop: private unless it matches a shared product, which are never medicines), 'no'.
 */
export function medicineSignal(line: MedicineInput, pharmacyStore: boolean): 'yes' | 'maybe' | 'no' {
  if (line.section && PHARMACY_SECTION.test(line.section)) return 'yes';
  if (line.section && OTHER_SECTION.test(line.section)) return 'no';
  if (line.code && MED_CODE.test(line.code)) return 'yes';
  if (STRENGTH.test(line.name)) return 'yes';
  // A pharmacy word anywhere counts ("Vitamin C 1000 Plus Orange" is not fruit)
  if (findTypes(line.name).some((t) => t.type.category === 'pharmacy')) return 'maybe';
  // A grocery/household type wins over a form word ("Chocolate Syrup", "Mug Cap")
  const type = matchItemType(line.name);
  if (type && type.confident) return pharmacyStore ? 'maybe' : 'no';
  if (FORM.test(line.name)) return 'maybe';
  return pharmacyStore ? 'maybe' : 'no';
}
