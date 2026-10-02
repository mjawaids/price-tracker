import { ReactNode, useEffect, useRef } from 'react';
import { useApp, ScreenName, Section } from '../../contexts/AppContext';
import { useLists } from '../../contexts/ListsContext';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { trackPageView } from '../../utils/analytics';
import { Chip, Icon, IconName, SegmentedControl } from '../ui';
import { currencyChipLabel, CurrencySheet, LocationSheet } from '../screens/sheets';

import ListsScreen from '../screens/ListsScreen';
import BrowseScreen from '../screens/BrowseScreen';
import SearchScreen from '../screens/SearchScreen';
import DetailScreen from '../screens/DetailScreen';
import CartScreen from '../screens/CartScreen';
import PlanScreen from '../screens/PlanScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { ManageProducts, ManageStores, ManagePrices } from '../screens/ManageScreens';

const SCREENS: Record<ScreenName, () => JSX.Element> = {
  lists: ListsScreen,
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
/** Compare screens that show the Browse · Cart · Catalogue switch (and the tab bar). */
const COMPARE_TABBED: ScreenName[] = ['browse', 'search', 'cart', 'mproducts', 'mstores', 'mprices'];
const NAV_SCREENS: ScreenName[] = ['lists', 'profile', ...COMPARE_TABBED];

type CompareTab = 'browse' | 'cart' | 'catalogue';
const compareTabOf = (s: ScreenName): CompareTab =>
  MANAGE_SCREENS.includes(s) ? 'catalogue' : s === 'cart' ? 'cart' : 'browse';

interface NavDef {
  id: ScreenName | Section;
  icon: IconName;
  label: string;
  badge?: number;
}

function BottomNav({ items, active, onPick }: { items: NavDef[]; active: NavDef['id']; onPick: (id: NavDef['id']) => void }) {
  return (
    <nav aria-label="Main" className="flex bg-paper border-t border-line shrink-0 safe-bottom" style={{ padding: '6px 6px' }}>
      {items.map((it) => {
        const on = active === it.id;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onPick(it.id)}
            aria-current={on ? 'page' : undefined}
            className="flex-1 flex flex-col items-center justify-center gap-[3px] bg-transparent"
            style={{ minHeight: 52, padding: '6px 0 5px', color: on ? 'var(--accent-ink)' : 'var(--ink-soft)' }}
          >
            <div className="relative">
              <Icon name={it.icon} size={24} stroke={on ? 2.5 : 2} />
              {!!it.badge && it.badge > 0 && (
                <span className="absolute -top-1.5 -right-2.5 bg-accent text-accent-on font-mono font-extrabold grid place-items-center rounded-full" style={{ fontSize: 10, minWidth: 16, height: 16, padding: '0 3px' }}>
                  {it.badge}
                </span>
              )}
            </div>
            <span style={{ fontSize: 11, fontWeight: on ? 800 : 600 }}>{it.label}</span>
          </button>
        );
      })}
    </nav>
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

function SidebarLabel({ mini, children }: { mini: boolean; children: ReactNode }) {
  if (mini) return <div className="bg-line" style={{ margin: '12px 8px', height: 1 }} />;
  return (
    <div className="font-mono text-[10px] tracking-[0.14em] text-ink-soft uppercase" style={{ padding: '14px 14px 8px' }}>
      {children}
    </div>
  );
}

function Sidebar({ mini, onPick }: { mini: boolean; onPick: (id: ScreenName) => void }) {
  const app = useApp();
  const lists = useLists();
  const initials = app.user.name.split(' ').map((p) => p[0]).slice(0, 2).join('');
  const compare: NavDef[] = [
    { id: 'browse', icon: 'home', label: 'Browse' },
    { id: 'search', icon: 'search', label: 'Search' },
    { id: 'cart', icon: 'cart', label: 'Cart', badge: app.cartCount() },
  ];
  const cat: NavDef[] = [
    { id: 'mproducts', icon: 'box', label: 'Products' },
    { id: 'mstores', icon: 'store', label: 'Stores' },
    { id: 'mprices', icon: 'tag', label: 'Prices' },
  ];
  const onLists = app.screen === 'lists';
  return (
    <div className="shrink-0 border-r border-line bg-paper flex flex-col overflow-y-auto no-scrollbar" style={{ width: mini ? 84 : 248, padding: mini ? '18px 12px' : '20px 16px' }}>
      <div className="flex items-center gap-2.5 mb-[10px]" style={{ justifyContent: mini ? 'center' : 'flex-start', padding: mini ? 0 : '0 6px' }}>
        <span className="grid place-items-center bg-accent text-accent-on shrink-0" style={{ width: 34, height: 34, borderRadius: 11 }}>
          <Icon name="tag" size={19} stroke={2.4} />
        </span>
        {!mini && <span className="font-display font-extrabold text-[20px] tracking-[-0.03em]">SpendLess</span>}
      </div>
      <SidebarLabel mini={mini}>Lists</SidebarLabel>
      <div className="flex flex-col gap-[3px]">
        {mini ? (
          <NavItem
            it={{ id: 'lists', icon: 'lists', label: 'Lists', badge: lists.todo.length }}
            mini
            on={onLists}
            onClick={() => onPick('lists')}
          />
        ) : (
          <>
            {lists.lists.map((l) => (
              <NavItem
                key={l.id}
                it={{ id: 'lists', icon: 'lists', label: l.name, badge: lists.todoCountByList[l.id] || 0 }}
                mini={false}
                on={onLists && lists.activeList?.id === l.id}
                onClick={() => {
                  lists.setActiveList(l.id);
                  onPick('lists');
                }}
              />
            ))}
            <button
              type="button"
              onClick={() => app.tab('lists', { newList: true })}
              className="w-full flex items-center gap-3 rounded-[13px] bg-transparent text-accent-ink font-bold text-[14.5px]"
              style={{ padding: '11px 14px' }}
            >
              <Icon name="plus" size={20} stroke={2.6} />
              New list
            </button>
          </>
        )}
      </div>
      <SidebarLabel mini={mini}>Compare</SidebarLabel>
      <div className="flex flex-col gap-[3px]">
        {compare.map((it) => (
          <NavItem key={it.id} it={it} mini={mini} on={app.screen === it.id} onClick={() => onPick(it.id as ScreenName)} />
        ))}
      </div>
      <SidebarLabel mini={mini}>Catalogue</SidebarLabel>
      <div className="flex flex-col gap-[3px]">
        {cat.map((it) => (
          <NavItem key={it.id} it={it} mini={mini} on={app.screen === it.id} onClick={() => onPick(it.id as ScreenName)} />
        ))}
      </div>
      <div className="flex-1" style={{ minHeight: 16 }} />
      <button
        type="button"
        onClick={() => onPick('profile')}
        aria-label={mini ? 'Profile' : undefined}
        className="flex items-center gap-2.5 rounded-[14px]"
        style={{
          justifyContent: mini ? 'center' : 'flex-start',
          padding: mini ? '10px 0' : '10px 12px',
          background: app.screen === 'profile' ? 'var(--accent-wash)' : 'var(--surface)',
          boxShadow: app.screen === 'profile' ? 'none' : 'inset 0 0 0 1px var(--line)',
        }}
      >
        <span className="grid place-items-center bg-accent text-accent-on font-display font-extrabold shrink-0 rounded-full overflow-hidden" style={{ width: 34, height: 34, fontSize: 14 }}>
          {app.user.avatarUrl ? (
            <img src={app.user.avatarUrl} alt={app.user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            initials
          )}
        </span>
        {!mini && (
          <span className="min-w-0 text-left">
            <div className="font-bold text-[13.5px] truncate">{app.user.name}</div>
            <div className="text-[11.5px] text-ink-soft">View profile</div>
          </span>
        )}
      </button>
    </div>
  );
}

/** Browse · Cart · Catalogue switch for the Compare section (+ catalogue sub-tabs). */
function CompareNav() {
  const app = useApp();
  const tab = compareTabOf(app.screen);
  const pick = (t: CompareTab) => {
    if (t === 'catalogue') {
      app.setMode('manage');
      app.tab('mproducts');
    } else {
      app.setMode('shop');
      app.tab(t);
    }
  };
  return (
    <div className="shrink-0 bg-paper border-b border-line flex flex-col gap-2.5" style={{ padding: '12px 16px 10px' }}>
      <SegmentedControl
        label="Compare sections"
        value={tab}
        onChange={pick}
        options={[
          { id: 'browse', label: 'Browse' },
          { id: 'cart', label: app.cartCount() ? `Cart · ${app.cartCount()}` : 'Cart' },
          { id: 'catalogue', label: 'Catalogue' },
        ]}
      />
      {tab === 'catalogue' && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {(
            [
              ['mproducts', 'Products'],
              ['mstores', 'Stores'],
              ['mprices', 'Prices'],
            ] as [ScreenName, string][]
          ).map(([id, label]) => (
            <Chip key={id} active={app.screen === id} onClick={() => app.tab(id)}>
              {label}
            </Chip>
          ))}
        </div>
      )}
    </div>
  );
}

function CompareOfflineNote() {
  return (
    <div role="status" className="shrink-0 flex items-center gap-2.5 bg-warn-wash text-warn-ink text-[13.5px] font-semibold" style={{ padding: '10px 16px' }}>
      <Icon name="wifiOff" size={17} stroke={2.4} className="shrink-0" />
      You’re offline — prices may be out of date. Your lists still work.
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
  const lists = useLists();
  const onboarding = useOnboarding();
  const { compact, isTablet } = useBreakpoint();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset scroll position + track navigation on screen change.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    trackPageView(`/${app.screen}`, `${app.screen.charAt(0).toUpperCase()}${app.screen.slice(1)}`);
  }, [app.screen, app.params]);

  // The Compare walkthrough runs the first time someone opens Compare.
  const { maybeStartCompareTour } = onboarding;
  useEffect(() => {
    if (app.section === 'compare') maybeStartCompareTour();
  }, [app.section, maybeStartCompareTour]);

  const Screen = SCREENS[app.screen] || ListsScreen;
  const screenEl = <Screen key={app.screen + JSON.stringify(app.params)} />;

  const navigateSidebar = (screen: ScreenName) => {
    app.setMode(MANAGE_SCREENS.includes(screen) ? 'manage' : 'shop');
    app.tab(screen);
  };

  const tabs: NavDef[] = [
    { id: 'lists', icon: 'lists', label: 'Lists' },
    { id: 'compare', icon: 'tag', label: 'Compare', badge: app.cartCount() },
    { id: 'profile', icon: 'user', label: 'Profile' },
  ];

  const showBottomNav = compact && NAV_SCREENS.includes(app.screen);
  const inCompareTabs = COMPARE_TABBED.includes(app.screen);
  const compareOffline = app.section === 'compare' && !lists.online;

  const sheets = (
    <>
      <CurrencySheet />
      <LocationSheet />
    </>
  );

  if (compact) {
    return (
      <div className="flex flex-col bg-paper text-ink" style={{ height: '100dvh' }}>
        {inCompareTabs && <CompareNav />}
        {compareOffline && <CompareOfflineNote />}
        <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden relative">
          {screenEl}
        </div>
        {showBottomNav && (
          <BottomNav items={tabs} active={app.section} onPick={(id) => app.openSection(id as Section)} />
        )}
        {sheets}
      </div>
    );
  }

  return (
    <div className="flex bg-paper text-ink" style={{ height: '100dvh' }}>
      <Sidebar mini={isTablet} onPick={navigateSidebar} />
      <div className="flex-1 min-w-0 flex flex-col">
        {app.section === 'compare' && <TopBar onPick={navigateSidebar} />}
        {compareOffline && <CompareOfflineNote />}
        <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden relative">
          {screenEl}
        </div>
      </div>
      {sheets}
    </div>
  );
}
