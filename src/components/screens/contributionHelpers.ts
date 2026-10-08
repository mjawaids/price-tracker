// Non-component helpers for Your contributions (kept apart for fast refresh).
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useCompare } from '../../contexts/CompareContext';
import * as api from '../../lib/compare/api';

/** The local start of this month ("this month" counts reports added since). */
export const monthStart = (now = new Date()) => new Date(now.getFullYear(), now.getMonth(), 1);

/**
 * The user's totals from the database (spendless.my_contributions), read when online.
 * `stats` stays null offline or when the read failed (`failed`).
 */
export function useContributionStats() {
  const compare = useCompare();
  const uid = useAuth().user?.id ?? null;
  const [stats, setStats] = useState<api.ContributionStats | null>(null);
  const [failed, setFailed] = useState(false);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  useEffect(() => {
    if (!uid || !compare.online) return;
    let live = true;
    setFailed(false);
    api
      .fetchContributionStats(monthStart())
      .then((s) => live && setStats(s))
      .catch((error) => {
        console.error('Reading your contributions failed:', error instanceof api.ApiError ? error.code : 'network');
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [uid, compare.online, tick]);
  return { stats, failed, reload };
}

export type Standing = 'shared' | 'confirmed' | 'held' | 'private' | 'outOfStock' | 'disputes' | 'other';

/** Where one of the user's reports stands (the chip on a row, and how it's counted). */
export function standingOf(r: api.MyReport, ownStore: boolean): Standing {
  if (r.source === 'dispute') return 'disputes';
  if (r.price == null || !r.isAvailable) return 'outOfStock';
  if (ownStore) return 'private';
  if (r.status === 'pending') return 'held';
  if (r.status !== 'accepted') return 'other';
  return r.source === 'confirm' ? 'confirmed' : 'shared';
}
