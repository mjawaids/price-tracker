// Which list items were already asked "Was it Rs 210?" (answered from the toast or the
// store summary) and which stores the user said "Not now" to, per list. A shopping
// trip's worth: entries go after 12 hours. localStorage, this device; deleted on
// sign-out. App-only.

const key = (uid: string) => `spendless-price-checks:${uid}`;
export const CHECK_TTL_MS = 12 * 3600000;

interface ListChecks {
  answered: Record<string, number>;
  dismissed: Record<string, number>;
}
export type CheckState = Record<string, ListChecks>;

const fresh = (rec: Record<string, number> | undefined, now: number) =>
  Object.fromEntries(Object.entries(rec ?? {}).filter(([, at]) => typeof at === 'number' && now - at < CHECK_TTL_MS));

export function loadChecks(uid: string, now = Date.now()): CheckState {
  try {
    const raw = localStorage.getItem(key(uid));
    const parsed = raw ? (JSON.parse(raw) as CheckState) : {};
    const out: CheckState = {};
    for (const [listId, c] of Object.entries(parsed ?? {})) {
      const answered = fresh(c?.answered, now);
      const dismissed = fresh(c?.dismissed, now);
      if (Object.keys(answered).length || Object.keys(dismissed).length) out[listId] = { answered, dismissed };
    }
    return out;
  } catch {
    return {};
  }
}

function save(uid: string, state: CheckState) {
  try {
    if (Object.keys(state).length) localStorage.setItem(key(uid), JSON.stringify(state));
    else localStorage.removeItem(key(uid));
  } catch {
    /* blocked storage: the questions may come again, nothing else breaks */
  }
}

const listOf = (state: CheckState, listId: string): ListChecks => state[listId] ?? { answered: {}, dismissed: {} };

export function markAnswered(uid: string, listId: string, itemIds: string[], now = Date.now()): CheckState {
  const state = loadChecks(uid, now);
  const l = listOf(state, listId);
  for (const id of itemIds) l.answered[id] = now;
  state[listId] = l;
  save(uid, state);
  return state;
}

export function markDismissed(uid: string, listId: string, storeId: string, now = Date.now()): CheckState {
  const state = loadChecks(uid, now);
  const l = listOf(state, listId);
  l.dismissed[storeId] = now;
  state[listId] = l;
  save(uid, state);
  return state;
}

export const isAnswered = (state: CheckState, listId: string, itemId: string) => !!state[listId]?.answered[itemId];
export const isDismissed = (state: CheckState, listId: string, storeId: string) => !!state[listId]?.dismissed[storeId];

export function clearChecks(uid: string) {
  try {
    localStorage.removeItem(key(uid));
  } catch {
    /* nothing to clear */
  }
}
