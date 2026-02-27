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
  Bolt
} from "lucide-react";
import { DashboardView } from "./components/DashboardView";
import { ScheduleView } from "./components/ScheduleView";
import { SalesForecast } from "./components/SalesForecast";
import { ConstraintsEditor } from "./components/ConstraintsEditor";
import { AlertsPanel } from "./components/AlertsPanel";
import { Analytics } from "./components/Analytics";
import { OnboardingWalkthrough } from "./components/OnboardingWalkthrough";
import { EmployeeManager } from "./components/EmployeeManager";
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
  const [showWeekSelector, setShowWeekSelector] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

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
      <div className="bg-neutral-50" style={{ height: '100vh', display: 'flex', overflow: 'hidden' }}>
        {/* Vertical Navigation Sidebar - Fixed */}
        <div
          className="bg-white"
          style={{
            borderRight: '2px solid #d4d4d4',
            width: 'auto',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* Logo Section */}
          <div className="px-4 pt-6 pb-4" style={{ flexShrink: 0 }}>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-blue-600">OptimalAssign</h1>
              <p className="text-xs text-neutral-500 mt-1">Mathematically optimal labor scheduling</p>
            </div>
          </div>

          {/* Context Section: Business & Week */}
          <div className="mx-3 mb-4 bg-neutral-50 rounded-lg p-3 space-y-3" style={{ flexShrink: 0 }}>
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

        {/* Navigation Tabs */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <Tabs value={activeTab} onValueChange={handleTabChange} orientation="vertical">
            <TabsList orientation="vertical" className="!bg-white h-full !p-2 !w-full">
              {/* BACKEND-INTEGRATED FEATURES - Available in production */}
              {FEATURE_FLAGS.showSchedule && (
                <TabsTrigger
                  value="schedule"
                  className="w-full"
                  style={activeTab === "schedule" ? {
                    backgroundColor: '#eff6ff',
                    color: '#2563eb',
                    borderLeft: '4px solid #2563eb'
                  } : {}}
                >
                  <Calendar className="w-5 h-5" />
                  <span>Schedule</span>
                </TabsTrigger>
              )}

              {FEATURE_FLAGS.showForecast && (
                <TabsTrigger
                  value="forecast"
                  className="w-full"
                  style={activeTab === "forecast" ? {
                    backgroundColor: '#eff6ff',
                    color: '#2563eb',
                    borderLeft: '4px solid #2563eb'
                  } : {}}
                >
                  <TrendingUp className="w-5 h-5" />
                  <span>Forecast</span>
                </TabsTrigger>
              )}

              {FEATURE_FLAGS.showConstraints && (
                <TabsTrigger
                  value="constraints"
                  className="w-full"
                  style={activeTab === "constraints" ? {
                    backgroundColor: '#eff6ff',
                    color: '#2563eb',
                    borderLeft: '4px solid #2563eb'
                  } : {}}
                >
                  <Bolt className="w-5 h-5" />
                  <span>Rules</span>
                </TabsTrigger>
              )}

              {FEATURE_FLAGS.showEmployees && (
                <TabsTrigger
                  value="employees"
                  className="w-full"
                  style={activeTab === "employees" ? {
                    backgroundColor: '#eff6ff',
                    color: '#2563eb',
                    borderLeft: '4px solid #2563eb'
                  } : {}}
                >
                  <Users className="w-5 h-5" />
                  <span>Employees</span>
                </TabsTrigger>
              )}

              {/* DEVELOPMENT-ONLY FEATURES */}
              {IS_DEVELOPMENT && (
                <>
                  {/* Divider for dev features */}
                  <div className="my-2 px-3">
                    <div className="border-t border-neutral-200"></div>
                    <p className="text-xs text-neutral-500 mt-2 mb-1">Development Features</p>
                  </div>

                  {/* NEW OPTIMIZATION WORKFLOW - Development only */}
                  <TabsTrigger
                    value="inputs"
                    className="w-full"
                    style={activeTab === "inputs" ? {
                      backgroundColor: '#eff6ff',
                      color: '#2563eb',
                      borderLeft: '4px solid #2563eb'
                    } : {}}
                  >
                    <FileInput className="w-5 h-5" />
                    <span>Inputs</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="optimize"
                    className="w-full"
                    style={activeTab === "optimize" ? {
                      backgroundColor: '#eff6ff',
                      color: '#2563eb',
                      borderLeft: '4px solid #2563eb'
                    } : {}}
                  >
                    <Zap className="w-5 h-5" />
                    <span>Optimize</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="results"
                    className="w-full"
                    style={activeTab === "results" ? {
                      backgroundColor: '#eff6ff',
                      color: '#2563eb',
                      borderLeft: '4px solid #2563eb'
                    } : {}}
                  >
                    <BarChart2 className="w-5 h-5" />
                    <span>Results</span>
                  </TabsTrigger>

                  {/* Hardcoded features - Development only, with toggle */}
                  {showLegacyUI && (
                    <>
                      <div className="my-2 px-3">
                        <div className="border-t border-neutral-200"></div>
                        <p className="text-xs text-neutral-500 mt-2 mb-1">Hardcoded Features</p>
                      </div>

                      <TabsTrigger
                        value="dashboard"
                        className="w-full"
                        style={activeTab === "dashboard" ? {
                          backgroundColor: '#eff6ff',
                          color: '#2563eb',
                          borderLeft: '4px solid #2563eb'
                        } : {}}
                      >
                        <Home className="w-5 h-5" />
                        <span>Dashboard</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="alerts"
                        className="w-full"
                        style={activeTab === "alerts" ? {
                          backgroundColor: '#eff6ff',
                          color: '#2563eb',
                          borderLeft: '4px solid #2563eb'
                        } : {}}
                      >
                        <AlertTriangle className="w-5 h-5" />
                        <span>Alerts</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="analytics"
                        className="w-full"
                        style={activeTab === "analytics" ? {
                          backgroundColor: '#eff6ff',
                          color: '#2563eb',
                          borderLeft: '4px solid #2563eb'
                        } : {}}
                      >
                        <PieChart className="w-5 h-5" />
                        <span>Analytics</span>
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
              className="w-full justify-start gap-2 mb-2"
            >
              {showLegacyUI ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
              {showLegacyUI ? 'Hide Hardcoded' : 'Show Hardcoded'}
            </Button>
          )}

          {/* Help Button - Only in development mode */}
          {IS_DEVELOPMENT && (
            <Button
              variant="ghost"
              onClick={() => setShowOnboarding(true)}
              className="w-full justify-start gap-2 mb-2"
            >
              <HelpCircle className="w-4 h-4" />
              Help
            </Button>
          )}

          {/* User Info */}
          <div className="px-3 py-2 mb-2">
            <p className="font-medium text-neutral-900 text-sm">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-neutral-500 text-xs">{user?.role}</p>
            {IS_DEVELOPMENT && (
              <p className="text-blue-600 text-xs mt-1">Dev Mode</p>
            )}
          </div>

          {/* Logout Button */}
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </div>

        {/* Right side container for content */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {/* Main Content Area - Scrollable */}
          <div className="p-6">
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
                <Route path="/constraints" element={<ConstraintsEditor />} />
              )}
              {FEATURE_FLAGS.showEmployees && (
                <Route path="/employees" element={<EmployeeManager />} />
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
