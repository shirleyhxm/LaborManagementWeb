import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Routes, Route } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Button } from "./components/ui/button";
import { Users, TrendingUp, Settings, Bell, BarChart3, HelpCircle, LogOut, Calendar } from "lucide-react";
import { DashboardView } from "./components/DashboardView";
import { ScheduleView } from "./components/ScheduleView";
import { SalesForecast } from "./components/SalesForecast";
import { ConstraintsEditor } from "./components/ConstraintsEditor";
import { AlertsPanel } from "./components/AlertsPanel";
import { Analytics } from "./components/Analytics";
import { OnboardingWalkthrough } from "./components/OnboardingWalkthrough";
import { EmployeeManager } from "./components/EmployeeManager";
import { useAuth } from "./contexts/AuthContext";

export default function App() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  // Remember the last schedule sub-URL when switching tabs
  const lastSchedulePathRef = useRef<string>('/schedule');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Get current tab from URL path
  const getCurrentTab = () => {
    const path = location.pathname.slice(1); // Remove leading slash
    // Handle nested routes like /schedule/new or /schedule/:id
    const basePath = path.split('/')[0];
    return basePath || "dashboard";
  };

  const activeTab = getCurrentTab();

  // Track and save the last schedule path when on a schedule route
  useEffect(() => {
    if (location.pathname.startsWith('/schedule')) {
      lastSchedulePathRef.current = location.pathname;
    }
  }, [location.pathname]);

  // Navigate to tab
  const handleTabChange = (value: string) => {
    if (value === "dashboard") {
      navigate('/');
    } else if (value === "schedule") {
      // Navigate to the last remembered schedule path
      navigate(lastSchedulePathRef.current);
    } else {
      navigate(`/${value}`);
    }
  };

  return (
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
          <img
            src="/logo.svg"
            alt="ShiftOptimizer Logo"
            className="w-full h-auto"
            style={{ maxWidth: '160px' }}
          />
        </div>

        {/* Navigation Tabs */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <Tabs value={activeTab} onValueChange={handleTabChange} orientation="vertical">
            <TabsList orientation="vertical" className="!bg-white h-full !p-2">
              <TabsTrigger
                value="dashboard"
                style={activeTab === "dashboard" ? {
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                  borderLeft: '4px solid #2563eb'
                } : {}}
              >
                <BarChart3 className="w-5 h-5" />
                <span>Dashboard</span>
              </TabsTrigger>
              <TabsTrigger
                value="schedule"
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
                style={activeTab === "constraints" ? {
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                  borderLeft: '4px solid #2563eb'
                } : {}}
              >
                <Settings className="w-5 h-5" />
                <span>Rules</span>
              </TabsTrigger>
              <TabsTrigger
                value="alerts"
                style={activeTab === "alerts" ? {
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                  borderLeft: '4px solid #2563eb'
                } : {}}
              >
                <Bell className="w-5 h-5" />
                <span>Alerts</span>
              </TabsTrigger>
              <TabsTrigger
                value="analytics"
                style={activeTab === "analytics" ? {
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                  borderLeft: '4px solid #2563eb'
                } : {}}
              >
                <BarChart3 className="w-5 h-5" />
                <span>Analytics</span>
              </TabsTrigger>
              <TabsTrigger
                value="employees"
                style={activeTab === "employees" ? {
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                  borderLeft: '4px solid #2563eb'
                } : {}}
              >
                <Users className="w-5 h-5" />
                <span>Employees</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Bottom Section: Help, User Info, and Logout */}
        <div className="border-t border-neutral-200 p-3" style={{ flexShrink: 0 }}>
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
          {activeTab === "dashboard" && <DashboardView />}
          {activeTab === "schedule" && (
            <Routes>
              <Route path="/schedule/new" element={<ScheduleView />} />
              <Route path="/schedule/:id" element={<ScheduleView />} />
              <Route path="/schedule" element={<ScheduleView />} />
            </Routes>
          )}
          {activeTab === "forecast" && <SalesForecast />}
          {activeTab === "constraints" && <ConstraintsEditor />}
          {activeTab === "alerts" && <AlertsPanel />}
          {activeTab === "analytics" && <Analytics />}
          {activeTab === "employees" && <EmployeeManager />}
        </div>
      </div>

      {/* Onboarding Modal */}
      {showOnboarding && (
        <OnboardingWalkthrough onClose={() => setShowOnboarding(false)} />
      )}
    </div>
  );
}
