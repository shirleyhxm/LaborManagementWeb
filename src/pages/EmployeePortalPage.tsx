import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Calendar, LogOut } from "lucide-react";
import { EmployeePortal } from "../components/EmployeePortal";
import { useAuth } from "../contexts/AuthContext";

export function EmployeePortalPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
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
              <p className="text-neutral-500 text-sm">Employee Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm">
              <p className="font-medium text-neutral-900">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-neutral-500 text-xs">{user?.role}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        <EmployeePortal />
      </main>
    </div>
  );
}
