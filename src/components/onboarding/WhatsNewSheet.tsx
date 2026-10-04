import { useEffect, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { useCompare, CART_LIST_NAME } from '../../contexts/CompareContext';
import { useLists } from '../../contexts/ListsContext';
import { useSettings } from '../../contexts/SettingsContext';
import { Btn, Icon, IconName, Sheet } from '../ui';

const seenKey = (uid: string) => `spendless-whatsnew:${uid}`;

function seen(uid: string): boolean {
  try {
    return localStorage.getItem(seenKey(uid)) === '1';
  } catch {
    return true; // no storage: don't risk showing it on every open
  }
}

function markSeen(uid: string) {
  try {
    localStorage.setItem(seenKey(uid), '1');
  } catch {
    /* ignore */
  }
}

function Card({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3 bg-surface rounded-[18px] shadow-[inset_0_0_0_1.5px_var(--line)]" style={{ padding: 14 }}>
      <span className="grid place-items-center rounded-[12px] bg-accent-wash text-accent-ink shrink-0" style={{ width: 38, height: 38 }}>
        <Icon name={icon} size={19} stroke={2.2} />
      </span>
      <span className="min-w-0">
        <span className="block font-bold text-[15px]">{title}</span>
        <span className="block text-[13.5px] leading-relaxed text-ink-soft mt-0.5">{body}</span>
      </span>
    </div>
  );
}

/**
 * Once per user, for people who used SpendLess before Where to buy: what changed
 * and where their old Compare cart went. New users learn from the app itself.
 */
export function WhatsNewSheet() {
  const app = useApp();
  const { user } = useAuth();
  const lists = useLists();
  const compare = useCompare();
  const { settings } = useSettings();
  const [open, setOpen] = useState(false);
  const uid = user?.id ?? null;

  const hadActivity =
    lists.hasHistory || lists.lists.some((l) => (lists.todoCountByList[l.id] || 0) > 0) || compare.products.some((p) => p.ownerId) || !!compare.convertedCart;

  useEffect(() => {
    if (!uid || open || !lists.ready || !compare.ready || !settings.features.whereToBuy) return;
    if (seen(uid)) return;
    if (!hadActivity) {
      // Started after this release: nothing to catch up on.
      markSeen(uid);
      return;
    }
    // Let the app settle (and any update toast show) before asking for attention.
    const t = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(t);
  }, [uid, open, lists.ready, compare.ready, settings.features.whereToBuy, hadActivity]);

  if (!uid || !open) return null;

  const close = () => {
    markSeen(uid);
    setOpen(false);
  };
  const active = lists.activeList;
  const canShow = !!active && (lists.todoCountByList[active.id] || 0) > 0;
  const cart = compare.convertedCart;

  return (
    <Sheet
      open
      onClose={close}
      title="New: Where to buy"
      footer={
        <div className="flex gap-2.5">
          <Btn variant="ghost" onClick={close}>
            Later
          </Btn>
          <Btn
            full
            size="lg"
            className="flex-1"
            icon="arrowR"
            onClick={() => {
              close();
              if (canShow) app.go('plan', { listId: active!.id });
              else app.tab('lists');
            }}
          >
            {canShow ? 'Show me' : 'Go to my lists'}
          </Btn>
        </div>
      }
    >
      <div className="flex flex-col gap-2.5">
        <Card icon="tag" title="The cheapest stores for your list" body="Tap Where to buy on any list. We find the stores that make it cheapest — delivery included — and split your list by store." />
        <Card
          icon="store"
          title="Compare, rebuilt"
          body="Prices, Stores and Contribute replace Browse, Cart and Catalogue. Your stores, products and prices came with you, and stay private."
        />
        {cart && (
          <Card
            icon="lists"
            title="Your cart is now a list"
            body={`The ${cart.count} ${cart.count === 1 ? 'item' : 'items'} in your Compare cart are in a new list, “${CART_LIST_NAME}”.`}
          />
        )}
        <Card icon="sliders" title="Only if you want it" body="Turn Where to buy off any time in Profile → Shopping features, and your lists look just as before." />
      </div>
    </Sheet>
  );
}
