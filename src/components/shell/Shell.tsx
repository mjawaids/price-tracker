import { ComponentType, ReactNode, Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, ScreenName, Section } from '../../contexts/AppContext';
import { useLists } from '../../contexts/ListsContext';
import { useCompare } from '../../contexts/CompareContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { trackPageView } from '../../utils/analytics';
import { Icon, IconName, SegmentedControl, Toast } from '../ui';
import { peekShared, shareParam, useShared } from '../../lib/receipt/inbox';
import { CurrencySheet } from '../screens/sheets';
import { currencyChipLabel } from '../../utils/currency';
import { InstallBanner, InstallSidebarCta } from './Install';
import { WhatsNewSheet } from '../onboarding/WhatsNewSheet';

import ListsScreen from '../screens/ListsScreen';

// Lists (the default, offline-first section) ships in the main bundle; the other
// screens load on first use. The service worker precaches every chunk, so they
// still open offline.
const PricesScreen = lazy(() => import('../screens/PricesScreen'));
const SearchScreen = lazy(() => import('../screens/SearchScreen'));
const DetailScreen = lazy(() => import('../screens/DetailScreen'));
const StoresScreen = lazy(() => import('../screens/StoresScreen'));
const ContributeScreen = lazy(() => import('../screens/ContributeScreen'));
const PlanScreen = lazy(() => import('../screens/PlanScreen'));
const ProfileScreen = lazy(() => import('../screens/ProfileScreen'));
const ManageProducts = lazy(() => import('../screens/ManageScreens').then((m) => ({ default: m.ManageProducts })));
const ReceiptScreen = lazy(() => import('../screens/ReceiptScreen'));
const HelpSheet = lazy(() => import('./HelpSheet'));
const RegionSheet = lazy(() => import('../screens/compareSheets').then((m) => ({ default: m.RegionSheet })));
const SharedReceiptSheet = lazy(() => import('./SharedReceiptSheet'));

const SCREENS: Record<ScreenName, ComponentType> = {
  lists: ListsScreen,
  plan: PlanScreen,
  prices: PricesScreen,
  search: SearchScreen,
  detail: DetailScreen,
  stores: StoresScreen,
  contribute: ContributeScreen,
  mproducts: ManageProducts,
  receipt: ReceiptScreen,
  profile: ProfileScreen,
};

/** Placeholder while a screen's code loads (first visit only). */
function ScreenSkeleton() {
  return (
    <div className="p-5 flex flex-col gap-3" aria-busy="true" aria-label="Loading">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-[76px] rounded-card bg-surface shadow-card motion-safe:animate-pulse" />
      ))}
    </div>
  );
}

/** Compare screens that show the Prices · Stores · Contribute switch. */
const COMPARE_TABBED: ScreenName[] = ['prices', 'stores', 'contribute', 'mproducts'];
/** Screens that show the mobile tab bar (others are full-screen with their own back). */
const NAV_SCREENS: ScreenName[] = ['lists', 'profile', 'search', ...COMPARE_TABBED];

type CompareTab = 'prices' | 'stores' | 'contribute';
const compareTabOf = (s: ScreenName): CompareTab =>
  s === 'stores' ? 'stores' : s === 'contribute' || s === 'mproducts' || s === 'receipt' ? 'contribute' : 'prices';

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
      {!mini && (
        <span className="min-w-0 text-left leading-snug" style={{ fontSize: 14.5, fontWeight: on ? 700 : 600 }}>
          {it.label}
        </span>
      )}
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

/**
 * Tracks whether the sidebar nav has items hidden above/below its scroll area
 * (the scrollbar is hidden, so the UI has to say so) and scrolls to reveal them.
 */
function useNavOverflow() {
  const ref = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ above: false, below: false });
  useEffect(() => {
    const el = ref.current;
    const content = contentRef.current;
    if (!el || !content) return;
    const update = () => {
      const above = el.scrollTop > 2;
      const below = el.scrollHeight - el.clientHeight - el.scrollTop > 2;
      setEdges((p) => (p.above === above && p.below === below ? p : { above, below }));
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    // The viewport (window resizes) and the content (lists added, removed or
    // renamed onto two lines) can each change whether anything is hidden.
    ro.observe(el);
    ro.observe(content);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, []);
  const more = () => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ top: Math.max(el.clientHeight * 0.75, 120), behavior: reduce ? 'auto' : 'smooth' });
  };
  return { ref, contentRef, ...edges, more };
}

function Sidebar({ mini, onPick }: { mini: boolean; onPick: (id: ScreenName) => void }) {
  const app = useApp();
  const lists = useLists();
  const initials = app.user.name.split(' ').map((p) => p[0]).slice(0, 2).join('');
  const compareItems: NavDef[] = [
    { id: 'prices', icon: 'tag', label: 'Prices' },
    { id: 'stores', icon: 'store', label: 'Stores' },
    { id: 'contribute', icon: 'plusSquare', label: 'Contribute' },
  ];
  const onLists = app.screen === 'lists';
  const nav = useNavOverflow();
  return (
    <div className="shrink-0 border-r border-line bg-paper flex flex-col" style={{ width: mini ? 84 : 248, padding: mini ? '18px 12px' : '20px 16px' }}>
      {/* Nav scrolls on short windows / many lists; the install card and profile stay pinned below.
          Fades + a "More" button show when items are hidden, since the scrollbar is hidden. */}
      <div className="relative flex-1 min-h-0 flex flex-col">
        <div ref={nav.ref} className="flex-1 min-h-0 flex flex-col overflow-y-auto no-scrollbar">
          <div ref={nav.contentRef} className="shrink-0 flex flex-col">
            <div className="shrink-0 flex items-center gap-2.5 mb-[10px]" style={{ justifyContent: mini ? 'center' : 'flex-start', padding: mini ? 0 : '0 6px' }}>
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
              {compareItems.map((it) => (
                <NavItem
                  key={it.id}
                  it={it}
                  mini={mini}
                  on={app.section === 'compare' && compareTabOf(app.screen) === it.id && app.screen !== 'search' && app.screen !== 'detail'}
                  onClick={() => onPick(it.id as ScreenName)}
                />
              ))}
            </div>
          </div>
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 transition-opacity duration-200"
          style={{ height: 28, opacity: nav.above ? 1 : 0, background: 'linear-gradient(to bottom, var(--paper), transparent)' }}
        />
        <div
          className="absolute inset-x-0 bottom-0 flex items-end justify-center transition-opacity duration-200"
          style={{
            height: 64,
            opacity: nav.below ? 1 : 0,
            pointerEvents: 'none',
            background: 'linear-gradient(to top, var(--paper) 45%, transparent)',
          }}
        >
          <button
            type="button"
            onClick={nav.more}
            tabIndex={nav.below ? 0 : -1}
            aria-hidden={!nav.below}
            aria-label="Show more menu items"
            title="More"
            className="grid place-items-center"
            style={{ minHeight: 48, minWidth: 48, pointerEvents: nav.below ? 'auto' : 'none' }}
          >
            <span
              className="inline-flex items-center gap-1 rounded-full bg-surface text-ink-soft font-bold text-[12.5px]"
              style={{ height: 30, padding: mini ? '0 7px' : '0 12px 0 10px', boxShadow: 'inset 0 0 0 1px var(--line)' }}
            >
              <Icon name="chevD" size={16} stroke={2.4} />
              {!mini && 'More'}
            </span>
          </button>
        </div>
      </div>
      <div className="shrink-0 flex flex-col pt-4">
        <InstallSidebarCta mini={mini} />
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
    </div>
  );
}

/** Prices · Stores · Contribute switch for the Compare section (mobile). */
function CompareNav() {
  const app = useApp();
  return (
    <div className="shrink-0 bg-paper border-b border-line" style={{ padding: '12px 16px 10px' }}>
      <SegmentedControl
        label="Compare sections"
        value={compareTabOf(app.screen)}
        onChange={(t) => app.tab(t)}
        options={[
          { id: 'prices', label: 'Prices' },
          { id: 'stores', label: 'Stores' },
          { id: 'contribute', label: 'Contribute' },
        ]}
      />
    </div>
  );
}

function CompareOfflineNote() {
  return (
    <div role="status" className="shrink-0 flex items-center gap-2.5 bg-warn-wash text-warn-ink text-[13.5px] font-semibold" style={{ padding: '10px 16px' }}>
      <Icon name="wifiOff" size={17} stroke={2.4} className="shrink-0" />
      You’re offline — showing prices saved on this device. Your lists still work.
    </div>
  );
}

function TopBar({ onPick }: { onPick: (id: ScreenName) => void }) {
  const app = useApp();
  const compare = useCompare();
  return (
    <div className="shrink-0 border-b border-line bg-paper flex items-center gap-3.5" style={{ height: 64, padding: '0 24px' }}>
      <button
        type="button"
        onClick={() => onPick('search')}
        className="flex items-center gap-2.5 bg-surface rounded-[12px] text-ink-soft shadow-[inset_0_0_0_1.5px_var(--line)]"
        style={{ flex: 1, maxWidth: 440, padding: '11px 14px' }}
      >
        <Icon name="search" size={19} stroke={2.2} />
        <span className="text-[14.5px]">Search products…</span>
      </button>
      <div className="flex-1" />
      <button
        type="button"
        onClick={() => app.openSheet('region')}
        className="flex items-center gap-1.5 bg-surface rounded-full text-ink-soft shadow-[inset_0_0_0_1px_var(--line)]"
        style={{ padding: '9px 14px', minHeight: 40 }}
      >
        <Icon name="pin" size={17} stroke={2} />
        <span className="text-[13.5px] font-semibold">{compare.region?.name ?? (compare.regionChosen ? 'Another city' : 'Choose city')}</span>
      </button>
      {/* A live city prices in its own currency; elsewhere money uses yours. */}
      {!compare.region && (
        <button
          type="button"
          onClick={() => app.openSheet('currency')}
          aria-label={`Currency: ${app.currencyCode}`}
          className="flex items-center gap-1.5 bg-surface rounded-full text-ink-soft font-mono font-bold text-[13.5px] shadow-[inset_0_0_0_1px_var(--line)]"
          style={{ padding: '9px 14px', minHeight: 40 }}
        >
          {currencyChipLabel(app.currencyCode)}
        </button>
      )}
    </div>
  );
}

export default function Shell() {
  const app = useApp();
  const compare = useCompare();
  const { compact, isTablet } = useBreakpoint();
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const shared = useShared();
  const [shareFailed, setShareFailed] = useState(shareParam === 'failed');

  // Something shared to SpendLess waits on the device? Looked for on every start, not
  // only on /?share=receipt: signing in first drops the query.
  useEffect(() => {
    void peekShared();
    if (shareParam) navigate({ search: '' }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!shareFailed) return;
    const t = setTimeout(() => setShareFailed(false), 6000);
    return () => clearTimeout(t);
  }, [shareFailed]);

  // Reset scroll position + track navigation on screen change.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    trackPageView(`/${app.screen}`, `${app.screen.charAt(0).toUpperCase()}${app.screen.slice(1)}`);
  }, [app.screen, app.params]);

  const Screen = SCREENS[app.screen] || ListsScreen;
  const screenEl = (
    <Suspense fallback={<ScreenSkeleton />}>
      <Screen key={app.screen + JSON.stringify(app.params)} />
    </Suspense>
  );

  const tabs: NavDef[] = [
    { id: 'lists', icon: 'lists', label: 'Lists' },
    { id: 'compare', icon: 'tag', label: 'Compare' },
    { id: 'profile', icon: 'user', label: 'Profile' },
  ];

  const showBottomNav = compact && NAV_SCREENS.includes(app.screen);
  const inCompareTabs = COMPARE_TABBED.includes(app.screen);
  const compareOffline = app.section === 'compare' && !compare.online;

  const sheets = (
    <>
      <CurrencySheet />
      {app.sheet === 'region' && (
        <Suspense fallback={null}>
          <RegionSheet open onClose={() => app.openSheet(null)} />
        </Suspense>
      )}
      <WhatsNewSheet />
      {app.sheet === 'help' && (
        <Suspense fallback={null}>
          <HelpSheet />
        </Suspense>
      )}
      {shared && (
        <Suspense fallback={null}>
          <SharedReceiptSheet summary={shared} />
        </Suspense>
      )}
      {shareFailed && !shared && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50" style={{ width: 'min(440px, calc(100vw - 32px))' }}>
          <Toast message="That share didn’t come through. Try sharing it again." icon="alert" onDismiss={() => setShareFailed(false)} />
        </div>
      )}
    </>
  );

  if (compact) {
    return (
      <div className="flex flex-col bg-paper text-ink" style={{ height: '100dvh' }}>
        <InstallBanner />
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
      <Sidebar mini={isTablet} onPick={app.tab} />
      <div className="flex-1 min-w-0 flex flex-col">
        <InstallBanner />
        {app.section === 'compare' && <TopBar onPick={app.go} />}
        {compareOffline && <CompareOfflineNote />}
        <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden relative">
          {screenEl}
        </div>
      </div>
      {sheets}
    </div>
  );
}
