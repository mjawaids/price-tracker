// Invite a friend: the link with Copy, Share (the phone's share sheet), the name the
// invite shows (editable) and how many joined. Opened from Profile and from the card
// after a plan shows savings. Data: src/lib/invite.ts.
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { trackUserAction } from '../../utils/analytics';
import { INVITE_NAME_MAX, Invite, cleanInviteName, firstName, inviteLink, joinedCount, myInvite, setInviteName } from '../../lib/invite';
import { Btn, Icon, Sheet } from '../ui';
import { TextIn } from './manageParts';

const track = (action: string, details?: Record<string, unknown>) => {
  // Counts only: never the name, code or link.
  if (typeof window !== 'undefined' && typeof window.gtag !== 'undefined') trackUserAction(action, details);
};

export function InviteSheet({ open, onClose, from }: { open: boolean; onClose: () => void; from: 'profile' | 'plan' }) {
  const { user } = useAuth();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [joined, setJoined] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [nameError, setNameError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!open) return;
    let live = true;
    setState('loading');
    setEditing(false);
    track('invite_opened', { from });
    void myInvite(firstName(user?.user_metadata?.full_name)).then((inv) => {
      if (!live) return;
      setInvite(inv);
      setState(inv ? 'ready' : 'failed');
      if (inv) void joinedCount(inv.code).then((n) => live && setJoined(n));
    });
    return () => {
      live = false;
    };
    // Load when opened (or retried).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, attempt]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(t);
  }, [copied]);

  const link = invite ? inviteLink(invite.code) : '';
  const shownName = invite?.name ?? null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      track('invite_shared', { method: 'copy' });
    } catch {
      // No clipboard access: select the link so it can be copied by hand.
      const el = document.getElementById('invite-link') as HTMLInputElement | null;
      el?.select();
    }
  };

  const share = async () => {
    const text = `${shownName ?? 'A friend'} invited you to SpendLess — a shopping list that works offline and finds its aisles.`;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'SpendLess', text, url: link });
        track('invite_shared', { method: 'share' });
      } catch {
        /* closed without sharing */
      }
      return;
    }
    await copy();
  };

  const startEdit = () => {
    setDraft(shownName ?? '');
    setNameError(false);
    setEditing(true);
  };
  const saveName = async () => {
    if (!invite) return;
    const typed = draft.trim();
    const name = typed ? cleanInviteName(typed) : null;
    if (typed && !name) {
      setNameError(true);
      return;
    }
    setSaving(true);
    const ok = await setInviteName(invite.code, name);
    setSaving(false);
    if (!ok) {
      setNameError(true);
      return;
    }
    setInvite({ ...invite, name });
    setEditing(false);
  };

  return (
    <Sheet open={open} onClose={onClose} title="Invite a friend">
      <p className="m-0 -mt-1 mb-4 text-[15px] leading-relaxed text-ink-soft">
        Share SpendLess with the people you shop for. Lists are free, work offline, and find their aisles.
      </p>

      {state === 'loading' && (
        <div aria-busy="true" aria-label="Getting your invite link" className="flex flex-col gap-3">
          <div className="rounded-[14px] bg-surface animate-pulse" style={{ height: 52 }} />
          <div className="rounded-[14px] bg-surface animate-pulse" style={{ height: 56 }} />
          <div className="rounded-btn bg-surface animate-pulse" style={{ height: 54 }} />
        </div>
      )}

      {state === 'failed' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-2.5 rounded-[14px] bg-surface shadow-[inset_0_0_0_1.5px_var(--line)] text-[14px] leading-snug" style={{ padding: 14 }}>
            <Icon name="wifiOff" size={18} color="var(--ink-soft)" stroke={2.1} />
            <span>Your invite link needs a connection. Connect to the internet and try again.</span>
          </div>
          <Btn full variant="ghost" onClick={() => setAttempt((n) => n + 1)}>
            Try again
          </Btn>
        </div>
      )}

      {state === 'ready' && invite && (
        <div className="flex flex-col gap-3.5">
          {editing ? (
            <div className="flex flex-col gap-2">
              <label htmlFor="invite-name" className="font-mono text-[11px] font-bold tracking-[0.12em] text-ink-soft">
                YOUR INVITE SAYS IT’S FROM
              </label>
              <TextIn
                id="invite-name"
                value={draft}
                maxLength={INVITE_NAME_MAX}
                autoFocus
                placeholder="Your first name"
                onChange={(e) => {
                  setDraft(e.target.value);
                  setNameError(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void saveName();
                }}
                aria-invalid={nameError}
                aria-describedby="invite-name-help"
              />
              <span id="invite-name-help" className={`text-[12.5px] ${nameError ? 'text-danger' : 'text-ink-soft'}`}>
                {nameError ? 'Use a plain name — no links, emails or phone numbers.' : 'Leave it empty to show “A friend”.'}
              </span>
              <div className="flex gap-2">
                <Btn variant="ghost" onClick={() => setEditing(false)} className="flex-1">
                  Cancel
                </Btn>
                <Btn onClick={() => void saveName()} disabled={saving} className="flex-1">
                  {saving ? 'Saving…' : 'Save'}
                </Btn>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 rounded-[14px] bg-surface shadow-[inset_0_0_0_1.5px_var(--line)]" style={{ minHeight: 48, padding: '4px 6px 4px 14px' }}>
              <span className="flex-1 min-w-0 text-[14.5px] leading-snug break-words">
                Your invite says it’s from <b>{shownName ?? 'a friend'}</b>
              </span>
              <button type="button" onClick={startEdit} className="shrink-0 rounded-[12px] font-extrabold text-[14px] text-accent-ink" style={{ minHeight: 44, padding: '0 14px' }}>
                Edit
              </button>
            </div>
          )}

          <div className="flex items-center gap-2.5 rounded-[14px] bg-surface shadow-[inset_0_0_0_1.5px_var(--line)]" style={{ padding: '6px 6px 6px 14px' }}>
            <label htmlFor="invite-link" className="sr-only">
              Your invite link
            </label>
            <input
              id="invite-link"
              readOnly
              value={link}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 min-w-0 bg-transparent border-none outline-none font-mono text-[16px] text-ink truncate"
            />
            <button
              type="button"
              onClick={() => void copy()}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-[12px] bg-accent-wash text-accent-ink font-extrabold text-[14px]"
              style={{ minHeight: 44, padding: '0 14px' }}
            >
              <Icon name={copied ? 'check' : 'clipboard'} size={16} stroke={2.4} />
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <span role="status" className="sr-only">
            {copied ? 'Link copied' : ''}
          </span>

          <Btn full size="lg" icon="share" onClick={() => void share()}>
            Share invite
          </Btn>

          {joined != null && (
            <div className="flex items-center gap-2.5 rounded-[14px] bg-surface" style={{ padding: '12px 14px' }}>
              <span className="grid place-items-center bg-accent-wash shrink-0" style={{ width: 34, height: 34, borderRadius: 10 }}>
                <Icon name="users" size={17} color="var(--accent-ink)" stroke={2.1} />
              </span>
              <span className="text-[14px] leading-snug">
                {joined === 0 ? (
                  'No one has joined with your link yet'
                ) : (
                  <>
                    <b>
                      {joined} {joined === 1 ? 'friend' : 'friends'}
                    </b>{' '}
                    joined with your link
                  </>
                )}
              </span>
            </div>
          )}

          <p className="m-0 text-[12.5px] leading-relaxed text-ink-soft">
            People who open your link see the name above. You only see how many joined, never their names or emails.
          </p>
        </div>
      )}
    </Sheet>
  );
}
