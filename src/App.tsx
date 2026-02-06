import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Routes, Route } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Button } from "./components/ui/button";
import { FileInput, Zap, BarChart2, HelpCircle, LogOut, Calendar, Home, TrendingUp, AlertTriangle, PieChart, Users, ToggleLeft, ToggleRight } from "lucide-react";
import { DashboardView } from "./components/DashboardView";
import { ScheduleView } from "./components/ScheduleView";
import { SalesForecast } from "./components/SalesForecast";
import { ConstraintsEditor } from "./components/ConstraintsEditor";
import { AlertsPanel } from "./components/AlertsPanel";
import { Analytics } from "./components/Analytics";
import { OnboardingWalkthrough } from "./components/OnboardingWalkthrough";
import { EmployeeManager } from "./components/EmployeeManager";
import { useAuth } from "./contexts/AuthContext";
import { OptimizationProvider } from "./contexts/OptimizationContext";

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
    const newValue = !showLegacyUI;
    setShowLegacyUI(newValue);
    localStorage.setItem(LEGACY_UI_KEY, String(newValue));
  };

  // Get current tab from URL path
  const getCurrentTab = () => {
    const path = location.pathname.slice(1); // Remove leading slash
    // Handle nested routes like /schedule/new or /schedule/:id
    const basePath = path.split('/')[0];
    const tab = basePath || "inputs"; // Default to inputs instead of dashboard
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
    <OptimizationProvider>
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
          <div className="p-4 border-b border-neutral-200" style={{ flexShrink: 0 }}>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-blue-600">OptimalAssign</h1>
              <p className="text-xs text-neutral-500 mt-1">Mathematically optimal labor scheduling</p>
            </div>
          </div>

        {/* Navigation Tabs */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <Tabs value={activeTab} onValueChange={handleTabChange} orientation="vertical">
            <TabsList orientation="vertical" className="!bg-white h-full !p-2 !w-full">
              {/* NEW SIMPLIFIED NAV */}
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

              {/* LEGACY SHIFT OPTIMIZER TABS - Conditionally shown */}
              {showLegacyUI && (
                <>
                  <div className="my-2 px-3">
                    <div className="border-t border-neutral-200"></div>
                    <p className="text-xs text-neutral-500 mt-2 mb-1">Legacy Features</p>
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
                  <TabsTrigger
                    value="constraints"
                    className="w-full"
                    style={activeTab === "constraints" ? {
                      backgroundColor: '#eff6ff',
                      color: '#2563eb',
                      borderLeft: '4px solid #2563eb'
                    } : {}}
                  >
                    <AlertTriangle className="w-5 h-5" />
                    <span>Constraints</span>
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
                </>
              )}
            </TabsList>
          </Tabs>
        </div>

        {/* Bottom Section: Help, User Info, and Logout */}
        <div className="border-t border-neutral-200 p-3" style={{ flexShrink: 0 }}>
          {/* Toggle Legacy UI Button */}
          <Button
            variant="ghost"
            onClick={toggleLegacyUI}
            className="w-full justify-start gap-2 mb-2"
          >
            {showLegacyUI ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
            {showLegacyUI ? 'Hide Legacy UI' : 'Show Legacy UI'}
          </Button>

          {/* Help Button */}
          <Button
            variant="ghost"
            onClick={() => setShowOnboarding(true)}
            className="w-full justify-start gap-2 mb-2"
          >
            <HelpCircle className="w-4 h-4" />
            Help
          </Button>

          {/* User Info */}
          <div className="px-3 py-2 mb-2">
            <p className="font-medium text-neutral-900 text-sm">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-neutral-500 text-xs">{user?.role}</p>
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
              {/* NEW OPTIMIZATION WORKFLOW - Default routes */}
              <Route path="/" element={<InputsHub />} />
              <Route path="/inputs" element={<InputsHub />} />
              <Route path="/inputs/demand" element={<DemandInput />} />
              <Route path="/inputs/workers" element={<WorkersInput />} />
              <Route path="/inputs/constraints" element={<ConstraintsInput />} />
              <Route path="/optimize" element={<OptimizeScreen />} />
              <Route path="/results" element={<ResultsScreen />} />

              {/* HIDDEN OLD FEATURES (still accessible via direct URL) */}
              <Route path="/dashboard" element={<DashboardView />} />
              <Route path="/schedule/new" element={<ScheduleView />} />
              <Route path="/schedule/:id" element={<ScheduleView />} />
              <Route path="/schedule" element={<ScheduleView />} />
              <Route path="/forecast" element={<SalesForecast />} />
              <Route path="/constraints" element={<ConstraintsEditor />} />
              <Route path="/alerts" element={<AlertsPanel />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/employees" element={<EmployeeManager />} />
            </Routes>
          </div>
        </div>

        {/* Onboarding Modal */}
        {showOnboarding && (
          <OnboardingWalkthrough onClose={() => setShowOnboarding(false)} />
        )}
      </div>
    </OptimizationProvider>
  );
}
