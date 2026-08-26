import { useState, useEffect, useRef } from "react";
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
  CalendarCheck
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
import { useRequestsPendingCount } from "./hooks/useRequestsPendingCount";
import { WeekSelector } from "./components/WeekSelector";
import { WeekDisplay } from "./components/WeekDisplay";
import { useAuth } from "./contexts/AuthContext";
import { OptimizationProvider } from "./contexts/OptimizationContext";
import { WeekProvider, useWeek } from "./contexts/WeekContext";
import { BusinessProvider, useBusiness } from "./contexts/BusinessContext";
import { BusinessSelector } from "./components/BusinessSelector";
import { IS_PRODUCTION, IS_DEVELOPMENT, FEATURE_FLAGS } from "./config/environment";

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
  const pendingRequestsCount = useRequestsPendingCount();
  const [showWeekSelector, setShowWeekSelector] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
  });

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

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

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
      <div className="bg-neutral-50" style={{ height: '100vh', display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* While collapsed the sidebar is taken out of flow (see below) and this
            spacer holds its 64px footprint. It stays mounted for the whole
            collapsed state, not just during the peek: if it unmounted the moment
            the peek ended, the sidebar would rejoin the flex row still mid
            width-animation and squeeze the content pane for those 150ms. */}
        {isSidebarCollapsed && <div style={{ width: `${SIDEBAR_RAIL_WIDTH}px`, flexShrink: 0 }} />}

        {/* Vertical Navigation Sidebar - Fixed */}
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
              {/* BACKEND-INTEGRATED FEATURES - Available in production */}
              {FEATURE_FLAGS.showSchedule && (
                <TabsTrigger
                  value="schedule"
                  className={navTriggerClassName}
                  {...navTriggerLabelProps('Schedule')}
                  style={activeTab === "schedule" ? {
                    backgroundColor: '#eff6ff',
                    color: '#2563eb',
                    borderLeft: '4px solid #2563eb'
                  } : {}}
                >
                  <Calendar className="w-5 h-5" />
                  {renderNavLabel('Schedule')}
                </TabsTrigger>
              )}

              {FEATURE_FLAGS.showForecast && (
                <TabsTrigger
                  value="forecast"
                  className={navTriggerClassName}
                  {...navTriggerLabelProps('Forecast')}
                  style={activeTab === "forecast" ? {
                    backgroundColor: '#eff6ff',
                    color: '#2563eb',
                    borderLeft: '4px solid #2563eb'
                  } : {}}
                >
                  <TrendingUp className="w-5 h-5" />
                  {renderNavLabel('Forecast')}
                </TabsTrigger>
              )}

              {FEATURE_FLAGS.showConstraints && (
                <TabsTrigger
                  value="rules"
                  className={navTriggerClassName}
                  {...navTriggerLabelProps('Rules')}
                  style={activeTab === "rules" ? {
                    backgroundColor: '#eff6ff',
                    color: '#2563eb',
                    borderLeft: '4px solid #2563eb'
                  } : {}}
                >
                  <Bolt className="w-5 h-5" />
                  {renderNavLabel('Rules')}
                </TabsTrigger>
              )}

              {FEATURE_FLAGS.showEmployees && (
                <TabsTrigger
                  value="employees"
                  className={navTriggerClassName}
                  {...navTriggerLabelProps('Employees')}
                  style={activeTab === "employees" ? {
                    backgroundColor: '#eff6ff',
                    color: '#2563eb',
                    borderLeft: '4px solid #2563eb'
                  } : {}}
                >
                  <Users className="w-5 h-5" />
                  {renderNavLabel('Employees')}
                </TabsTrigger>
              )}

              {FEATURE_FLAGS.showTimeoff && (
                <TabsTrigger
                  value="requests"
                  className={navTriggerClassName}
                  {...navTriggerLabelProps('Requests')}
                  style={activeTab === "requests" ? {
                    backgroundColor: '#eff6ff',
                    color: '#2563eb',
                    borderLeft: '4px solid #2563eb'
                  } : {}}
                >
                  <div className="relative shrink-0">
                    <CalendarCheck className="w-5 h-5" />
                    {pendingRequestsCount > 0 && (
                      <span
                        className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] leading-none font-medium"
                        aria-label={`${pendingRequestsCount} pending requests`}
                      >
                        {pendingRequestsCount > 99 ? '99+' : pendingRequestsCount}
                      </span>
                    )}
                  </div>
                  {renderNavLabel('Requests')}
                </TabsTrigger>
              )}

              {/* DEVELOPMENT-ONLY FEATURES */}
              {IS_DEVELOPMENT && (
                <>
                  {/* Divider for dev features */}
                  <div className="my-2 px-3">
                    <div className="border-t border-neutral-200"></div>
                    {!isSidebarIconOnly && (
                      <p className="text-xs text-neutral-500 mt-2 mb-1">Development Features</p>
                    )}
                  </div>

                  {/* NEW OPTIMIZATION WORKFLOW - Development only */}
                  <TabsTrigger
                    value="inputs"
                    className={navTriggerClassName}
                    {...navTriggerLabelProps('Inputs')}
                    style={activeTab === "inputs" ? {
                      backgroundColor: '#eff6ff',
                      color: '#2563eb',
                      borderLeft: '4px solid #2563eb'
                    } : {}}
                  >
                    <FileInput className="w-5 h-5" />
                    {renderNavLabel('Inputs')}
                  </TabsTrigger>
                  <TabsTrigger
                    value="optimize"
                    className={navTriggerClassName}
                    {...navTriggerLabelProps('Optimize')}
                    style={activeTab === "optimize" ? {
                      backgroundColor: '#eff6ff',
                      color: '#2563eb',
                      borderLeft: '4px solid #2563eb'
                    } : {}}
                  >
                    <Zap className="w-5 h-5" />
                    {renderNavLabel('Optimize')}
                  </TabsTrigger>
                  <TabsTrigger
                    value="results"
                    className={navTriggerClassName}
                    {...navTriggerLabelProps('Results')}
                    style={activeTab === "results" ? {
                      backgroundColor: '#eff6ff',
                      color: '#2563eb',
                      borderLeft: '4px solid #2563eb'
                    } : {}}
                  >
                    <BarChart2 className="w-5 h-5" />
                    {renderNavLabel('Results')}
                  </TabsTrigger>

                  {/* Hardcoded features - Development only, with toggle */}
                  {showLegacyUI && (
                    <>
                      <div className="my-2 px-3">
                        <div className="border-t border-neutral-200"></div>
                        {!isSidebarIconOnly && (
                          <p className="text-xs text-neutral-500 mt-2 mb-1">Hardcoded Features</p>
                        )}
                      </div>

                      <TabsTrigger
                        value="dashboard"
                        className={navTriggerClassName}
                        {...navTriggerLabelProps('Dashboard')}
                        style={activeTab === "dashboard" ? {
                          backgroundColor: '#eff6ff',
                          color: '#2563eb',
                          borderLeft: '4px solid #2563eb'
                        } : {}}
                      >
                        <Home className="w-5 h-5" />
                        {renderNavLabel('Dashboard')}
                      </TabsTrigger>
                      <TabsTrigger
                        value="alerts"
                        className={navTriggerClassName}
                        {...navTriggerLabelProps('Alerts')}
                        style={activeTab === "alerts" ? {
                          backgroundColor: '#eff6ff',
                          color: '#2563eb',
                          borderLeft: '4px solid #2563eb'
                        } : {}}
                      >
                        <AlertTriangle className="w-5 h-5" />
                        {renderNavLabel('Alerts')}
                      </TabsTrigger>
                      <TabsTrigger
                        value="analytics"
                        className={navTriggerClassName}
                        {...navTriggerLabelProps('Analytics')}
                        style={activeTab === "analytics" ? {
                          backgroundColor: '#eff6ff',
                          color: '#2563eb',
                          borderLeft: '4px solid #2563eb'
                        } : {}}
                      >
                        <PieChart className="w-5 h-5" />
                        {renderNavLabel('Analytics')}
                      </TabsTrigger>
                    </>
                  )}
                </>
              )}
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
              {...navTriggerLabelProps('Help')}
            >
              <HelpCircle className="w-4 h-4" />
              {renderNavLabel('Help')}
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

          {/* Logout Button */}
          <Button
            variant="ghost"
            onClick={handleLogout}
            className={
              isSidebarIconOnly
                ? "w-full justify-center gap-2 px-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                : "w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
            }
            {...navTriggerLabelProps('Logout')}
          >
            <LogOut className="w-4 h-4" />
            {renderNavLabel('Logout')}
          </Button>
        </div>
      </div>

        {/* Right side container for content - scrollable, incl. horizontally on narrow/mobile viewports */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {/* Main Content Area - min-width keeps schedule time-block cells (e.g. "00:00") readable;
              content wider than the viewport scrolls within this pane instead of squeezing. */}
          <div className="p-6" style={{ minWidth: `${MAIN_CONTENT_MIN_WIDTH}px` }}>
            <Routes>
              {/* Default route - redirect to schedule in production, inputs in dev */}
              <Route path="/" element={IS_PRODUCTION ? <ScheduleView /> : <InputsHub />} />

              {/* BACKEND-INTEGRATED FEATURES - Available in production */}
              {FEATURE_FLAGS.showSchedule && (
                <>
                  <Route path="/schedule/new" element={<ScheduleView />} />
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
