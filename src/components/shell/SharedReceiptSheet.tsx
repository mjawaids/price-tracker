// "Share to SpendLess" (design board 11): something shared from another app waits on
// this device (src/lib/receipt/inbox.ts); ask before reading it. Loaded only when
// something was shared.
import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { clearShared, takeShared } from '../../lib/receipt/inbox';
import type { SharedSummary } from '../../lib/receipt/inbox';
import { trackUserAction } from '../../utils/analytics';
import { Btn, Icon, Sheet } from '../ui';

const kindOf = (s: SharedSummary) => (s.images && s.pdfs ? 'mixed' : s.pdfs ? 'pdf' : s.images ? 'image' : 'text');

/** "1 image", "2 images", "a PDF", "some text". */
function what(s: SharedSummary): string {
  const parts: string[] = [];
  if (s.images) parts.push(`${s.images} ${s.images === 1 ? 'image' : 'images'}`);
  if (s.pdfs) parts.push(s.pdfs === 1 ? 'a PDF' : `${s.pdfs} PDFs`);
  if (!parts.length && s.hasText) parts.push('some text');
  return parts.join(' and ');
}

export default function SharedReceiptSheet({ summary }: { summary: SharedSummary }) {
  const app = useApp();
  const { settings, updateSettings } = useSettings();
  const { compact } = useBreakpoint();
  const [busy, setBusy] = useState(false);
  const off = !settings.features.receipts;
  const kind = kindOf(summary);
  const track = (action: 'read' | 'dismissed') => {
    // Counts only: never names, sizes or text.
    if (typeof window.gtag !== 'undefined') trackUserAction('receipt_shared', { files: summary.images + summary.pdfs, kind, action });
  };

  const read = async () => {
    setBusy(true);
    track('read');
    if (off) updateSettings({ features: { ...settings.features, receipts: true } });
    const shared = await takeShared();
    if (shared) {
      const flow = await import('../../lib/receipt/flow');
      flow.readShared(shared.files, shared.text);
    }
    app.go('receipt');
  };
  const later = () => {
    track('dismissed');
    void clearShared();
  };

  return (
    <Sheet
      open
      onClose={later}
      title="Read this receipt?"
      footer={
        <div className="flex flex-col gap-2">
          <Btn full size="lg" onClick={() => void read()} disabled={busy}>
            {off ? 'Turn on and read' : 'Read receipt'}
          </Btn>
          <Btn full variant="ghost" onClick={later} disabled={busy}>
            Not now
          </Btn>
        </div>
      }
    >
      <div className="flex gap-3.5 items-center">
        <span aria-hidden className="grid place-items-center shrink-0 bg-[var(--backdrop)] text-ink-soft" style={{ width: 60, height: 80, borderRadius: 12 }}>
          <Icon name={kind === 'text' ? 'clipboard' : kind === 'pdf' ? 'file' : 'image'} size={24} stroke={2} />
        </span>
        <p className="m-0 text-[15px] leading-snug text-ink-soft">You shared {what(summary)} with SpendLess.</p>
      </div>
      <p className="m-0 mt-4 text-[14px] leading-relaxed text-ink-soft">
        It’s read on your {compact ? 'phone' : 'device'}. Only the prices you confirm are saved.
        {off && ' Receipt import is off — reading this turns it on.'}
      </p>
    </Sheet>
  );
}
