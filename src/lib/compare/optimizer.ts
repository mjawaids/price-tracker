// Where to buy a list for the least, delivery included.
//
// Each line (list item) has options: (store, product, packs, total). We try every
// set of 1–4 stores from the candidates (8 stores → 162 sets), give each line its
// cheapest option inside the set, then move lines between the set's stores while
// that lowers the total (crossing a "free over X" threshold, meeting a minimum
// order). Sets are ranked by how many lines they cover, then by total.
//
// Results: the cheapest plan, a plan with fewer stops when one exists, the best
// single store, and a concrete baseline for "you save" — buying it all at one store.
import type { DeliveryRule } from '../../types/index.ts';
import type { StoreDeliveryRule } from './types.ts';

export interface LineOption {
  storeId: string;
  productId: string;
  packs: number;
  /** Price of one pack. */
  unitPrice: number;
  /** packs × unitPrice */
  total: number;
}

export interface PlanLineInput {
  key: string;
  options: LineOption[];
}

export interface OptStore {
  id: string;
  rule: StoreDeliveryRule;
}

export interface PlannedLine {
  key: string;
  option: LineOption;
}

export interface StorePlan {
  storeId: string;
  lines: PlannedLine[];
  subtotal: number;
  delivery: number;
  total: number;
}

export interface Plan {
  stores: StorePlan[];
  itemsTotal: number;
  deliveryTotal: number;
  total: number;
  /** Line keys this plan buys, and the coverable ones it can't. */
  covered: string[];
  uncovered: string[];
}

export interface PlanSet {
  cheapest: Plan | null;
  /** Covers as much as `cheapest` with fewer (but 2+) stores; costs a little more. */
  fewerStops: Plan | null;
  /** Best single store, when `cheapest` uses more than one. */
  oneStop: Plan | null;
  /** "Buy it all at X" — for the savings line. */
  baseline: { storeId: string; total: number } | null;
  savings: number;
  /** Lines with at least one priced option. */
  coverable: string[];
  /** Lines with no option at any candidate store. */
  unpriced: string[];
}

export interface OptimizeOptions {
  /** Most stores in one plan (default 4). */
  maxStores?: number;
  /** Most candidate stores considered (default 12; best-covering kept). */
  maxCandidates?: number;
}

// ── Delivery ─────────────────────────────────────────────────────────────────

export function deliveryFeeFor(rule: DeliveryRule | undefined, subtotal: number): number {
  if (!rule || subtotal <= 0) return 0;
  if (rule.type === 'flat') return rule.fee;
  if (rule.type === 'over') return subtotal >= rule.threshold ? 0 : rule.fee;
  return 0;
}

const MIN_ORDER_PENALTY = 1e9;

// ── Core ─────────────────────────────────────────────────────────────────────

interface Evaluated {
  storeIds: string[];
  assign: Map<number, LineOption>; // line index → option
  total: number;
  covered: number;
  feasible: boolean;
}

function combinations<T>(items: T[], k: number): T[][] {
  const out: T[][] = [];
  const pick = (start: number, acc: T[]) => {
    if (acc.length === k) {
      out.push([...acc]);
      return;
    }
    for (let i = start; i < items.length; i++) {
      acc.push(items[i]);
      pick(i + 1, acc);
      acc.pop();
    }
  };
  pick(0, []);
  return out;
}

function evaluateSet(storeIds: string[], lines: PlanLineInput[], rules: Map<string, StoreDeliveryRule>): Evaluated {
  const inSet = new Set(storeIds);
  const assign = new Map<number, LineOption>();
  const subtotal = new Map<string, number>(storeIds.map((s) => [s, 0]));

  lines.forEach((line, i) => {
    let best: LineOption | null = null;
    for (const o of line.options) if (inSet.has(o.storeId) && (!best || o.total < best.total)) best = o;
    if (best) {
      assign.set(i, best);
      subtotal.set(best.storeId, subtotal.get(best.storeId)! + best.total);
    }
  });

  const storeCost = (sid: string, sub: number) => {
    if (sub <= 0) return 0;
    const rule = rules.get(sid);
    const min = rule?.minOrder ?? 0;
    return deliveryFeeFor(rule, sub) + (sub < min ? MIN_ORDER_PENALTY : 0);
  };

  // Local search: move single lines between the set's stores while it helps.
  for (let iter = 0; iter < 60; iter++) {
    let bestDelta = -1e-9;
    let bestMove: { i: number; to: LineOption } | null = null;
    for (const [i, cur] of assign) {
      const fromSub = subtotal.get(cur.storeId)!;
      for (const o of lines[i].options) {
        if (o.storeId === cur.storeId || !inSet.has(o.storeId)) continue;
        const toSub = subtotal.get(o.storeId)!;
        const before = storeCost(cur.storeId, fromSub) + storeCost(o.storeId, toSub) + cur.total;
        const after = storeCost(cur.storeId, fromSub - cur.total) + storeCost(o.storeId, toSub + o.total) + o.total;
        const delta = after - before;
        if (delta < bestDelta) {
          bestDelta = delta;
          bestMove = { i, to: o };
        }
      }
    }
    if (!bestMove) break;
    const cur = assign.get(bestMove.i)!;
    subtotal.set(cur.storeId, subtotal.get(cur.storeId)! - cur.total);
    subtotal.set(bestMove.to.storeId, subtotal.get(bestMove.to.storeId)! + bestMove.to.total);
    assign.set(bestMove.i, bestMove.to);
  }

  let total = 0;
  let feasible = true;
  for (const [sid, sub] of subtotal) {
    if (sub <= 0) continue;
    const rule = rules.get(sid);
    if (sub < (rule?.minOrder ?? 0)) feasible = false;
    total += sub + deliveryFeeFor(rule, sub);
  }
  const used = storeIds.filter((s) => subtotal.get(s)! > 0);
  return { storeIds: used, assign, total, covered: assign.size, feasible };
}

function toPlan(ev: Evaluated, lines: PlanLineInput[], rules: Map<string, StoreDeliveryRule>, coverable: Set<string>): Plan {
  const byStore = new Map<string, PlannedLine[]>();
  for (const [i, option] of ev.assign) {
    const list = byStore.get(option.storeId) || [];
    list.push({ key: lines[i].key, option });
    byStore.set(option.storeId, list);
  }
  const stores: StorePlan[] = [...byStore.entries()]
    .map(([storeId, ls]) => {
      const subtotal = round(ls.reduce((a, l) => a + l.option.total, 0));
      const delivery = deliveryFeeFor(rules.get(storeId), subtotal);
      return { storeId, lines: ls, subtotal, delivery, total: round(subtotal + delivery) };
    })
    .sort((a, b) => b.total - a.total);
  const covered = new Set([...ev.assign.keys()].map((i) => lines[i].key));
  const itemsTotal = round(stores.reduce((a, s) => a + s.subtotal, 0));
  const deliveryTotal = round(stores.reduce((a, s) => a + s.delivery, 0));
  return {
    stores,
    itemsTotal,
    deliveryTotal,
    total: round(itemsTotal + deliveryTotal),
    covered: [...covered],
    uncovered: [...coverable].filter((k) => !covered.has(k)),
  };
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Rank: more lines covered first, then lower total, then fewer stores. */
const better = (a: Evaluated, b: Evaluated | null) =>
  !b ||
  a.covered > b.covered ||
  (a.covered === b.covered &&
    (a.total < b.total - 1e-6 || (Math.abs(a.total - b.total) <= 1e-6 && a.storeIds.length < b.storeIds.length)));

export function buildPlans(lines: PlanLineInput[], stores: OptStore[], opts: OptimizeOptions = {}): PlanSet {
  const maxStores = opts.maxStores ?? 4;
  const maxCandidates = opts.maxCandidates ?? 12;
  const rules = new Map(stores.map((s) => [s.id, s.rule]));
  const known = new Set(stores.map((s) => s.id));

  // Only options at known stores with a real price count.
  const clean = lines.map((l) => ({
    key: l.key,
    options: l.options.filter((o) => known.has(o.storeId) && o.total > 0 && Number.isFinite(o.total)),
  }));
  const coverable = clean.filter((l) => l.options.length).map((l) => l.key);
  const unpriced = clean.filter((l) => !l.options.length).map((l) => l.key);
  const empty: PlanSet = { cheapest: null, fewerStops: null, oneStop: null, baseline: null, savings: 0, coverable, unpriced };
  if (!coverable.length) return empty;
  const priced = clean.filter((l) => l.options.length);
  const coverableSet = new Set(coverable);

  // Candidate stores: keep the ones that cover the most lines, then win the most.
  const score = new Map<string, { cover: number; wins: number }>();
  for (const l of priced) {
    const cheapest = Math.min(...l.options.map((o) => o.total));
    for (const sid of new Set(l.options.map((o) => o.storeId))) {
      const s = score.get(sid) || { cover: 0, wins: 0 };
      s.cover += 1;
      if (l.options.some((o) => o.storeId === sid && o.total <= cheapest + 1e-9)) s.wins += 1;
      score.set(sid, s);
    }
  }
  const candidates = [...score.entries()]
    .sort(([, a], [, b]) => b.cover - a.cover || b.wins - a.wins)
    .slice(0, maxCandidates)
    .map(([sid]) => sid);

  let best: Evaluated | null = null;
  const bestBySize = new Map<number, Evaluated>();
  const singles: Evaluated[] = [];
  for (let k = 1; k <= Math.min(maxStores, candidates.length); k++) {
    for (const set of combinations(candidates, k)) {
      const ev = evaluateSet(set, priced, rules);
      if (!ev.feasible || !ev.storeIds.length) continue;
      if (ev.storeIds.length < set.length) continue; // same as a smaller set, already tried
      if (k === 1) singles.push(ev);
      if (better(ev, best)) best = ev;
      if (better(ev, bestBySize.get(k) ?? null)) bestBySize.set(k, ev);
    }
  }
  if (!best) return empty;

  const cheapest = toPlan(best, priced, rules, coverableSet);

  // Fewer stops: the cheapest set of 2+ stores (below the cheapest plan's count) that
  // still covers as much. A single store is reported separately as oneStop.
  let fewer: Evaluated | null = null;
  for (const [k, ev] of bestBySize) {
    if (k < 2 || k >= best.storeIds.length || ev.covered < best.covered) continue;
    if (!fewer || ev.total < fewer.total) fewer = ev;
  }

  let single: Evaluated | null = null;
  for (const ev of singles) if (better(ev, single)) single = ev;

  // Baseline: everything at one store (not the cheapest plan's only store), lines it
  // lacks priced as in the cheapest plan, plus that store's delivery.
  let baseline: PlanSet['baseline'] = null;
  const baselineFrom = singles
    .filter((ev) => !(best!.storeIds.length === 1 && ev.storeIds[0] === best!.storeIds[0]))
    .reduce<Evaluated | null>((acc, ev) => (better(ev, acc) ? ev : acc), null);
  if (baselineFrom) {
    const sid = baselineFrom.storeIds[0];
    let sub = 0;
    let other = 0;
    for (const [i, opt] of best.assign) {
      const here = priced[i].options.filter((o) => o.storeId === sid).sort((a, b) => a.total - b.total)[0];
      if (here) sub += here.total;
      else other += opt.total;
    }
    baseline = { storeId: sid, total: round(sub + deliveryFeeFor(rules.get(sid), sub) + other) };
  }

  return {
    cheapest,
    fewerStops: fewer ? toPlan(fewer, priced, rules, coverableSet) : null,
    oneStop: single && best.storeIds.length > 1 ? toPlan(single, priced, rules, coverableSet) : null,
    baseline,
    savings: baseline ? Math.max(0, round(baseline.total - cheapest.total)) : 0,
    coverable,
    unpriced,
  };
}
