// Still-to-buy reminders: the Profile → Notifications sheet and the one card on Lists
// that offers them (design: claude.ai/artifact/9bYh5xvp6mBNLSzKVPWy46). State and
// saving: src/lib/push.ts; the sender: scripts/push/reminders.ts.
import { ReactNode, useEffect, useState } from 'react';
import { setReminders, startPush, usePush } from '../../lib/push';
import { pushProblem, track } from './pushHelpers';
import { Btn, Icon, Sheet, ToggleTrack } from '../ui';
import { InstallSteps } from '../shell/Install';

const RULE = 'Once, when items sit on a list for 2 days. Only 10 am – 8 pm your time.';

function Note({ tone = 'plain', children }: { tone?: 'plain' | 'warn'; children: ReactNode }) {
  return (
    <div
      className={`rounded-[14px] text-[13.5px] leading-relaxed ${tone === 'warn' ? 'bg-warn-wash text-warn-ink' : 'bg-surface text-ink-soft'}`}
      style={{ padding: '12px 14px' }}
    >
      {children}
    </div>
  );
}

function BellTile({ muted }: { muted?: boolean }) {
  return (
    <span className={`grid place-items-center shrink-0 ${muted ? 'bg-paper shadow-[inset_0_0_0_1px_var(--line)]' : 'bg-accent-wash'}`} style={{ width: 38, height: 38, borderRadius: 11 }}>
      <Icon name="bell" size={19} color={muted ? 'var(--ink-soft)' : 'var(--accent-ink)'} stroke={2} />
    </span>
  );
}

/** Profile → Notifications. */
export function NotificationsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const push = usePush();
  const [problem, setProblem] = useState<string | null>(null);
  useEffect(() => {
    if (open) setProblem(null);
  }, [open]);

  const onHere = push.enabled && push.pushState === 'granted-on';
  const toggle = async () => {
    setProblem(null);
    const turnOn = !onHere;
    const r = await setReminders(turnOn);
    if (turnOn && r === 'granted-on') track('push_enabled', { from: 'profile' });
    else if (!turnOn && r !== 'failed') track('push_disabled');
    setProblem(turnOn ? pushProblem(r) : r === 'failed' ? pushProblem(r) : null);
  };

  let body: ReactNode;
  if (push.status === 'loading' || push.status === 'idle') {
    body = <div aria-busy="true" aria-label="Loading your reminder setting" className="rounded-[18px] bg-surface animate-pulse" style={{ height: 76 }} />;
  } else if (push.status === 'failed') {
    body = (
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-2.5 rounded-[14px] bg-surface shadow-[inset_0_0_0_1.5px_var(--line)] text-[14px] leading-snug" style={{ padding: 14 }}>
          <Icon name="wifiOff" size={18} color="var(--ink-soft)" stroke={2.1} />
          <span>Your reminder setting needs a connection. Connect to the internet and try again.</span>
        </div>
        <Btn full variant="ghost" onClick={() => void startPush()}>
          Try again
        </Btn>
      </div>
    );
  } else if (push.pushState === 'unsupported') {
    body = (
      <div className="flex flex-col gap-3.5">
        <div className="flex items-center gap-3 rounded-[18px] bg-surface shadow-card" style={{ padding: '14px 16px' }}>
          <BellTile muted />
          <span className="flex-1 min-w-0">
            <span className="block font-bold text-[15.5px]">Still-to-buy reminders</span>
            <span className="block text-[13px] text-ink-soft leading-snug mt-0.5">
              {push.iosNeedsInstall ? 'On iPhone and iPad, reminders need the app on your Home Screen.' : 'This browser can’t show notifications. Try the installed app, or Chrome, Edge or Firefox.'}
            </span>
          </span>
        </div>
        {push.iosNeedsInstall && (
          <>
            <InstallSteps platform="ios" />
            <p className="m-0 text-[14px] leading-relaxed text-ink-soft">Then open SpendLess from your Home Screen and turn reminders on here.</p>
          </>
        )}
      </div>
    );
  } else {
    body = (
      <div className="flex flex-col gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={onHere}
          aria-busy={push.busy}
          disabled={push.busy}
          onClick={() => void toggle()}
          className="w-full flex items-center gap-3 text-left rounded-[18px] bg-surface shadow-card disabled:opacity-70"
          style={{ padding: '14px 16px' }}
        >
          <BellTile />
          <span className="flex-1 min-w-0">
            <span className="block font-bold text-[15.5px]">Still-to-buy reminders</span>
            <span className="block text-[13px] text-ink-soft leading-snug mt-0.5">{push.busy ? 'Just a moment…' : RULE}</span>
          </span>
          <ToggleTrack on={onHere} />
        </button>
        {push.pushState === 'denied' && !problem && <Note tone="warn">{pushProblem('denied')}</Note>}
        {push.pushState === 'blocked' && !problem && <Note tone="warn">{pushProblem('blocked')}</Note>}
        {problem && <Note tone="warn">{problem}</Note>}
        {onHere && <Note>On for this device. Each phone or computer you use asks once.</Note>}
        {push.enabled && !onHere && push.pushState !== 'denied' && push.pushState !== 'blocked' && (
          <Note>On for your other devices. Turn it on to get them here too.</Note>
        )}
      </div>
    );
  }

  return (
    <Sheet open={open} onClose={onClose} title="Notifications">
      <div className="flex flex-col gap-3.5">
        {body}
        <span role="status" className="sr-only">
          {problem ?? ''}
        </span>
        <p className="m-0 text-[12.5px] leading-relaxed text-ink-soft">
          Reminders say how many things are left — never what they are or which list. Sent by OneSignal for SpendLess.
        </p>
      </div>
    </Sheet>
  );
}

// ── The card on Lists (when to show it: usePushPrompt in pushHelpers.ts) ─────
/** "Want a nudge when things sit unbought?" — Remind me / Not now / ✕. */
export function PushPrompt({
  alsoHere,
  busy,
  onDone,
  onDismiss,
}: {
  alsoHere: boolean;
  busy: boolean;
  /** The outcome's message for the Lists toast. */
  onDone: (message: string) => void;
  onDismiss: (never: boolean) => void;
}) {
  const remind = async () => {
    const r = await setReminders(true);
    if (r === 'granted-on') {
      track('push_enabled', { from: 'lists' });
      onDone('Reminders on. Turn them off any time in Profile.');
      return;
    }
    // Closed the browser's question without answering: ask again another day.
    if (r === 'default' || r === 'granted-off') onDismiss(false);
    onDone(pushProblem(r) ?? 'Reminders aren’t on.');
  };
  return (
    <section aria-labelledby="push-prompt-title" className="flex flex-col gap-2.5 rounded-[18px] bg-surface shadow-[inset_0_0_0_1.5px_var(--line)]" style={{ padding: 14 }}>
      <div className="flex gap-3">
        <span className="grid place-items-center shrink-0 bg-accent-wash" style={{ width: 40, height: 40, borderRadius: 12 }}>
          <Icon name="bell" size={20} color="var(--accent-ink)" stroke={2} />
        </span>
        <div className="flex-1 min-w-0">
          <h2 id="push-prompt-title" className="m-0 font-extrabold text-[15.5px] leading-snug">
            {alsoHere ? 'Get your reminders on this device too?' : 'Want a nudge when things sit unbought?'}
          </h2>
          <p className="m-0 mt-1 text-[13.5px] leading-relaxed text-ink-soft">
            If items wait on a list for 2 days, we’ll remind you once — between 10 am and 8 pm. Turn it off any time in Profile.
          </p>
        </div>
        <button
          type="button"
          aria-label="Don’t offer reminders again"
          onClick={() => onDismiss(true)}
          className="grid place-items-center shrink-0 rounded-full"
          style={{ width: 44, height: 44, margin: '-8px -8px 0 0' }}
        >
          <Icon name="x" size={16} color="var(--ink-soft)" stroke={2.2} />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5" style={{ paddingLeft: 52 }}>
        <Btn size="sm" icon="bell" onClick={() => void remind()} disabled={busy} style={{ minHeight: 44 }}>
          {busy ? 'Asking…' : 'Remind me'}
        </Btn>
        <button type="button" onClick={() => onDismiss(false)} className="rounded-btn font-bold text-[14px] text-ink-soft" style={{ minHeight: 44, padding: '0 14px' }}>
          Not now
        </button>
      </div>
    </section>
  );
}
