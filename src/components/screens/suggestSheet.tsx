// "Share this shop": suggest one of your own in-store shops as a shared one. Once enough
// people who shop there suggest it, a nightly job makes it shared and moves each
// person's shop into it (scripts/seed/promote-suggestions.ts); a shop that's already
// shared takes it in on the next run. Plus the shop sheet's row for it, and the
// one-time "Your shop is now shared" note.
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useCompare } from '../../contexts/CompareContext';
import type { SuggestResult } from '../../contexts/CompareContext';
import { canonicalArea, cleanPlace, findArea, PLACE_MAX, placeKey, placeProblem, searchAreas } from '../../lib/compare/areas';
import type { CatalogStore } from '../../lib/compare/types';
import { CHAINS } from '../../lib/receipt/stores';
import { trackUserAction } from '../../utils/analytics';
import { Btn, Chip, Icon, Sheet } from '../ui';
import { CompareNotice } from './compareParts';
import { branchArea, canShare, isBranch, sectionLabel } from './compareHelpers';
import { Field, TextIn } from './manageParts';

/** Chains seen on receipts that have no shops to walk into. */
const ONLINE_ONLY = new Set(['panda mart', 'sehat']);

const PROBLEMS: Record<Exclude<SuggestResult, 'ok'>, string> = {
  offline: 'You’re offline. Try again when you’re connected.',
  limit: 'You have 10 shops waiting to be shared. Withdraw one to suggest another.',
  taken: 'This shop was already suggested.',
  denied: 'Only your own in-store shops in a city with shared prices can be shared.',
  invalid: 'Check the name and area: English letters, numbers and simple punctuation only.',
  error: 'Couldn’t send — check your connection and try again.',
};

/** Shared in-store shops in the city, by chain. */
function useSharedShops() {
  const compare = useCompare();
  return useMemo(() => {
    const m = new Map<string, CatalogStore[]>();
    for (const s of compare.stores) {
      if (!isBranch(s) || s.status !== 'active' || !s.chain) continue;
      const k = placeKey(s.chain);
      m.set(k, [...(m.get(k) || []), s]);
    }
    return m;
  }, [compare.stores]);
}

const Problem = ({ id, text }: { id: string; text: string }) => (
  <p id={id} className="m-0 -mt-2.5 mb-4 text-[12.5px] font-semibold text-warn-ink">
    {text}
  </p>
);

export function SuggestShopSheet({ store, onClose, onDone }: { store: CatalogStore; onClose: () => void; onDone?: (message: string) => void }) {
  const compare = useCompare();
  const shared = useSharedShops();
  const regionId = compare.region?.id ?? null;
  const city = compare.region?.name ?? 'your city';

  // Quick picks: chains with shared shops here (several, or also online), then the chains
  // seen on receipts here.
  const chains = useMemo(() => {
    const online = new Set(compare.stores.filter((s) => !s.ownerId && s.kind === 'online' && s.chain).map((s) => placeKey(s.chain!)));
    const names = new Map<string, string>();
    for (const [k, list] of shared) if (list.length > 1 || online.has(k)) names.set(k, list[0].chain!);
    if (regionId === 'karachi') for (const c of CHAINS) if (!ONLINE_ONLY.has(placeKey(c.chain)) && !names.has(placeKey(c.chain))) names.set(placeKey(c.chain), c.chain);
    return [...names.values()];
  }, [shared, regionId, compare.stores]);

  const [chain, setChain] = useState('');
  const [area, setArea] = useState('');
  const [areaOpen, setAreaOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Start from what the shop already says: "Imtiaz near me" → Imtiaz; its area.
  useEffect(() => {
    const k = placeKey(store.name);
    const known = chains.find((c) => k === placeKey(c) || k.startsWith(`${placeKey(c)} `));
    setChain(known ?? cleanPlace(store.name).slice(0, PLACE_MAX.chain));
    setArea(findArea(regionId, store.address) ?? '');
    setError('');
  }, [store.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const chainName = cleanPlace(chain);
  const areaName = canonicalArea(regionId, area);
  const knownChain = chains.find((c) => placeKey(c) === placeKey(chainName)) ?? null;
  const branches = (shared.get(placeKey(chainName)) ?? []).slice().sort((a, b) => branchArea(a).localeCompare(branchArea(b)));
  const match = branches.find((b) => placeKey(branchArea(b)) === placeKey(areaName)) ?? null;
  // The one that matches comes first, so it's seen picked.
  const listed = match ? [match, ...branches.filter((b) => b !== match)] : branches;
  const chainProblem = chainName ? placeProblem(chainName, PLACE_MAX.chain) : null;
  const areaProblem = areaName ? placeProblem(areaName, PLACE_MAX.area) : null;
  const tooLong = !match && chainName.length + areaName.length > PLACE_MAX.both;
  const ready = !!chainName && !!areaName && !chainProblem && !areaProblem && !tooLong;
  const areaHits = areaOpen && area.trim() && !match ? searchAreas(regionId, area).filter((a) => a.name !== areaName).slice(0, 5) : [];

  const submit = async () => {
    if (!ready) return;
    setSaving(true);
    setError('');
    const result = await compare.suggestBranch(store.id, match?.chain ?? knownChain ?? chainName, match ? branchArea(match) : areaName, !!(match || knownChain));
    setSaving(false);
    if (result !== 'ok') {
      setError(PROBLEMS[result]);
      return;
    }
    onDone?.(match ? `Your shop moves into ${match.name} in a day or two.` : 'Suggested. It becomes shared once enough people who shop there suggest it.');
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="Share this shop"
      footer={
        <Btn full size="lg" icon={match ? 'store' : 'users'} onClick={() => void submit()} disabled={!ready || saving || !compare.online}>
          {saving ? 'Sending…' : match ? 'Move my shop into it' : 'Suggest this shop'}
        </Btn>
      }
    >
      <p className="m-0 -mt-1 mb-4 text-[14px] leading-relaxed text-ink-soft">
        Name the shop the way others know it. When enough people who shop there suggest it, everyone in {city} sees its prices.
      </p>
      {!compare.online && (
        <div className="mb-4">
          <CompareNotice icon="wifiOff" title="You’re offline" body="Suggesting a shop needs a connection." />
        </div>
      )}

      <Field label="Shop or chain">
        <TextIn
          value={chain}
          onChange={(e) => setChain(e.target.value.slice(0, PLACE_MAX.chain))}
          placeholder="e.g. Al-Madina General Store"
          autoComplete="off"
          aria-invalid={!!chainProblem}
          aria-describedby={chainProblem ? 'suggest-chain-problem' : undefined}
        />
      </Field>
      {chainProblem && <Problem id="suggest-chain-problem" text={chainProblem} />}
      {chains.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mt-2 mb-4 pb-1" role="group" aria-label="Known chains">
          {chains.map((c) => (
            <Chip key={c} active={knownChain === c} onClick={() => setChain(c)}>
              {c}
            </Chip>
          ))}
        </div>
      )}

      {branches.length > 0 && (
        <section className="flex flex-col gap-2 mb-4" aria-labelledby="suggest-shared">
          <h3 id="suggest-shared" className={`m-0 ${sectionLabel}`}>
            Already shared · {branches.length}
          </h3>
          <p className="m-0 text-[13px] leading-snug text-ink-soft">If your shop is one of these, pick it: your shop moves into it.</p>
          <div className="rounded-[16px] bg-surface shadow-[inset_0_0_0_1.5px_var(--line)] overflow-hidden max-h-[264px] overflow-y-auto">
            {listed.map((b, i) => {
              const on = match?.id === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setArea(branchArea(b))}
                  aria-pressed={on}
                  className="w-full flex items-center gap-3 text-left"
                  style={{ padding: '10px 14px', minHeight: 56, borderTop: i ? '1px solid var(--line)' : 'none', background: on ? 'var(--accent-wash)' : undefined }}
                >
                  <span className="flex-1 min-w-0">
                    <span className="block font-bold text-[15px] truncate">{branchArea(b)}</span>
                    <span className="block text-[12.5px] text-ink-soft truncate">{b.address || 'In store'}</span>
                  </span>
                  {on ? <Icon name="checkCircle" size={19} stroke={2.2} color="var(--accent-ink)" className="shrink-0" /> : <span className="shrink-0 text-[12.5px] font-bold text-accent-ink">That’s my shop</span>}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <Field label={branches.length ? 'Or its area' : 'Area'}>
        <TextIn
          value={area}
          onChange={(e) => {
            setArea(e.target.value.slice(0, PLACE_MAX.area));
            setAreaOpen(true);
          }}
          onFocus={() => setAreaOpen(true)}
          placeholder={regionId === 'karachi' ? 'e.g. Bahadurabad' : 'The area or neighbourhood'}
          autoComplete="off"
          aria-invalid={!!(areaProblem || tooLong)}
          aria-describedby={areaProblem || tooLong ? 'suggest-area-problem' : undefined}
        />
      </Field>
      {(areaProblem || tooLong) && <Problem id="suggest-area-problem" text={tooLong ? 'The name and area are too long together — shorten one.' : areaProblem!} />}
      {areaHits.length > 0 && (
        <div id="suggest-areas" className="-mt-2 mb-4 rounded-[14px] bg-surface shadow-[inset_0_0_0_1.5px_var(--line)] overflow-hidden" role="group" aria-label="Areas">
          {areaHits.map((a, i) => (
            <button
              key={a.name}
              type="button"
              onClick={() => {
                setArea(a.name);
                setAreaOpen(false);
              }}
              className="w-full flex items-center gap-2.5 text-left text-[15px]"
              style={{ padding: '0 14px', minHeight: 48, borderTop: i ? '1px solid var(--line)' : 'none' }}
            >
              <Icon name="pin" size={16} stroke={2.2} color="var(--ink-soft)" className="shrink-0" />
              {a.name}
            </button>
          ))}
        </div>
      )}

      {ready && (
        <div className="rounded-[16px] bg-accent-wash flex flex-col gap-2.5 mb-3" style={{ padding: 14 }}>
          <div className="text-[14.5px] leading-snug">
            {match ? (
              <>
                <strong>{match.name}</strong> is already shared. Your shop moves into it in a day or two.
              </>
            ) : (
              <>
                Shared as <strong>{`${knownChain ?? chainName} · ${areaName}`}</strong>
              </>
            )}
          </div>
          <ul className="m-0 p-0 list-none flex flex-col gap-2 text-[13.5px] leading-snug text-ink-soft">
            <li className="flex gap-2.5 items-start">
              <Icon name="lock" size={16} stroke={2.2} className="shrink-0 mt-px text-accent-ink" />
              Your prices there go with it. Your name is never shown.
            </li>
            <li className="flex gap-2.5 items-start">
              <Icon name="store" size={16} stroke={2.2} className="shrink-0 mt-px text-accent-ink" />
              It replaces your own copy in My stores and your lists. Delivery details aren’t shared.
            </li>
            {!match && (
              <li className="flex gap-2.5 items-start">
                <Icon name="users" size={16} stroke={2.2} className="shrink-0 mt-px text-accent-ink" />
                Until enough people suggest it, nothing changes. You can withdraw it until then.
              </li>
            )}
          </ul>
        </div>
      )}
      {error && (
        <div role="alert" className="text-[13px] mb-2" style={{ color: 'var(--danger)' }}>
          {error}
        </div>
      )}
    </Sheet>
  );
}

/** In your shop's sheet: share it, or where its suggestion stands. */
export function ShareShopRow({ store, onShare, onError }: { store: CatalogStore; onShare: () => void; onError: (message: string) => void }) {
  const compare = useCompare();
  const s = compare.suggestionFor(store.id);
  const [busy, setBusy] = useState(false);
  const city = compare.region?.name ?? 'your city';

  if (s?.status === 'open') {
    const withdraw = async () => {
      setBusy(true);
      const r = await compare.withdrawSuggestion(s.id);
      setBusy(false);
      if (r === 'error') onError('Couldn’t withdraw — check your connection and try again.');
      else if (r === 'decided') onError('That suggestion was just decided — have a look at your stores.');
    };
    return (
      <div role="status" className="flex gap-3 items-start rounded-[16px] bg-accent-wash mb-4" style={{ padding: '12px 14px' }}>
        <Icon name="users" size={19} stroke={2.2} color="var(--accent-ink)" className="shrink-0 mt-0.5" />
        <span className="flex-1 min-w-0 flex flex-col gap-0.5">
          <span className="font-bold text-[14.5px]">
            Suggested as {s.chain} · {s.area}
          </span>
          <span className="text-[13px] leading-snug text-ink-soft">It becomes shared once enough people who shop there suggest it.</span>
        </span>
        <Btn size="sm" variant="ghost" onClick={() => void withdraw()} disabled={busy || !compare.online}>
          {busy ? '…' : 'Withdraw'}
        </Btn>
      </div>
    );
  }
  if (s?.status === 'declined') {
    return (
      <div role="status" className="flex gap-3 items-start rounded-[16px] bg-surface shadow-[inset_0_0_0_1px_var(--line)] mb-4" style={{ padding: '12px 14px' }}>
        <Icon name="lock" size={19} stroke={2.2} color="var(--ink-soft)" className="shrink-0 mt-0.5" />
        <span className="text-[13.5px] leading-snug text-ink-soft">
          <strong className="text-ink">Not shared.</strong> {s.chain} · {s.area} isn’t a shared shop any more, so this one stays yours.
        </span>
      </div>
    );
  }
  if (!canShare(compare, store)) return null;
  return (
    <button
      type="button"
      onClick={onShare}
      disabled={!compare.online}
      className="w-full flex items-center gap-3 text-left rounded-[16px] bg-surface shadow-[inset_0_0_0_1.5px_var(--line)] mb-4 disabled:opacity-40"
      style={{ padding: '12px 14px', minHeight: 60 }}
    >
      <span className="grid place-items-center shrink-0 rounded-[10px] bg-accent-wash text-accent-ink" style={{ width: 34, height: 34 }}>
        <Icon name="users" size={18} stroke={2.2} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block font-bold text-[15px]">Share this shop</span>
        <span className="block text-[12.5px] leading-snug text-ink-soft">So others in {city} see its prices too</span>
      </span>
      <Icon name="chevR" size={17} stroke={2.2} color="var(--ink-soft)" className="shrink-0" />
    </button>
  );
}

const seenKey = (uid: string) => `spendless-shared-shop:${uid}`;
const RECENT_MS = 30 * 86400000;

function readSeen(uid: string): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(seenKey(uid)) || '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** One time per shop: "Your shop is now shared" (Prices and Stores). */
export function SharedShopNotice({ onOpen }: { onOpen: (storeId: string) => void }) {
  const compare = useCompare();
  const { user } = useAuth();
  const uid = user?.id ?? null;
  const [seen, setSeen] = useState<string[]>(() => (uid ? readSeen(uid) : []));
  useEffect(() => setSeen(uid ? readSeen(uid) : []), [uid]);

  const fresh = compare.suggestions.filter(
    (s) =>
      s.status === 'promoted' &&
      s.promotedStoreId &&
      !seen.includes(s.id) &&
      s.decidedAt &&
      Date.now() - Date.parse(s.decidedAt) < RECENT_MS &&
      compare.storeById(s.promotedStoreId)?.status === 'active',
  );
  if (!uid || !fresh.length) return null;
  const names = [...new Set(fresh.map((s) => compare.storeById(s.promotedStoreId!)!.name))];

  const done = () => {
    const next = [...new Set([...seen, ...fresh.map((s) => s.id)])].slice(-50);
    try {
      localStorage.setItem(seenKey(uid), JSON.stringify(next));
    } catch {
      // Storage full or blocked: it shows again next time.
    }
    setSeen(next);
    if (typeof window.gtag !== 'undefined') trackUserAction('shared_shop_seen', { count: fresh.length });
  };

  return (
    <CompareNotice
      icon="users"
      title={names.length === 1 ? 'Your shop is now shared' : 'Your shops are now shared'}
      body={`${names.join(' and ')} ${names.length === 1 ? 'is now a shared shop' : 'are now shared shops'}. Your prices there moved with ${names.length === 1 ? 'it' : 'them'} (your name is never shown), and ${names.length === 1 ? 'it' : 'they'} replaced your own copy in My stores.`}
      action={
        <span className="flex gap-2 flex-wrap">
          <Btn
            size="sm"
            onClick={() => {
              done();
              onOpen(fresh[0].promotedStoreId!);
            }}
          >
            See the shop
          </Btn>
          <Btn size="sm" variant="ghost" onClick={done}>
            Dismiss
          </Btn>
        </span>
      }
    />
  );
}
