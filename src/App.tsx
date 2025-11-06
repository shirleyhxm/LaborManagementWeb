import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Button } from "./components/ui/button";
import { Switch } from "./components/ui/switch";
import { Label } from "./components/ui/label";
import { Users, Calendar, TrendingUp, Settings, Bell, BarChart3, HelpCircle } from "lucide-react";
import { DashboardView } from "./components/DashboardView";
import { ScheduleView } from "./components/ScheduleView";
import { SalesForecast } from "./components/SalesForecast";
import { EmployeePortal } from "./components/EmployeePortal";
import { ConstraintsEditor } from "./components/ConstraintsEditor";
import { AlertsPanel } from "./components/AlertsPanel";
import { Analytics } from "./components/Analytics";
import { OnboardingWalkthrough } from "./components/OnboardingWalkthrough";
import { EmployeeManager } from "./components/EmployeeManager";

export default function App() {
  const [viewMode, setViewMode] = useState<"manager" | "employee">("manager");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Get current tab from URL path
  const getCurrentTab = () => {
    const path = location.pathname.slice(1); // Remove leading slash
    return path || "dashboard";
  };

  const activeTab = getCurrentTab();

  // Navigate to tab
  const handleTabChange = (value: string) => {
    navigate(`/${value === "dashboard" ? "" : value}`);
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-neutral-900">ShiftOptimizer</h1>
              <p className="text-neutral-500 text-sm">Smart Scheduling System</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <Button
              variant="ghost"
              onClick={() => setShowOnboarding(true)}
              className="gap-2"
            >
              <HelpCircle className="w-4 h-4" />
              Help
            </Button>

            <div className="flex items-center gap-3 border-l border-neutral-200 pl-6">
              <Label htmlFor="view-mode" className="text-sm text-neutral-600">
                {viewMode === "manager" ? "Manager View" : "Employee View"}
              </Label>
              <Switch
                id="view-mode"
                checked={viewMode === "employee"}
                onCheckedChange={(checked: any) => setViewMode(checked ? "employee" : "manager")}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        {viewMode === "manager" ? (
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <TabsList className="grid w-full grid-cols-7 lg:w-auto lg:inline-grid">
              <TabsTrigger value="dashboard" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="schedule" className="gap-2">
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">Schedule</span>
              </TabsTrigger>
              <TabsTrigger value="forecast" className="gap-2">
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline">Forecast</span>
              </TabsTrigger>
              <TabsTrigger value="constraints" className="gap-2">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Rules</span>
              </TabsTrigger>
              <TabsTrigger value="alerts" className="gap-2">
                <Bell className="w-4 h-4" />
                <span className="hidden sm:inline">Alerts</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Analytics</span>
              </TabsTrigger>
              <TabsTrigger value="employees" className="gap-2">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Employees</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-4">
              <DashboardView />
            </TabsContent>

            <TabsContent value="schedule" className="space-y-4">
              <ScheduleView />
            </TabsContent>

            <TabsContent value="forecast" className="space-y-4">
              <SalesForecast />
            </TabsContent>

            <TabsContent value="constraints" className="space-y-4">
              <ConstraintsEditor />
            </TabsContent>

            <TabsContent value="alerts" className="space-y-4">
              <AlertsPanel />
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <Analytics />
            </TabsContent>

            <TabsContent value="employees" className="space-y-4">
              <EmployeeManager />
            </TabsContent>
          </Tabs>
        ) : (
          <EmployeePortal />
        )}
      </main>

      {/* Onboarding Modal */}
      {showOnboarding && (
        <OnboardingWalkthrough onClose={() => setShowOnboarding(false)} />
      )}
    </div>
  );
}
