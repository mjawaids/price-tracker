// Invite a friend. Each person has one invite code (spendless.invite_codes, made the
// first time they open the invite) and a name their invites show. A link
// `/?ref=<code>` is kept on the device (`captureRef`, run before the app renders) until
// the person signs in on a new account, then recorded once in spendless.referrals.
// The inviter only ever gets a count back. Rules: migration 20261017000000_invites.sql.
import { supabase } from './supabase';

const REF_KEY = 'spendless-invite-ref';
/** A link opened this long ago no longer counts. */
const REF_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** Only an account this new can say it came from an invite. */
const NEW_ACCOUNT_MS = 7 * 24 * 60 * 60 * 1000;
const CODE = /^[A-HJ-NP-Z2-9]{8}$/;
export const INVITE_NAME_MAX = 30;
export const APP_URL = 'https://spendless.ibexoft.com';

export interface Invite {
  code: string;
  name: string | null;
}

export const inviteLink = (code: string) =>
  `${APP_URL}/?ref=${code}&utm_source=spendless&utm_medium=referral&utm_campaign=invite`;

/** The first word of a profile name, or null (never the email). */
export function firstName(fullName: unknown): string | null {
  if (typeof fullName !== 'string') return null;
  const first = fullName.trim().split(/\s+/)[0] ?? '';
  return cleanInviteName(first);
}

/** Decimal digits in any script (Unicode Nd), as the database's spendless.digit_count counts them. */
const DIGITS = /\p{Nd}/gu;

/**
 * A name invites can show (the database's own check, done first here): plain, ≤30
 * characters, at most 2 digits in all, so no phone number fits however it's spaced.
 */
export function cleanInviteName(raw: string): string | null {
  const s = raw.replace(/\s+/g, ' ').trim().slice(0, INVITE_NAME_MAX).trim();
  if (!s) return null;
  if ((s.match(DIGITS)?.length ?? 0) > 2) return null;
  if (/[/:@<>\\]/.test(s) || /(www\.|\.[a-z]{2,}\b)/i.test(s)) return null;
  return s;
}

// ── The link someone opened ──────────────────────────────────────────────────
/** Keep `?ref=` from the address (then take it out of the address bar). */
export function captureRef(): void {
  try {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('ref')?.toUpperCase();
    if (!code) return;
    if (CODE.test(code)) localStorage.setItem(REF_KEY, JSON.stringify({ code, at: Date.now() }));
    url.searchParams.delete('ref');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  } catch {
    /* storage or history unavailable */
  }
}

/** The invite code kept on this device, if it's recent. */
export function pendingRef(): string | null {
  try {
    const raw = localStorage.getItem(REF_KEY);
    if (!raw) return null;
    const { code, at } = JSON.parse(raw) as { code?: unknown; at?: unknown };
    if (typeof code !== 'string' || !CODE.test(code) || typeof at !== 'number' || Date.now() - at > REF_TTL_MS) {
      localStorage.removeItem(REF_KEY);
      return null;
    }
    return code;
  } catch {
    return null;
  }
}

export function clearRef(): void {
  try {
    localStorage.removeItem(REF_KEY);
  } catch {
    /* storage unavailable */
  }
}

/** Who sent the invite, for the sign-up page (works signed out); null if unknown. */
export async function inviterName(code: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('invite_from', { p_code: code });
    if (error || typeof data !== 'string') return null;
    return cleanInviteName(data);
  } catch {
    return null;
  }
}

/**
 * Record that a new account came from the kept invite, once. Kept for later when
 * offline or on a passing error; dropped when it can't count (an older account, your
 * own code, already recorded, a code that doesn't exist).
 */
export async function recordReferral(accountCreatedAt: string | undefined): Promise<boolean> {
  const code = pendingRef();
  if (!code) return false;
  const age = accountCreatedAt ? Date.now() - new Date(accountCreatedAt).getTime() : Infinity;
  if (!(age < NEW_ACCOUNT_MS)) {
    clearRef();
    return false;
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
  try {
    const { error } = await supabase.from('referrals').insert({ code });
    // 23505 already recorded, 23503 no such code, 42501 your own code.
    if (!error || ['23505', '23503', '42501'].includes(error.code ?? '')) clearRef();
    return !error;
  } catch {
    return false;
  }
}

// ── Your own invite ──────────────────────────────────────────────────────────
/**
 * Your invite code and name, made the first time (with `defaultName`) unless `create`
 * is false. Null when there's none yet, offline or on an error.
 */
export async function myInvite(defaultName: string | null, create = true): Promise<Invite | null> {
  try {
    const { data, error } = await supabase.from('invite_codes').select('code, display_name').maybeSingle();
    if (error) throw error;
    if (data) return { code: data.code as string, name: (data.display_name as string | null) ?? null };
    if (!create) return null;
    // A new code; a clash with someone else's (≈1 in 10¹²) just tries again.
    for (let i = 0; i < 3; i++) {
      const res = await supabase.from('invite_codes').insert({ display_name: defaultName }).select('code, display_name').single();
      if (!res.error) return { code: res.data.code as string, name: (res.data.display_name as string | null) ?? null };
      if (res.error.code !== '23505') throw res.error;
      // Two tabs at once: the other one made it.
      const again = await supabase.from('invite_codes').select('code, display_name').maybeSingle();
      if (again.data) return { code: again.data.code as string, name: (again.data.display_name as string | null) ?? null };
    }
    return null;
  } catch (error) {
    console.error('Invite failed:', error instanceof Error ? error.message : 'unknown error');
    return null;
  }
}

/** Change the name your invites show; null shows "A friend". */
export async function setInviteName(code: string, name: string | null): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('invite_codes')
      .update({ display_name: name, updated_at: new Date().toISOString() })
      .eq('code', code);
    return !error;
  } catch {
    return false;
  }
}

/** How many people joined with your link (null when it can't be read). */
export async function joinedCount(code: string): Promise<number | null> {
  try {
    // By code: your own row (if you joined from someone's link) has theirs.
    const { count, error } = await supabase.from('referrals').select('code', { count: 'exact', head: true }).eq('code', code);
    if (error) return null;
    return count ?? 0;
  } catch {
    return null;
  }
}
