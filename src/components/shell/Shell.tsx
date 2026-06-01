import { useEffect, useRef } from 'react';
import { useApp, ScreenName } from '../../contexts/AppContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { trackPageView } from '../../utils/analytics';
import { Icon, IconName } from '../ui';
import { currencyChipLabel, CurrencySheet, LocationSheet } from '../screens/sheets';

import BrowseScreen from '../screens/BrowseScreen';
import SearchScreen from '../screens/SearchScreen';
import DetailScreen from '../screens/DetailScreen';
import CartScreen from '../screens/CartScreen';
import PlanScreen from '../screens/PlanScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { ManageProducts, ManageStores, ManagePrices } from '../screens/ManageScreens';

const SCREENS: Record<ScreenName, () => JSX.Element> = {
  browse: BrowseScreen,
  search: SearchScreen,
  detail: DetailScreen,
  cart: CartScreen,
  plan: PlanScreen,
  profile: ProfileScreen,
  mproducts: ManageProducts,
  mstores: ManageStores,
  mprices: ManagePrices,
};

const MANAGE_SCREENS: ScreenName[] = ['mproducts', 'mstores', 'mprices'];
const NAV_SCREENS: ScreenName[] = ['browse', 'search', 'cart', 'mproducts', 'mstores', 'mprices'];

interface NavDef {
  id: ScreenName | 'manage' | 'shop';
  icon: IconName;
  label: string;
  badge?: number;
}

function BottomNav({ items, active, onPick }: { items: NavDef[]; active: ScreenName; onPick: (id: NavDef['id']) => void }) {
  return (
    <div className="flex bg-paper border-t border-line shrink-0 safe-bottom" style={{ padding: '6px 6px' }}>
      {items.map((it) => {
        const on = active === it.id;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onPick(it.id)}
            className="flex-1 flex flex-col items-center gap-[3px] bg-transparent"
            style={{ padding: '7px 0 5px', color: on ? 'var(--accent-ink)' : 'var(--ink-faint)' }}
          >
            <div className="relative">
              <Icon name={it.icon} size={24} stroke={on ? 2.5 : 2} />
              {!!it.badge && it.badge > 0 && (
                <span className="absolute -top-1.5 -right-2.5 bg-accent text-accent-on font-mono font-extrabold grid place-items-center rounded-full" style={{ fontSize: 10, minWidth: 16, height: 16, padding: '0 3px' }}>
                  {it.badge}
                </span>
              )}
            </div>
            <span style={{ fontSize: 10.5, fontWeight: on ? 700 : 600 }}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function NavItem({ it, on, mini, onClick }: { it: NavDef; on: boolean; mini: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={it.label}
      className="w-full flex items-center gap-3 rounded-[13px] relative transition-colors"
      style={{
        justifyContent: mini ? 'center' : 'flex-start',
        padding: mini ? '11px 0' : '11px 14px',
        background: on ? 'var(--accent-wash)' : 'transparent',
        color: on ? 'var(--accent-ink)' : 'var(--ink-soft)',
      }}
    >
      <div className="relative">
        <Icon name={it.icon} size={22} stroke={on ? 2.5 : 2} />
        {!!it.badge && it.badge > 0 && (
          <span className="absolute -top-1.5 -right-2 bg-accent text-accent-on font-mono font-extrabold grid place-items-center rounded-full" style={{ fontSize: 9.5, minWidth: 15, height: 15, padding: '0 3px' }}>
            {it.badge}
          </span>
        )}
      </div>
      {!mini && <span style={{ fontSize: 14.5, fontWeight: on ? 700 : 600 }}>{it.label}</span>}
    </button>
  );
}

function Sidebar({ mini, onPick }: { mini: boolean; onPick: (id: ScreenName) => void }) {
  const app = useApp();
  const initials = app.user.name.split(' ').map((p) => p[0]).slice(0, 2).join('');
  const shop: NavDef[] = [
    { id: 'browse', icon: 'home', label: 'Browse' },
    { id: 'search', icon: 'search', label: 'Search' },
    { id: 'cart', icon: 'cart', label: 'Cart', badge: app.cartCount() },
  ];
  const cat: NavDef[] = [
    { id: 'mproducts', icon: 'box', label: 'Products' },
    { id: 'mstores', icon: 'store', label: 'Stores' },
    { id: 'mprices', icon: 'tag', label: 'Prices' },
  ];
  return (
    <div className="shrink-0 border-r border-line bg-paper flex flex-col" style={{ width: mini ? 84 : 248, padding: mini ? '18px 12px' : '20px 16px' }}>
      <div className="flex items-center gap-2.5 mb-[22px]" style={{ justifyContent: mini ? 'center' : 'flex-start', padding: mini ? 0 : '0 6px' }}>
        <span className="grid place-items-center bg-accent text-accent-on shrink-0" style={{ width: 34, height: 34, borderRadius: 11 }}>
          <Icon name="tag" size={19} stroke={2.4} />
        </span>
        {!mini && <span className="font-display font-extrabold text-[20px] tracking-[-0.03em]">SpendLess</span>}
      </div>
      <div className="flex flex-col gap-[3px]">
        {shop.map((it) => (
          <NavItem key={it.id} it={it} mini={mini} on={app.screen === it.id} onClick={() => onPick(it.id as ScreenName)} />
        ))}
      </div>
      <div className="bg-line" style={{ margin: mini ? '16px 8px' : '16px 14px', height: 1 }} />
      {!mini && <div className="font-mono text-[10px] tracking-[0.14em] text-ink-faint uppercase" style={{ padding: '0 14px 8px' }}>Catalogue</div>}
      <div className="flex flex-col gap-[3px]">
        {cat.map((it) => (
          <NavItem key={it.id} it={it} mini={mini} on={app.screen === it.id} onClick={() => onPick(it.id as ScreenName)} />
        ))}
      </div>
      <div className="flex-1" />
      <button
        type="button"
        onClick={() => onPick('profile')}
        className="flex items-center gap-2.5 rounded-[14px]"
        style={{
          justifyContent: mini ? 'center' : 'flex-start',
          padding: mini ? '10px 0' : '10px 12px',
          background: app.screen === 'profile' ? 'var(--accent-wash)' : 'var(--surface)',
          boxShadow: app.screen === 'profile' ? 'none' : 'inset 0 0 0 1px var(--line)',
        }}
      >
        <span className="grid place-items-center bg-accent text-accent-on font-display font-extrabold shrink-0 rounded-full" style={{ width: 34, height: 34, fontSize: 14 }}>
          {initials}
        </span>
        {!mini && (
          <span className="min-w-0 text-left">
            <div className="font-bold text-[13.5px] truncate">{app.user.name}</div>
            <div className="text-[11.5px] text-ink-faint">View profile</div>
          </span>
        )}
      </button>
    </div>
  );
}

function TopBar({ onPick }: { onPick: (id: ScreenName) => void }) {
  const app = useApp();
  return (
    <div className="shrink-0 border-b border-line bg-paper flex items-center gap-3.5" style={{ height: 64, padding: '0 24px' }}>
      <button
        type="button"
        onClick={() => onPick('search')}
        className="flex items-center gap-2.5 bg-surface rounded-[12px] text-ink-faint shadow-[inset_0_0_0_1.5px_var(--line)]"
        style={{ flex: 1, maxWidth: 440, padding: '11px 14px' }}
      >
        <Icon name="search" size={19} stroke={2.2} />
        <span className="text-[14.5px]">Search products…</span>
      </button>
      <div className="flex-1" />
      <button
        type="button"
        onClick={() => app.openSheet('location')}
        className="flex items-center gap-1.5 bg-surface rounded-full text-ink-soft shadow-[inset_0_0_0_1px_var(--line)]"
        style={{ padding: '9px 14px' }}
      >
        <Icon name="pin" size={17} stroke={2} />
        <span className="text-[13.5px] font-semibold">{app.location ? app.location.split(',')[0] : 'Set location'}</span>
      </button>
      <button
        type="button"
        onClick={() => app.openSheet('currency')}
        className="flex items-center gap-1.5 bg-surface rounded-full text-ink-soft font-mono font-bold text-[13.5px] shadow-[inset_0_0_0_1px_var(--line)]"
        style={{ padding: '9px 14px' }}
      >
        {currencyChipLabel(app.currencyCode)}
      </button>
    </div>
  );
}

export default function Shell() {
  const app = useApp();
  const { compact, isTablet } = useBreakpoint();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset scroll position + track navigation on screen change.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    trackPageView(`/${app.screen}`, `${app.screen.charAt(0).toUpperCase()}${app.screen.slice(1)}`);
  }, [app.screen, app.params]);

  const Screen = SCREENS[app.screen] || BrowseScreen;
  const screenEl = <Screen key={app.screen + JSON.stringify(app.params)} />;

  const navigateSidebar = (screen: ScreenName) => {
    app.setMode(MANAGE_SCREENS.includes(screen) ? 'manage' : 'shop');
    app.tab(screen);
  };

  const shopTabs: NavDef[] = [
    { id: 'browse', icon: 'home', label: 'Browse' },
    { id: 'search', icon: 'search', label: 'Search' },
    { id: 'cart', icon: 'cart', label: 'Cart', badge: app.cartCount() },
    { id: 'manage', icon: 'sliders', label: 'Manage' },
  ];
  const manageTabs: NavDef[] = [
    { id: 'mproducts', icon: 'box', label: 'Products' },
    { id: 'mstores', icon: 'store', label: 'Stores' },
    { id: 'mprices', icon: 'tag', label: 'Prices' },
    { id: 'shop', icon: 'cart', label: 'Shop' },
  ];
  const onShopTab = (id: NavDef['id']) => {
    if (id === 'manage') {
      app.setMode('manage');
      app.tab('mproducts');
    } else app.tab(id as ScreenName);
  };
  const onManageTab = (id: NavDef['id']) => {
    if (id === 'shop') {
      app.setMode('shop');
      app.tab('browse');
    } else app.tab(id as ScreenName);
  };

  const showBottomNav = compact && NAV_SCREENS.includes(app.screen);

  const sheets = (
    <>
      <CurrencySheet />
      <LocationSheet />
    </>
  );

  if (compact) {
    return (
      <div className="flex flex-col bg-paper text-ink" style={{ height: '100dvh' }}>
        <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden relative">
          {screenEl}
        </div>
        {showBottomNav && (
          <BottomNav
            items={app.mode === 'shop' ? shopTabs : manageTabs}
            active={app.screen}
            onPick={app.mode === 'shop' ? onShopTab : onManageTab}
          />
        )}
        {sheets}
      </div>
    );
  }

  return (
    <div className="flex bg-paper text-ink" style={{ height: '100dvh' }}>
      <Sidebar mini={isTablet} onPick={navigateSidebar} />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar onPick={navigateSidebar} />
        <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden relative">
          {screenEl}
        </div>
      </div>
      {sheets}
    </div>
  );
}
