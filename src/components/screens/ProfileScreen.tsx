import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { Icon, Btn, IconName } from '../ui';
import { currencyChipLabel } from './sheets';

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

export default function ProfileScreen() {
  const app = useApp();
  const { compact } = useBreakpoint();
  const big = !compact;
  const u = app.user;
  const initials = u.name.split(' ').map((p) => p[0]).slice(0, 2).join('');

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
          <SettingRow icon="user" label="Edit profile" onClick={() => {}} />
          <SettingRow icon="bell" label="Notifications" value="On" onClick={() => {}} />
          <SettingRow icon="lock" label="Privacy & security" onClick={() => {}} last />
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

        <div className="mt-[18px]">
          <Btn full variant="ghost" icon="logout" onClick={app.signOut} style={{ color: 'oklch(0.55 0.16 25)' }}>
            Sign out
          </Btn>
        </div>
        <div className="text-center mt-[18px] font-mono text-[11px] text-ink-faint">SpendLess · v1.0.0</div>
      </div>
    </div>
  );
}
