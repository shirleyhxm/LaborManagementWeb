import { useState, useEffect, useRef, Fragment } from "react";
import { useNavigate, useLocation, Routes, Route } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Button } from "./components/ui/button";
import {
  FileInput,
  Zap,
  BarChart2,
  HelpCircle,
  LogOut,
  Calendar,
  Home,
  TrendingUp,
  AlertTriangle,
  PieChart,
  Users,
  ToggleLeft,
  ToggleRight,
  Bolt,
  PanelLeftClose,
  PanelLeftOpen,
  CalendarCheck,
  MoreHorizontal,
  Shield,
  X
} from "lucide-react";
import { DashboardView } from "./components/DashboardView";
import { ScheduleView } from "./components/ScheduleView";
import { SalesForecast } from "./components/SalesForecast";
import { ConstraintsEditor } from "./components/ConstraintsEditor";
import { AlertsPanel } from "./components/AlertsPanel";
import { Analytics } from "./components/Analytics";
import { OnboardingWalkthrough } from "./components/OnboardingWalkthrough";
import { EmployeeManager } from "./components/EmployeeManager";
import { RequestsPanel } from "./components/RequestsPanel";
import { TeamPanel } from "./components/TeamPanel";
import { useRequestsPendingCount } from "./hooks/useRequestsPendingCount";
import { WeekSelector } from "./components/WeekSelector";
import { WeekDisplay } from "./components/WeekDisplay";
import { useAuth } from "./contexts/AuthContext";
import { OptimizationProvider } from "./contexts/OptimizationContext";
import { WeekProvider, useWeek } from "./contexts/WeekContext";
import { BusinessProvider, useBusiness } from "./contexts/BusinessContext";
import { BusinessSelector } from "./components/BusinessSelector";
import { RegionSelector } from "./components/RegionSelector";
import { useFormatters } from "./hooks/useFormatters";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "./components/ui/use-mobile";
import { IS_PRODUCTION, IS_DEVELOPMENT, FEATURE_FLAGS } from "./config/environment";
import { UserRole } from "./types/auth";

// New V2 Optimization screens
import { InputsHub } from "./components/optimization/InputsHub";
import { DemandInput } from "./components/optimization/DemandInput";
import { WorkersInput } from "./components/optimization/WorkersInput";
import { ConstraintsInput } from "./components/optimization/ConstraintsInput";
import { OptimizeScreen } from "./components/optimization/OptimizeScreen";
import { ResultsScreen } from "./components/optimization/ResultsScreen";

const LEGACY_UI_KEY = 'show_legacy_ui';
const SIDEBAR_COLLAPSED_KEY = 'sidebar_collapsed';

// Minimum width for the main content area so schedule time-block cells
// (e.g. "00:00 - 00:00") never get squeezed narrower than their text.
const MAIN_CONTENT_MIN_WIDTH = 700;

// Sidebar widths. The peek width only has to fit an icon plus the longest tab
// title ("Show Hardcoded"), not the business/week pickers the full sidebar holds.
// The expanded width is set by its widest single-line text ("OptimalAssign",
// ~165px) plus padding — keep it above that or the logo starts wrapping.
const SIDEBAR_RAIL_WIDTH = 64;
const SIDEBAR_PEEK_WIDTH = 200;
const SIDEBAR_EXPANDED_WIDTH = 256;

// Mobile bottom bar. Tabs are sized to fit ~4.5 across a 375px viewport, so the
// half-visible fifth advertises that the strip scrolls.
const MOBILE_NAV_ITEM_WIDTH = 76;

export default function App() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showLegacyUI, setShowLegacyUI] = useState(() => {
    // Only allow legacy UI toggle in development mode
    if (!IS_DEVELOPMENT) return false;
    // Load from localStorage on mount
    const stored = localStorage.getItem(LEGACY_UI_KEY);
    return stored === 'true';
  });
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  // Remember the last schedule sub-URL when switching tabs
  const lastSchedulePathRef = useRef<string>('/schedule');

  // Remember the last inputs sub-URL
  const lastInputsPathRef = useRef<string>('/inputs');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleLegacyUI = () => {
    // Only allow toggling in development mode
    if (!IS_DEVELOPMENT) return;
    const newValue = !showLegacyUI;
    setShowLegacyUI(newValue);
    localStorage.setItem(LEGACY_UI_KEY, String(newValue));
  };

  // Get current tab from URL path
  const getCurrentTab = () => {
    const path = location.pathname.slice(1); // Remove leading slash
    // Handle nested routes like /schedule/new or /schedule/:id
    const basePath = path.split('/')[0];

    // Default to schedule in production, inputs in development
    const defaultTab = IS_PRODUCTION ? "schedule" : "inputs";
    const tab = basePath || defaultTab;

    return tab;
  };

  const activeTab = getCurrentTab();

  // Track and save the last schedule path when on a schedule route
  useEffect(() => {
    if (location.pathname.startsWith('/schedule')) {
      lastSchedulePathRef.current = location.pathname;
    }
    if (location.pathname.startsWith('/inputs')) {
      lastInputsPathRef.current = location.pathname;
    }
  }, [location.pathname]);

  // Navigate to tab
  const handleTabChange = (value: string) => {
    // Restore last schedule path when returning to schedule tab
    if (value === "schedule") {
      navigate(lastSchedulePathRef.current);
    } else {
      navigate(`/${value}`);
    }
  };

  return (
    <BusinessProvider>
      <WeekProvider>
        <OptimizationProvider>
          <AppContent
            showOnboarding={showOnboarding}
            setShowOnboarding={setShowOnboarding}
            showLegacyUI={showLegacyUI}
            toggleLegacyUI={toggleLegacyUI}
            activeTab={activeTab}
            handleTabChange={handleTabChange}
            handleLogout={handleLogout}
            user={user}
          />
        </OptimizationProvider>
      </WeekProvider>
    </BusinessProvider>
  );
}

interface AppContentProps {
  showOnboarding: boolean;
  setShowOnboarding: (show: boolean) => void;
  showLegacyUI: boolean;
  toggleLegacyUI: () => void;
  activeTab: string;
  handleTabChange: (value: string) => void;
  handleLogout: () => void;
  user: any;
}

// One nav destination. `group` drives the sidebar's labelled dividers; the
// mobile bar renders a flat strip and ignores it.
interface NavItem {
  value: string;
  /** Translation key under `nav.`, resolved where the label is rendered. */
  label: string;
  icon: typeof Calendar;
  group: 'main' | 'dev' | 'legacy';
  /** Rendered over the icon — currently only the pending-requests count. */
  badgeCount?: number;
}

function buildNavItems(
  showLegacyUI: boolean,
  pendingRequestsCount: number,
  isAccountOwner: boolean
): NavItem[] {
  const items: NavItem[] = [];

  // BACKEND-INTEGRATED FEATURES - Available in production
  if (FEATURE_FLAGS.showSchedule) items.push({ value: 'schedule', label: 'nav.schedule', icon: Calendar, group: 'main' });
  if (FEATURE_FLAGS.showForecast) items.push({ value: 'forecast', label: 'nav.forecast', icon: TrendingUp, group: 'main' });
  if (FEATURE_FLAGS.showConstraints) items.push({ value: 'rules', label: 'nav.rules', icon: Bolt, group: 'main' });
  if (FEATURE_FLAGS.showEmployees) items.push({ value: 'employees', label: 'nav.employees', icon: Users, group: 'main' });
  if (FEATURE_FLAGS.showTimeoff) {
    items.push({ value: 'requests', label: 'nav.requests', icon: CalendarCheck, group: 'main', badgeCount: pendingRequestsCount });
  }
  // Managing who can access a business is the account owner's job, so the tab
  // is theirs alone — a manager would only find 403s behind it.
  if (isAccountOwner) {
    items.push({ value: 'team', label: 'nav.team', icon: Shield, group: 'main' });
  }

  // DEVELOPMENT-ONLY FEATURES
  if (IS_DEVELOPMENT) {
    items.push({ value: 'inputs', label: 'nav.inputs', icon: FileInput, group: 'dev' });
    items.push({ value: 'optimize', label: 'nav.optimize', icon: Zap, group: 'dev' });
    items.push({ value: 'results', label: 'nav.results', icon: BarChart2, group: 'dev' });

    // Hardcoded features - Development only, with toggle
    if (showLegacyUI) {
      items.push({ value: 'dashboard', label: 'nav.dashboard', icon: Home, group: 'legacy' });
      items.push({ value: 'alerts', label: 'nav.alerts', icon: AlertTriangle, group: 'legacy' });
      items.push({ value: 'analytics', label: 'nav.analytics', icon: PieChart, group: 'legacy' });
    }
  }

  return items;
}

// The badge sits on the icon, so it travels with it into both layouts.
function NavIcon({ item, className }: { item: NavItem; className?: string }) {
  const Icon = item.icon;
  const icon = <Icon className={className ?? 'w-5 h-5'} />;

  if (!item.badgeCount) return icon;

  return (
    <div className="relative shrink-0">
      {icon}
      <span
        className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] leading-none font-medium"
        aria-label={`${item.badgeCount} pending requests`}
      >
        {item.badgeCount > 99 ? '99+' : item.badgeCount}
      </span>
    </div>
  );
}

function AppContent({
  showOnboarding,
  setShowOnboarding,
  showLegacyUI,
  toggleLegacyUI,
  activeTab,
  handleTabChange,
  handleLogout,
  user,
}: AppContentProps) {
  const { selectedWeek, setSelectedWeek } = useWeek();
  const { currentBusiness, isLoading: isLoadingBusiness, businesses } = useBusiness();
  const { formatDateMedium } = useFormatters();
  const { t } = useTranslation();
  const pendingRequestsCount = useRequestsPendingCount();
  const [showWeekSelector, setShowWeekSelector] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
  });

  // Under 768px the sidebar becomes a bottom bar: vertical nav costs width the
  // schedule grid can't spare, and thumb reach is at the bottom of the screen.
  const isMobile = useIsMobile();
  // The account actions the sidebar keeps in its footer (help, legacy toggle,
  // logout, user identity) have no room in the bar, so they move into a sheet.
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);

  const navItems = buildNavItems(
    showLegacyUI,
    pendingRequestsCount,
    user?.role === UserRole.ADMIN
  );

  // Transient: hovering the collapsed rail widens it just enough to read the tab
  // titles. Never changes the persisted collapsed state, so the rail snaps back
  // once the pointer leaves.
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
    // Otherwise collapsing from expanded would leave the peek active, hiding the
    // change until the pointer moves away.
    setIsSidebarHovered(false);
  };

  // Peeking = collapsed but hover-widened to show tab titles. Only the nav rows
  // gain labels; the business/week pickers and user block stay hidden, so the
  // panel needs far less width than the fully expanded sidebar.
  const isSidebarPeeking = isSidebarCollapsed && isSidebarHovered;
  // Icon-only = collapsed and not being peeked at.
  const isSidebarIconOnly = isSidebarCollapsed && !isSidebarPeeking;

  const sidebarWidth = isSidebarCollapsed
    ? (isSidebarPeeking ? `${SIDEBAR_PEEK_WIDTH}px` : `${SIDEBAR_RAIL_WIDTH}px`)
    : `${SIDEBAR_EXPANDED_WIDTH}px`;

  // Icons stay centered in the icon-only rail; once labels appear the row aligns
  // left so the icon keeps its column and the title reads beside it.
  const navTriggerClassName = isSidebarIconOnly
    ? "w-full justify-center px-2 gap-0"
    : isSidebarPeeking
      ? "w-full justify-start gap-2"
      : "w-full";

  const navTriggerLabelProps = (label: string) =>
    isSidebarIconOnly ? { title: label, "aria-label": label } : {};

  // Labels render whenever the sidebar is showing text — expanded or peeking.
  const renderNavLabel = (label: string) =>
    isSidebarIconOnly ? null : <span className="whitespace-nowrap">{label}</span>;

  // Check if user has ever confirmed a week
  const hasConfirmedWeek = () => {
    return localStorage.getItem('hasConfirmedWeek') === 'true';
  };

  // Show week selector modal on first visit if no week is selected
  // Only show for tabs that require week selection (Schedule, Forecast)
  // Only show if user has never confirmed a week before
  // IMPORTANT: This hook must be called before any conditional returns
  useEffect(() => {
    const tabsRequiringWeek = ['schedule', 'forecast'];
    if (!selectedWeek && !hasConfirmedWeek() && tabsRequiringWeek.includes(activeTab)) {
      setShowWeekSelector(true);
    } else if (!tabsRequiringWeek.includes(activeTab)) {
      // Close week selector when navigating to tabs that don't require it
      setShowWeekSelector(false);
    }
  }, [selectedWeek, activeTab]);

  // Wait for business context to load before rendering main content
  if (isLoadingBusiness) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-neutral-600">Loading your business...</p>
        </div>
      </div>
    );
  }

  // Handle case where user has no businesses
  if (!currentBusiness && businesses.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="max-w-md w-full p-6">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">Welcome!</h2>
            <p className="text-neutral-600 mb-6">
              You don't have any businesses yet. Create your first business to get started.
            </p>
            <BusinessSelector />
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (date: Date) => formatDateMedium(date);

  const handleWeekSelect = (startDate: Date, endDate: Date) => {
    setSelectedWeek({ startDate, endDate });
    setIsOpen(false);
    setShowWeekSelector(false);
  };

  const handleConfirmWeek = () => {
    localStorage.setItem('hasConfirmedWeek', 'true');
    setShowWeekSelector(false);
  };

  return (
    <>
      {/* On mobile the axis flips: nav moves to a bar below the content instead
          of a rail beside it, so the row becomes a column. */}
      <div
        className="bg-neutral-50"
        style={{
          height: '100vh',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* While collapsed the sidebar is taken out of flow (see below) and this
            spacer holds its 64px footprint. It stays mounted for the whole
            collapsed state, not just during the peek: if it unmounted the moment
            the peek ended, the sidebar would rejoin the flex row still mid
            width-animation and squeeze the content pane for those 150ms. */}
        {!isMobile && isSidebarCollapsed && <div style={{ width: `${SIDEBAR_RAIL_WIDTH}px`, flexShrink: 0 }} />}

        {/* Mobile top bar: the business/week pickers the sidebar normally holds.
            They stay at the top rather than joining the bottom bar — they're
            context for what you're looking at, not navigation. */}
        {isMobile && (
          <div
            className="bg-white border-b-2 border-neutral-300 px-3 py-2"
            style={{ flexShrink: 0 }}
          >
            <h1 className="text-lg font-bold text-blue-600">OptimalAssign</h1>
            {/* The pickers get their own row: at 390px all three on one line
                truncates the business name to "De..." and pushes the week
                control off-screen. */}
            {(currentBusiness || selectedWeek) && (
              <div className="mt-2 flex items-center gap-2">
                {currentBusiness && (
                  <div className="flex-1 min-w-0">
                    <BusinessSelector />
                  </div>
                )}
                {selectedWeek && (
                  <div className="shrink-0">
                    <WeekDisplay />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Vertical Navigation Sidebar - Fixed (desktop only) */}
        {!isMobile && (
        <div
          className="bg-white"
          onMouseEnter={() => isSidebarCollapsed && setIsSidebarHovered(true)}
          onMouseLeave={() => setIsSidebarHovered(false)}
          style={{
            borderRight: '2px solid #d4d4d4',
            width: sidebarWidth,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: 'width 0.15s ease-in-out',
            // Collapsed, the panel floats above the content so its hover
            // width-animation never participates in layout.
            ...(isSidebarCollapsed
              ? {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  bottom: 0,
                  zIndex: 40,
                  ...(isSidebarPeeking
                    ? { boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)' }
                    : {}),
                }
              : {}),
          }}
        >
          {/* Logo Section. While peeking, the toggle stays in the rail's icon column
              (left) rather than sliding to the widened panel's right edge, so it
              doesn't move under the user's cursor when the sidebar expands. */}
          <div
            className={`px-4 pt-4 pb-3 flex items-center ${
              isSidebarIconOnly ? 'justify-center' : isSidebarPeeking ? 'justify-start' : 'justify-between'
            }`}
            style={{ flexShrink: 0 }}
          >
            {!isSidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-blue-600">OptimalAssign</h1>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              title={isSidebarCollapsed ? 'Expand menu' : 'Collapse menu'}
              aria-label={isSidebarCollapsed ? 'Expand menu' : 'Collapse menu'}
            >
              {isSidebarCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
            </Button>
          </div>

          {/* Context Section: Business & Week */}
          {!isSidebarCollapsed && (
            <div className="mx-2 mb-3 bg-neutral-50 rounded-lg p-2 space-y-2" style={{ flexShrink: 0 }}>
              {/* Business Selector */}
              {currentBusiness && (
                <div>
                  <BusinessSelector />
                </div>
              )}

              {/* Week Display */}
              {selectedWeek && (
                <div>
                  <WeekDisplay />
                </div>
              )}
            </div>
          )}

        {/* Navigation Tabs */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <Tabs value={activeTab} onValueChange={handleTabChange} orientation="vertical">
            <TabsList orientation="vertical" className="!bg-white h-full !p-2 !w-full">
              {navItems.map((item, index) => {
                const prev = navItems[index - 1];
                const startsGroup = prev && prev.group !== item.group;

                return (
                  <Fragment key={item.value}>
                    {startsGroup && (
                      <div className="my-2 px-3 w-full">
                        <div className="border-t border-neutral-200"></div>
                        {!isSidebarIconOnly && (
                          <p className="text-xs text-neutral-500 mt-2 mb-1">
                            {item.group === 'dev' ? 'Development Features' : 'Hardcoded Features'}
                          </p>
                        )}
                      </div>
                    )}
                    <TabsTrigger
                      value={item.value}
                      className={navTriggerClassName}
                      {...navTriggerLabelProps(t(item.label))}
                      style={activeTab === item.value ? {
                        backgroundColor: '#eff6ff',
                        color: '#2563eb',
                        borderLeft: '4px solid #2563eb'
                      } : {}}
                    >
                      <NavIcon item={item} />
                      {renderNavLabel(t(item.label))}
                    </TabsTrigger>
                  </Fragment>
                );
              })}
            </TabsList>
          </Tabs>
        </div>

        {/* Bottom Section: Help, User Info, and Logout */}
        <div className="border-t border-neutral-200 p-3" style={{ flexShrink: 0 }}>
          {/* Toggle Legacy UI Button - Only in development mode */}
          {FEATURE_FLAGS.showLegacyUIToggle && (
            <Button
              variant="ghost"
              onClick={toggleLegacyUI}
              className={
                isSidebarIconOnly
                  ? "w-full justify-center gap-2 mb-2 px-0"
                  : "w-full justify-start gap-2 mb-2"
              }
              {...navTriggerLabelProps(showLegacyUI ? 'Hide Hardcoded' : 'Show Hardcoded')}
            >
              {showLegacyUI ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
              {renderNavLabel(showLegacyUI ? 'Hide Hardcoded' : 'Show Hardcoded')}
            </Button>
          )}

          {/* Help Button - Only in development mode */}
          {IS_DEVELOPMENT && (
            <Button
              variant="ghost"
              onClick={() => setShowOnboarding(true)}
              className={
                isSidebarIconOnly
                  ? "w-full justify-center gap-2 mb-2 px-0"
                  : "w-full justify-start gap-2 mb-2"
              }
              {...navTriggerLabelProps(t('nav.help'))}
            >
              <HelpCircle className="w-4 h-4" />
              {renderNavLabel(t('nav.help'))}
            </Button>
          )}

          {/* User Info */}
          {!isSidebarCollapsed && (
            <div className="px-3 py-2 mb-2">
              <p className="font-medium text-neutral-900 text-sm">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-neutral-500 text-xs">{user?.role}</p>
              {IS_DEVELOPMENT && (
                <p className="text-blue-600 text-xs mt-1">Dev Mode</p>
              )}
            </div>
          )}

          {/* Region / locale switcher */}
          <div className="mb-2">
            <RegionSelector compact={isSidebarIconOnly} />
          </div>

          {/* Logout Button */}
          <Button
            variant="ghost"
            onClick={handleLogout}
            className={
              isSidebarIconOnly
                ? "w-full justify-center gap-2 px-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                : "w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
            }
            {...navTriggerLabelProps(t('nav.signOut'))}
          >
            <LogOut className="w-4 h-4" />
            {renderNavLabel(t('nav.signOut'))}
          </Button>
        </div>
      </div>
        )}

        {/* Content container - scrollable, incl. horizontally on narrow/mobile viewports */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {/* Main Content Area. On desktop a min-width keeps wide tables from
              squeezing, and anything wider than the viewport scrolls within this
              pane. On mobile there is no wider viewport to scroll into, so the
              floor is dropped and content is expected to fit the phone instead. */}
          <div
            className={isMobile ? 'p-3' : 'p-6'}
            style={{ minWidth: isMobile ? undefined : `${MAIN_CONTENT_MIN_WIDTH}px` }}
          >
            <Routes>
              {/* Default route - redirect to schedule in production, inputs in dev */}
              <Route path="/" element={IS_PRODUCTION ? <ScheduleView /> : <InputsHub />} />

              {/* BACKEND-INTEGRATED FEATURES - Available in production */}
              {FEATURE_FLAGS.showSchedule && (
                <>
                  <Route path="/schedule/new" element={<ScheduleView />} />
                  {/* Before /schedule/:id, which would otherwise match "event" as an id. */}
                  <Route path="/schedule/event/:eventId" element={<ScheduleView />} />
                  <Route path="/schedule/:id" element={<ScheduleView />} />
                  <Route path="/schedule" element={<ScheduleView />} />
                </>
              )}
              {FEATURE_FLAGS.showForecast && (
                <Route path="/forecast" element={<SalesForecast />} />
              )}
              {FEATURE_FLAGS.showConstraints && (
                <Route path="/rules" element={<ConstraintsEditor />} />
              )}
              {FEATURE_FLAGS.showEmployees && (
                <Route path="/employees" element={<EmployeeManager />} />
              )}
              <Route path="/team" element={<TeamPanel />} />
              {FEATURE_FLAGS.showTimeoff && (
                <Route path="/requests" element={<RequestsPanel />} />
              )}

              {/* DEVELOPMENT-ONLY FEATURES */}
              {FEATURE_FLAGS.showOptimizationWorkflow && (
                <>
                  <Route path="/inputs" element={<InputsHub />} />
                  <Route path="/inputs/demand" element={<DemandInput />} />
                  <Route path="/inputs/workers" element={<WorkersInput />} />
                  <Route path="/inputs/constraints" element={<ConstraintsInput />} />
                  <Route path="/optimize" element={<OptimizeScreen />} />
                  <Route path="/results" element={<ResultsScreen />} />
                </>
              )}
              {FEATURE_FLAGS.showDashboard && (
                <Route path="/dashboard" element={<DashboardView />} />
              )}
              {FEATURE_FLAGS.showAlerts && (
                <Route path="/alerts" element={<AlertsPanel />} />
              )}
              {FEATURE_FLAGS.showAnalytics && (
                <Route path="/analytics" element={<Analytics />} />
              )}
            </Routes>
          </div>
        </div>

        {/* Mobile Bottom Navigation Bar. Horizontally scrollable: in dev mode
            there are up to 11 destinations, far more than fit across a phone,
            and squeezing them all in would leave unreadable icons with no
            labels rather than a strip you can swipe. */}
        {isMobile && (
          <div
            className="bg-white border-t-2 border-neutral-300"
            style={{
              flexShrink: 0,
              // Clears the iOS home indicator / Android gesture bar so the last
              // row of tabs stays tappable.
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList
                className="!bg-white !rounded-none !h-auto !p-0 !w-full !justify-start"
                style={{ overflowX: 'auto', overflowY: 'hidden' }}
              >
                {navItems.map((item) => (
                  <TabsTrigger
                    key={item.value}
                    value={item.value}
                    aria-label={t(item.label)}
                    className="!flex-none !flex-col !rounded-none !gap-1 !px-1 !py-2 !h-auto !border-0 !border-t-2 !border-t-transparent text-neutral-600 data-[state=active]:!border-t-blue-600 data-[state=active]:!text-blue-600 data-[state=active]:!bg-blue-50"
                    style={{ width: `${MOBILE_NAV_ITEM_WIDTH}px` }}
                  >
                    <NavIcon item={item} />
                    {/* Labels stay legible rather than truncating: the strip
                        scrolls, so a long title costs scroll distance, not
                        readability. */}
                    <span className="text-[11px] leading-none whitespace-nowrap">{t(item.label)}</span>
                  </TabsTrigger>
                ))}

                {/* Not a tab — the sidebar footer's account actions, which have
                    no route of their own. */}
                <button
                  type="button"
                  onClick={() => setIsMobileMoreOpen(true)}
                  aria-label="More"
                  className="flex-none flex flex-col items-center justify-center gap-1 px-1 py-2 border-t-2 border-t-transparent text-neutral-600 hover:bg-neutral-50"
                  style={{ width: `${MOBILE_NAV_ITEM_WIDTH}px` }}
                >
                  <MoreHorizontal className="w-5 h-5" />
                  <span className="text-[11px] leading-none whitespace-nowrap">More</span>
                </button>
              </TabsList>
            </Tabs>
          </div>
        )}

        {/* Mobile "More" sheet: user identity plus the actions that live in the
            sidebar footer on desktop. */}
        {isMobile && isMobileMoreOpen && (
          <div
            className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50"
            onClick={() => setIsMobileMoreOpen(false)}
          >
            <div
              className="bg-white rounded-t-xl p-4"
              style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0">
                  <p className="font-medium text-neutral-900 text-sm">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-neutral-500 text-xs">{user?.role}</p>
                  {IS_DEVELOPMENT && (
                    <p className="text-blue-600 text-xs mt-1">Dev Mode</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMobileMoreOpen(false)}
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Toggle Legacy UI Button - Only in development mode */}
              {FEATURE_FLAGS.showLegacyUIToggle && (
                <Button
                  variant="ghost"
                  onClick={toggleLegacyUI}
                  className="w-full justify-start gap-2 mb-2"
                >
                  {showLegacyUI ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                  <span>{showLegacyUI ? 'Hide Hardcoded' : 'Show Hardcoded'}</span>
                </Button>
              )}

              {/* Help Button - Only in development mode */}
              {IS_DEVELOPMENT && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowOnboarding(true);
                    setIsMobileMoreOpen(false);
                  }}
                  className="w-full justify-start gap-2 mb-2"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>{t('nav.help')}</span>
                </Button>
              )}

              <div className="mb-2">
                <RegionSelector />
              </div>

              <Button
                variant="ghost"
                onClick={handleLogout}
                className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" />
                <span>{t('nav.signOut')}</span>
              </Button>
            </div>
          </div>
        )}

        {/* Onboarding Modal */}
        {showOnboarding && (
          <OnboardingWalkthrough onClose={() => setShowOnboarding(false)} />
        )}

        {/* Initial Week Selection Modal */}
        {showWeekSelector && (
          <div className="size-full flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full p-6">
              <div className="bg-white rounded-lg shadow-md p-6 mb-4">
                <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                  Staffing Schedules
                </h1>
                <p className="text-gray-600 mb-4">
                  Select a week to view schedules and forecasts
                </p>

                {selectedWeek && (
                  <div className="mb-4 p-4 bg-blue-50 rounded-md border border-blue-200">
                    <div className="text-sm text-gray-600 mb-1">Viewing week:</div>
                    <div className="font-medium text-gray-900">
                      {formatDate(selectedWeek.startDate)} - {formatDate(selectedWeek.endDate)}
                    </div>
                  </div>
                )}

                {selectedWeek ? (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsOpen(true)}
                      className="flex-1 flex items-center justify-center gap-2"
                    >
                      <Calendar className="size-4" />
                      Change Week
                    </Button>
                    <Button
                      onClick={handleConfirmWeek}
                      className="flex-1"
                    >
                      Confirm
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => setIsOpen(true)}
                    className="w-full flex items-center justify-center gap-2"
                  >
                    <Calendar className="size-4" />
                    Select Week
                  </Button>
                )}
              </div>

              {/* Popup Widget */}
              {isOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="relative">
                    <button
                      onClick={() => setIsOpen(false)}
                      className="absolute -top-2 -right-2 size-8 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 transition-colors z-10"
                    >
                      <span className="text-gray-600 text-xl leading-none">×</span>
                    </button>
                    <WeekSelector
                      onWeekSelect={handleWeekSelect}
                      initialWeekStart={selectedWeek?.startDate}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
