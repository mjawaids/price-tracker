import React, { useEffect, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { Icon, Btn, IconName, Sheet } from '../ui';
import { Field, TextIn } from './manageParts';
import { currencyChipLabel } from './sheets';

type ProfileSheet = 'edit' | 'notifications' | 'privacy' | null;

function SettingRow({
  icon,
  label,
  value,
  onClick,
  accent,
  last,
}: {
  icon: IconName;
  label: string;
  value?: string;
  onClick?: () => void;
  accent?: boolean;
  last?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="w-full flex items-center gap-3 text-left disabled:cursor-default"
      style={{ padding: '15px 16px', borderBottom: last ? 'none' : '1px solid var(--line)' }}
    >
      <span
        className="grid place-items-center shrink-0"
        style={{
          width: 38,
          height: 38,
          borderRadius: 11,
          background: accent ? 'var(--accent-wash)' : 'var(--paper)',
          boxShadow: accent ? 'none' : 'inset 0 0 0 1px var(--line)',
        }}
      >
        <Icon name={icon} size={19} color={accent ? 'var(--accent-ink)' : 'var(--ink-soft)'} stroke={2} />
      </span>
      <span className="flex-1 font-semibold text-[15px]">{label}</span>
      {value != null && <span className="text-sm text-ink-faint font-mono">{value}</span>}
      {onClick && <Icon name="chevR" size={17} color="var(--ink-faint)" />}
    </button>
  );
}

function Group({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="mt-[18px]">
      {title && <div className="font-mono text-[11px] tracking-[0.12em] text-ink-faint uppercase px-1 pb-2">{title}</div>}
      <div className="bg-surface rounded-[18px] shadow-card overflow-hidden">{children}</div>
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="relative shrink-0 transition-colors"
      style={{
        width: 46,
        height: 28,
        borderRadius: 999,
        background: on ? 'var(--accent)' : 'var(--line)',
      }}
    >
      <span
        className="absolute bg-paper transition-all"
        style={{ width: 22, height: 22, borderRadius: 999, top: 3, left: on ? 21 : 3 }}
      />
    </button>
  );
}

function EditProfileSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const app = useApp();
  const { updateProfile } = useAuth();
  const [name, setName] = useState(app.user.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setName(app.user.name);
      setError('');
    }
  }, [open, app.user.name]);

  const save = async () => {
    const next = name.trim();
    if (!next) {
      setError('Please enter your name.');
      return;
    }
    setSaving(true);
    setError('');
    const { error } = await updateProfile({ full_name: next });
    setSaving(false);
    if (error) {
      setError(error.message || 'Could not save changes.');
      return;
    }
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Edit profile">
      <Field label="Full name">
        <TextIn value={name} autoFocus onChange={(e) => setName(e.target.value)} placeholder="Your name" />
      </Field>
      <Field label="Email" hint="Your email can’t be changed here.">
        <TextIn value={app.user.email} disabled className="opacity-60" />
      </Field>
      {error && <div className="text-[12.5px] -mt-2 mb-3" style={{ color: 'oklch(0.55 0.16 25)' }}>{error}</div>}
      <Btn full onClick={save} disabled={saving}>
        {saving ? 'Saving…' : 'Save changes'}
      </Btn>
    </Sheet>
  );
}

function NotificationsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, updateSettings } = useSettings();

  const Row = ({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) => (
    <div className="flex items-center gap-3" style={{ padding: '14px 0' }}>
      <div className="flex-1">
        <div className="font-semibold text-[15px]">{label}</div>
        <div className="text-[12.5px] text-ink-faint leading-snug mt-0.5">{desc}</div>
      </div>
      <Toggle on={value} onChange={onChange} />
    </div>
  );

  return (
    <Sheet open={open} onClose={onClose} title="Notifications">
      <div className="text-[13px] text-ink-faint -mt-1 mb-2">Choose what SpendLess can notify you about.</div>
      <div className="divide-y divide-line">
        <Row
          label="Push notifications"
          desc="Price drops and deals on products you track."
          value={settings.notifications}
          onChange={(v) => updateSettings({ notifications: v })}
        />
      </div>
      <Btn full onClick={onClose} className="mt-4">
        Done
      </Btn>
    </Sheet>
  );
}

function PrivacySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { updatePassword } = useAuth();
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (open) {
      setPw('');
      setConfirm('');
      setError('');
      setDone(false);
    }
  }, [open]);

  const save = async () => {
    if (pw.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (pw !== confirm) {
      setError('Passwords don’t match.');
      return;
    }
    setSaving(true);
    setError('');
    const { error } = await updatePassword(pw);
    setSaving(false);
    if (error) {
      setError(error.message || 'Could not update password.');
      return;
    }
    setDone(true);
    setPw('');
    setConfirm('');
  };

  return (
    <Sheet open={open} onClose={onClose} title="Privacy & security">
      <div className="text-[13px] text-ink-faint -mt-1 mb-3">Update the password you use to sign in.</div>
      <Field label="New password">
        <TextIn type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 6 characters" />
      </Field>
      <Field label="Confirm new password">
        <TextIn type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter password" />
      </Field>
      {error && <div className="text-[12.5px] -mt-2 mb-3" style={{ color: 'oklch(0.55 0.16 25)' }}>{error}</div>}
      {done && <div className="text-[12.5px] -mt-2 mb-3" style={{ color: 'var(--accent-ink)' }}>Password updated.</div>}
      <Btn full onClick={save} disabled={saving}>
        {saving ? 'Updating…' : 'Update password'}
      </Btn>
    </Sheet>
  );
}

export default function ProfileScreen() {
  const app = useApp();
  const { settings } = useSettings();
  const { compact } = useBreakpoint();
  const onboarding = useOnboarding();
  const big = !compact;
  const u = app.user;
  const initials = u.name.split(' ').map((p) => p[0]).slice(0, 2).join('');
  const [sheet, setSheet] = useState<ProfileSheet>(null);

  return (
    <div style={{ paddingBottom: big ? 0 : 24 }}>
      {!big && (
        <div className="sticky top-0 z-20 bg-paper flex items-center gap-3 border-b border-line" style={{ padding: '14px 16px' }}>
          <button
            type="button"
            onClick={() => (app.canGoBack ? app.back() : app.tab('browse'))}
            className="grid place-items-center rounded-full bg-surface shadow-[inset_0_0_0_1px_var(--line)]"
            style={{ width: 40, height: 40 }}
          >
            <Icon name="back" size={19} stroke={2.2} />
          </button>
          <h2 className="m-0 font-display font-extrabold text-[19px] tracking-[-0.02em]">Profile</h2>
        </div>
      )}

      <div className="w-full mx-auto box-border" style={{ maxWidth: big ? 720 : '100%', padding: big ? '8px 28px 40px' : '18px 18px 0' }}>
        <div className="flex items-center gap-4 mt-1.5 mb-1">
          <div
            className="grid place-items-center bg-accent text-accent-on font-display font-extrabold shrink-0 rounded-full"
            style={{ width: big ? 76 : 64, height: big ? 76 : 64, fontSize: big ? 30 : 26 }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <h1 className="m-0 font-display font-extrabold tracking-[-0.02em]" style={{ fontSize: big ? 30 : 25 }}>
              {u.name}
            </h1>
            <div className="text-ink-faint text-sm">{u.email}</div>
          </div>
        </div>

        <Group title="Preferences">
          <SettingRow icon="coin" label="Currency" accent value={currencyChipLabel(app.currencyCode)} onClick={() => app.openSheet('currency')} />
          <SettingRow icon="pin" label="Location" accent value={app.location ? app.location.split(',')[0] : 'Set'} onClick={() => app.openSheet('location')} last />
        </Group>

        <Group title="Account">
          <SettingRow icon="user" label="Edit profile" onClick={() => setSheet('edit')} />
          <SettingRow icon="bell" label="Notifications" value={settings.notifications ? 'On' : 'Off'} onClick={() => setSheet('notifications')} />
          <SettingRow icon="lock" label="Privacy & security" onClick={() => setSheet('privacy')} last />
        </Group>

        <Group title="Catalogue">
          <div className="flex gap-2.5 items-start" style={{ padding: '14px 16px' }}>
            <span className="grid place-items-center bg-paper shrink-0 shadow-[inset_0_0_0_1px_var(--line)]" style={{ width: 38, height: 38, borderRadius: 11 }}>
              <Icon name="globe" size={19} color="var(--ink-soft)" stroke={2} />
            </span>
            <div className="flex-1">
              <div className="font-semibold text-[15px]">Shared catalogue</div>
              <div className="text-[13px] text-ink-faint leading-snug mt-0.5">
                Products, stores &amp; prices are shared across everyone. Your cart and shopping lists stay private to you.
              </div>
            </div>
          </div>
        </Group>

        <Group title="Help">
          <SettingRow icon="spark" label="App walkthrough" value="Replay" onClick={onboarding.start} last />
        </Group>

        <div className="mt-[18px]">
          <Btn full variant="ghost" icon="logout" onClick={app.signOut} style={{ color: 'oklch(0.55 0.16 25)' }}>
            Sign out
          </Btn>
        </div>
        <div className="text-center mt-[18px] font-mono text-[11px] text-ink-faint">SpendLess · v1.0.0</div>
        <div className="text-center mt-[6px] font-mono text-[11px] text-ink-faint">
          Made with ❤️ by{' '}
          <a
            href="https://jawaid.dev/?utm_source=spendless&utm_medium=referral&utm_campaign=app_footer"
            target="_blank"
            rel="noopener"
            className="text-accent hover:underline"
          >
            Jawaid
          </a>{' '}
          · Powered by 🚀{' '}
          <a
            href="https://ibexoft.com/?utm_source=spendless&utm_medium=referral&utm_campaign=app_footer"
            target="_blank"
            rel="noopener"
            className="text-accent hover:underline"
          >
            Ibexoft
          </a>
        </div>
      </div>

      <EditProfileSheet open={sheet === 'edit'} onClose={() => setSheet(null)} />
      <NotificationsSheet open={sheet === 'notifications'} onClose={() => setSheet(null)} />
      <PrivacySheet open={sheet === 'privacy'} onClose={() => setSheet(null)} />
    </div>
  );
}
