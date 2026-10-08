// Words for Compare: how a list item was matched, how fresh a price is, what a
// store's delivery costs. Plain TS (no React) so it stays easy to tweak.
import { ITEM_TYPE_BY_ID } from './itemTypes';
import type { PreferenceMode, StoreDeliveryRule } from './types';
import type { ResolvedItem } from './resolve';
import { sizeLabel } from './units';

const DAY = 86400000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export type AgeTone = 'fresh' | 'recent' | 'old';

/**
 * The age chip on a price, by calendar day in local time: "Today", "Yesterday",
 * "2 days" (fresh); "5 days", "3 wks" (recent, up to 30 days); "Old · Aug", or
 * "Old · 2025" from another year.
 */
export function ageChip(observedAt: string | null | undefined, now = Date.now()): { label: string; tone: AgeTone } {
  const t = observedAt ? Date.parse(observedAt) : NaN;
  if (Number.isNaN(t)) return { label: 'Unknown', tone: 'old' };
  const dayOf = (ms: number) => {
    const d = new Date(ms);
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY;
  };
  const days = Math.max(0, Math.round(dayOf(now) - dayOf(t)));
  if (days === 0) return { label: 'Today', tone: 'fresh' };
  if (days === 1) return { label: 'Yesterday', tone: 'fresh' };
  if (days === 2) return { label: '2 days', tone: 'fresh' };
  if (days < 14) return { label: `${days} days`, tone: 'recent' };
  if (days <= 30) return { label: `${Math.round(days / 7)} wks`, tone: 'recent' };
  const d = new Date(t);
  return { label: d.getFullYear() === new Date(now).getFullYear() ? `Old · ${MONTHS[d.getMonth()]}` : `Old · ${d.getFullYear()}`, tone: 'old' };
}

/** "today", "3 days ago", "2 weeks ago", "May" — and whether it's over a month old. */
export function freshness(observedAt: string | null | undefined, now = Date.now()): { label: string; old: boolean } {
  const t = observedAt ? Date.parse(observedAt) : NaN;
  if (Number.isNaN(t)) return { label: 'unknown date', old: true };
  const days = Math.floor((now - t) / DAY);
  if (days <= 0) return { label: 'today', old: false };
  if (days === 1) return { label: 'yesterday', old: false };
  if (days < 14) return { label: `${days} days ago`, old: false };
  if (days <= 30) return { label: `${Math.round(days / 7)} weeks ago`, old: false };
  const d = new Date(t);
  const sameYear = d.getFullYear() === new Date(now).getFullYear();
  return { label: sameYear ? MONTHS[d.getMonth()] : `${MONTHS[d.getMonth()]} ${d.getFullYear()}`, old: true };
}

/** "Exactly this one" / "Dawn, similar size" / "Any brand, similar size". */
export function modeLabel(mode: PreferenceMode, brand: string | null): string {
  if (mode === 'exact') return 'Exactly this one';
  if (mode === 'brand_size') return `${brand || 'Same brand'}, similar size`;
  return 'Any brand, similar size';
}

/** Short text under an item in the plan: how we matched it. */
export function choiceLabel(r: ResolvedItem): string {
  const ref = r.reference;
  const size = ref ? sizeLabel(ref.size) : '';
  const about = size ? `about ${size}` : 'similar size';
  const name = ref?.product.name ?? '';
  switch (r.status) {
    case 'pinned':
      return `Just this time · ${name}`;
    case 'usual':
      return r.mode === 'exact' ? `Your usual · ${name}` : `Your usual · ${r.mode === 'brand_size' ? `${ref?.brand ?? 'same brand'}, ${about}` : `any brand, ${about}`}`;
    case 'named':
      return r.mode === 'exact' ? name : `${ref?.brand ? `${ref.brand}, ` : ''}${about}`;
    case 'assumed':
      return r.mode === 'exact' ? `We picked ${name}` : `Any brand, ${about} · ${name}`;
    case 'unpriced':
      return 'No prices at your stores yet';
    default:
      return 'Not in the catalogue yet';
  }
}

/** Generic name of what an item is ("Bread"), for sheet titles. */
export function itemTypeName(r: ResolvedItem): string {
  return r.itemType?.name ?? (r.reference?.itemType ? ITEM_TYPE_BY_ID.get(r.reference.itemType)?.name : undefined) ?? r.item.name;
}

/** "Free delivery over Rs 1,000" etc. `kind` decides the wording when there's no delivery. */
export function deliveryLabel(rule: StoreDeliveryRule, fmt: (n: number) => string, kind: 'physical' | 'online'): string {
  const min = rule.minOrder ? ` · min order ${fmt(rule.minOrder)}` : '';
  if (rule.type === 'none') return kind === 'physical' ? 'In store' : 'Pickup only';
  if (rule.type === 'free') return `Free delivery${min}`;
  if (rule.type === 'flat') return `${fmt(rule.fee)} delivery${min}`;
  return `Free delivery over ${fmt(rule.threshold)}${min}`;
}

/** What a plan's subtotal means for a store's delivery fee. */
export function deliveryNote(rule: StoreDeliveryRule, subtotal: number, fmt: (n: number) => string): { text: string; good: boolean } | null {
  if (rule.type === 'over') {
    return subtotal >= rule.threshold
      ? { text: `Free delivery — ${fmt(subtotal - rule.threshold)} over the minimum`, good: true }
      : { text: `Add ${fmt(rule.threshold - subtotal)} more for free delivery (saves ${fmt(rule.fee)})`, good: false };
  }
  if (rule.type === 'free') return { text: 'Free delivery', good: true };
  if (rule.type === 'flat') return { text: `${fmt(rule.fee)} delivery`, good: false };
  return null;
}
