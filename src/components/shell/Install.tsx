import { ReactNode, useState } from 'react';
import { Btn, Icon, IconName, Sheet } from '../ui';
import { bannerSnoozed, InstallPlatform, promptInstall, snoozeBanner, useInstall } from '../../lib/install';

const BENEFITS: [IconName, string][] = [
  ['smartphone', 'Opens from your home screen, full screen'],
  ['wifiOff', 'Your lists work offline'],
  ['download', 'Free and tiny — no app store needed'],
];

function Kbd({ children }: { children: ReactNode }) {
  return <span className="font-bold text-ink">{children}</span>;
}

/** The browser's own install steps, for when we can't open its dialog for the user. */
function steps(platform: InstallPlatform): ReactNode[] {
  switch (platform) {
    case 'ios':
      return [
        <>
          Tap <Kbd>Share</Kbd> <Icon name="share" size={15} stroke={2.2} className="inline -mt-0.5" /> in the browser toolbar
          (in Safari it may be under the <Kbd>⋯</Kbd> button).
        </>,
        <>
          Scroll down and tap <Kbd>Add to Home Screen</Kbd> <Icon name="plusSquare" size={15} stroke={2.2} className="inline -mt-0.5" />.
        </>,
        <>
          Tap <Kbd>Add</Kbd>. SpendLess appears on your home screen.
        </>,
      ];
    case 'mac-safari':
      return [
        <>
          In the menu bar, choose <Kbd>File → Add to Dock</Kbd>.
        </>,
        <>
          Click <Kbd>Add</Kbd>. SpendLess opens from the Dock like any other app.
        </>,
      ];
    case 'android':
      return [
        <>
          Open the browser menu <Icon name="moreV" size={15} stroke={2.2} className="inline -mt-0.5" />.
        </>,
        <>
          Tap <Kbd>Install app</Kbd> or <Kbd>Add to Home screen</Kbd>.
        </>,
        <>
          Confirm. SpendLess appears with your other apps.
        </>,
      ];
    case 'desktop':
      return [
        <>
          Click the install icon <Icon name="monitorDown" size={15} stroke={2.2} className="inline -mt-0.5" /> at the right of the
          address bar — or open the browser menu and choose <Kbd>Install SpendLess</Kbd> (Chrome: under{' '}
          <Kbd>Cast, save and share</Kbd>; Edge: under <Kbd>Apps</Kbd>).
        </>,
        <>
          Click <Kbd>Install</Kbd>. SpendLess opens in its own window.
        </>,
      ];
    default:
      return [
        <>
          Look for <Kbd>Install</Kbd> or <Kbd>Add to Home screen</Kbd> in your browser’s menu.
        </>,
        <>
          No such option? Open <Kbd>{window.location.host}</Kbd> in Chrome, Edge or Safari and install it from there.
        </>,
      ];
  }
}

/** Explains installing and either opens the browser's dialog or shows the steps. */
export function InstallSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const install = useInstall();
  const [result, setResult] = useState<'accepted' | 'dismissed' | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    const outcome = await promptInstall();
    setBusy(false);
    setResult(outcome === 'unavailable' ? null : outcome);
  };

  const close = () => {
    setResult(null);
    onClose();
  };

  let body: ReactNode;
  if (install.standalone) {
    body = <Notice icon="checkCircle">You’re using the installed app. Nothing else to do.</Notice>;
  } else if (result === 'accepted') {
    body = (
      <>
        <Notice icon="checkCircle">Installed! Open SpendLess from your home screen or app list.</Notice>
        <Btn full size="lg" onClick={close} className="mt-4">
          Done
        </Btn>
      </>
    );
  } else if (install.canPrompt) {
    body = (
      <>
        {result === 'dismissed' && (
          <p className="m-0 mb-3 text-[13.5px] text-ink-soft">No problem — you can install it any time from here.</p>
        )}
        <Btn full size="lg" icon="download" onClick={run} disabled={busy}>
          {busy ? 'Opening…' : 'Install SpendLess'}
        </Btn>
      </>
    );
  } else {
    body = (
      <>
        {install.installed && (
          <p className="m-0 mb-3 text-[13.5px] leading-relaxed text-ink-soft">
            Already installed on this device? Open SpendLess from your home screen or app list. Removed it? Add it again:
          </p>
        )}
        <ol className="m-0 p-0 list-none flex flex-col gap-2.5">
          {steps(install.platform).map((s, i) => (
            <li key={i} className="flex gap-3 items-start bg-surface rounded-[14px] shadow-[inset_0_0_0_1px_var(--line)]" style={{ padding: '12px 14px' }}>
              <span
                aria-hidden
                className="grid place-items-center shrink-0 bg-accent-wash text-accent-ink font-mono font-bold text-[13px] rounded-full"
                style={{ width: 26, height: 26 }}
              >
                {i + 1}
              </span>
              <span className="flex-1 text-[14.5px] leading-relaxed text-ink-soft">{s}</span>
            </li>
          ))}
        </ol>
        {install.platform === 'ios' && (
          <p className="m-0 mt-3 text-[12.5px] text-ink-faint leading-relaxed">
            On iOS versions before 16.4, only Safari can add apps to the home screen.
          </p>
        )}
        <Btn full variant="ghost" onClick={close} className="mt-4">
          Got it
        </Btn>
      </>
    );
  }

  return (
    <Sheet open={open} onClose={close} title="Install SpendLess">
      <div className="flex items-center gap-3.5 mb-4">
        <img src="/pwa-192x192.png" alt="" width={56} height={56} className="shrink-0 rounded-[14px] shadow-card" />
        <p className="m-0 text-[14.5px] leading-relaxed text-ink-soft">
          Get SpendLess on your phone or computer — it opens like any other app.
        </p>
      </div>
      <ul className="m-0 mb-5 p-0 list-none flex flex-col gap-2">
        {BENEFITS.map(([ic, t]) => (
          <li key={t} className="flex items-center gap-2.5 text-[14px] font-semibold">
            <Icon name={ic} size={17} color="var(--accent-ink)" stroke={2.2} className="shrink-0" />
            {t}
          </li>
        ))}
      </ul>
      {body}
    </Sheet>
  );
}

function Notice({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <div role="status" className="flex items-center gap-2.5 rounded-[14px] bg-accent-wash text-accent-ink text-[14px] font-semibold" style={{ padding: '12px 14px' }}>
      <Icon name={icon} size={18} stroke={2.2} className="shrink-0" />
      {children}
    </div>
  );
}

/** "Install the app" button + sheet. Hidden inside the installed app. */
export function InstallButton({ className = '' }: { className?: string }) {
  const install = useInstall();
  const [open, setOpen] = useState(false);
  if (install.standalone) return null;
  return (
    <>
      <Btn variant="ghost" icon="download" onClick={() => setOpen(true)} className={className} style={{ minHeight: 48 }}>
        {install.installed && !install.canPrompt ? 'Install the app again' : 'Install the app'}
      </Btn>
      <InstallSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/**
 * Slim, dismissible strip suggesting the install. Shown only where installing
 * takes a tap or two (Chromium with an install offer, iPhone/iPad), only while
 * not installed, and at most every couple of weeks after "Not now".
 */
export function InstallBanner() {
  const install = useInstall();
  const [hidden, setHidden] = useState(bannerSnoozed);
  const [open, setOpen] = useState(false);

  const eligible = !install.standalone && !install.installed && (install.canPrompt || install.platform === 'ios');
  if (!eligible && !open) return null;

  const go = async () => {
    if (!install.canPrompt) {
      setOpen(true);
      return;
    }
    const outcome = await promptInstall();
    // Not installed after all → show the sheet, which explains the other way in.
    if (outcome === 'unavailable') setOpen(true);
    else if (outcome === 'dismissed') {
      snoozeBanner();
      setHidden(true);
    }
  };

  const notNow = () => {
    snoozeBanner();
    setHidden(true);
  };

  return (
    <>
      {eligible && !hidden && (
        <div role="region" aria-label="Install SpendLess" className="shrink-0 flex items-center gap-3 bg-accent-wash text-accent-ink animate-sl-fade" style={{ padding: '6px 6px 6px 16px' }}>
          <Icon name="download" size={18} stroke={2.4} className="shrink-0" />
          <span className="flex-1 text-[13.5px] font-semibold leading-snug">Install SpendLess for one-tap access — lists work offline.</span>
          <button type="button" onClick={go} className="shrink-0 bg-accent text-accent-on font-extrabold text-[14px] rounded-[12px]" style={{ minHeight: 44, padding: '0 16px' }}>
            Install
          </button>
          <button type="button" onClick={notNow} aria-label="Not now" className="shrink-0 grid place-items-center rounded-[12px] bg-transparent" style={{ width: 44, height: 44 }}>
            <Icon name="x" size={16} stroke={2.4} />
          </button>
        </div>
      )}
      <InstallSheet
        open={open}
        onClose={() => {
          // They've seen the steps — don't keep nagging.
          setOpen(false);
          notNow();
        }}
      />
    </>
  );
}
