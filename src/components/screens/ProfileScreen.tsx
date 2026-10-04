import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useLists } from '../../contexts/ListsContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { Icon, Btn, IconName, Sheet } from '../ui';
import { Field, TextIn } from './manageParts';
import { currencyChipLabel } from './sheets';
import { versionLabel } from '../../lib/version';
import { AVATARS_BUCKET, storagePathFromUrl } from '../../lib/storage';
import { supportUrl } from '../../lib/links';
import { useInstall } from '../../lib/install';
import { InstallSheet } from '../shell/Install';

type ProfileSheet = 'edit' | 'notifications' | 'privacy' | 'install' | null;

function SettingRow({
  icon,
  label,
  value,
  onClick,
  href,
  accent,
  last,
}: {
  icon: IconName;
  label: string;
  value?: string;
  onClick?: () => void;
  /** External link (opens in a new tab) instead of an in-app action. */
  href?: string;
  accent?: boolean;
  last?: boolean;
}) {
  const style = { padding: '15px 16px', borderBottom: last ? 'none' : '1px solid var(--line)' };
  const body = (
    <>
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
      {(onClick || href) && <Icon name="chevR" size={17} color="var(--ink-faint)" />}
    </>
  );
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener" className="w-full flex items-center gap-3 text-left text-ink no-underline" style={style}>
        {body}
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="w-full flex items-center gap-3 text-left disabled:cursor-default"
      style={style}
    >
      {body}
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
  const { updateProfile, uploadAvatar, removeAvatar } = useAuth();
  const [name, setName] = useState(app.user.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  // A stored avatar lives in our avatars bucket; a Google photo does not.
  // Only stored/uploaded avatars can be meaningfully removed (a Google photo
  // would simply reappear as the fallback).
  const isStoredAvatar = !!storagePathFromUrl(app.user.avatarUrl, AVATARS_BUCKET);
  const showRemove = !!avatarPreview && (!!avatarFile || isStoredAvatar);

  const clearObjectUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  useEffect(() => {
    if (open) {
      setName(app.user.name);
      setError('');
      clearObjectUrl();
      setAvatarFile(null);
      setAvatarPreview(app.user.avatarUrl ?? null);
      setIsRemoving(false);
    }
  }, [open, app.user.name, app.user.avatarUrl]);

  // Revoke any preview object URL when the sheet unmounts.
  useEffect(() => () => clearObjectUrl(), []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    clearObjectUrl();
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setAvatarFile(file);
    setAvatarPreview(url);
    setIsRemoving(false);
  };

  const handleRemoveAvatar = () => {
    clearObjectUrl();
    setAvatarFile(null);
    setAvatarPreview(null);
    setIsRemoving(true);
  };

  const initials = app.user.name.split(' ').map((p) => p[0]).slice(0, 2).join('');

  const save = async () => {
    const next = name.trim();
    if (!next) {
      setError('Please enter your name.');
      return;
    }
    setSaving(true);
    setError('');

    // Name change first.
    if (next !== app.user.name) {
      const { error: nameError } = await updateProfile({ full_name: next });
      if (nameError) {
        setSaving(false);
        setError(nameError.message || 'Could not save changes.');
        return;
      }
    }

    // Avatar change.
    if (avatarFile) {
      const { error: avatarError } = await uploadAvatar(avatarFile);
      if (avatarError) {
        setSaving(false);
        setError(avatarError.message || 'Could not upload photo.');
        return;
      }
    } else if (isRemoving) {
      const { error: removeError } = await removeAvatar();
      if (removeError) {
        setSaving(false);
        setError(removeError.message || 'Could not remove photo.');
        return;
      }
    }

    setSaving(false);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Edit profile">
      {/* Avatar picker */}
      <div className="flex items-end gap-4 mb-5">
        <div className="relative shrink-0" style={{ width: 80, height: 80 }}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-full overflow-hidden grid place-items-center"
            style={{
              borderRadius: 999,
              background: avatarPreview ? 'transparent' : 'var(--accent)',
              boxShadow: 'inset 0 0 0 1.5px var(--line)',
            }}
            aria-label="Choose profile photo"
          >
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Avatar preview"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <span className="text-accent-on font-display font-extrabold" style={{ fontSize: 30 }}>
                {initials}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute grid place-items-center bg-ink text-paper rounded-full shadow-md"
            style={{ width: 26, height: 26, bottom: -2, right: -2 }}
            aria-label="Change photo"
          >
            <Icon name="camera" size={13} stroke={2.2} />
          </button>
        </div>
        {showRemove && (
          <Btn variant="ghost" size="sm" icon="trash" onClick={handleRemoveAvatar}>
            Remove
          </Btn>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <Field label="Full name">
        <TextIn value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
      </Field>
      <Field label="Email" hint="Your email can’t be changed here.">
        <TextIn value={app.user.email} disabled className="opacity-60" />
      </Field>
      {error && <div className="text-[12.5px] -mt-2 mb-3" style={{ color: 'var(--danger)' }}>{error}</div>}
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
      {error && <div className="text-[12.5px] -mt-2 mb-3" style={{ color: 'var(--danger)' }}>{error}</div>}
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
  const lists = useLists();
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const install = useInstall();
  // Signing out wipes this device's copy of the lists, so warn about unsynced edits.
  const signOut = () => (lists.pending > 0 ? setConfirmSignOut(true) : void app.signOut());

  return (
    <div style={{ paddingBottom: big ? 0 : 24 }}>
      {!big && (
        <div className="sticky top-0 z-20 bg-paper flex items-center gap-3 border-b border-line" style={{ padding: '14px 16px' }}>
          {app.canGoBack && (
            <button
              type="button"
              onClick={app.back}
              aria-label="Back"
              className="grid place-items-center rounded-full bg-surface shadow-[inset_0_0_0_1px_var(--line)]"
              style={{ width: 44, height: 44 }}
            >
              <Icon name="back" size={19} stroke={2.2} />
            </button>
          )}
          <h2 className="m-0 font-display font-extrabold text-[19px] tracking-[-0.02em]">Profile</h2>
        </div>
      )}

      <div className="w-full mx-auto box-border" style={{ maxWidth: big ? 720 : '100%', padding: big ? '8px 28px 40px' : '18px 18px 0' }}>
        <div className="flex items-center gap-4 mt-1.5 mb-1">
          <button
            type="button"
            onClick={() => setSheet('edit')}
            className="grid place-items-center bg-accent text-accent-on font-display font-extrabold shrink-0 rounded-full overflow-hidden"
            style={{ width: big ? 76 : 64, height: big ? 76 : 64, fontSize: big ? 30 : 26 }}
            aria-label="Edit profile photo"
          >
            {u.avatarUrl ? (
              <img src={u.avatarUrl} alt={u.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              initials
            )}
          </button>
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

        <Group title="App">
          {install.standalone ? (
            <SettingRow icon="download" label="Installed on this device" value="✓" last />
          ) : (
            <SettingRow
              icon="download"
              label={install.installed && !install.canPrompt ? 'Install the app again' : 'Install the app'}
              accent
              onClick={() => setSheet('install')}
              last
            />
          )}
        </Group>

        <Group title="Help">
          <SettingRow
            icon="bulb"
            label="Tips"
            value={onboarding.tipsOn ? 'On' : 'Off'}
            onClick={() => onboarding.setTipsOn(!onboarding.tipsOn)}
          />
          <SettingRow icon="refresh" label="Show tips again" value="Reset" onClick={onboarding.resetTips} />
          <SettingRow icon="spark" label="Compare walkthrough" value="Replay" onClick={onboarding.start} />
          <SettingRow icon="mail" label="Contact support" href={supportUrl('app_profile')} last />
        </Group>

        <div className="mt-[18px]">
          <Btn full variant="ghost" icon="logout" onClick={signOut} style={{ color: 'var(--danger)' }}>
            Sign out
          </Btn>
          <Sheet open={confirmSignOut} onClose={() => setConfirmSignOut(false)} title="Sign out?">
            <p className="m-0 mb-5 text-[15px] leading-relaxed text-ink-soft">
              {lists.pending} {lists.pending === 1 ? 'change' : 'changes'} to your lists haven’t synced yet. Connect to the internet
              first to keep {lists.pending === 1 ? 'it' : 'them'}, or sign out and lose {lists.pending === 1 ? 'it' : 'them'}.
            </p>
            <div className="flex flex-col gap-2.5">
              <Btn full size="lg" onClick={() => setConfirmSignOut(false)}>
                Stay signed in
              </Btn>
              <Btn full variant="ghost" onClick={() => void app.signOut()} style={{ color: 'var(--danger)' }}>
                Sign out anyway
              </Btn>
            </div>
          </Sheet>
        </div>
        <div className="text-center mt-[18px] font-mono text-[11px] text-ink-faint">SpendLess · {versionLabel()}</div>
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
      <InstallSheet open={sheet === 'install'} onClose={() => setSheet(null)} />
    </div>
  );
}
