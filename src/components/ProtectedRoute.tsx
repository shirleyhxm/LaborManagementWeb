import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/auth';
import { hasRouteAccess, getDefaultRouteForRole } from '../utils/routeConfig';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-2 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Role-based access control
  if (user && allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to user's default route if they don't have access
    const defaultRoute = getDefaultRouteForRole(user.role);
    return <Navigate to={defaultRoute} replace />;
  }

  // Check route access using route configuration
  if (user && location.pathname !== '/') {
    const currentPath = location.pathname.slice(1); // Remove leading slash
    if (currentPath && !hasRouteAccess(currentPath, user.role)) {
      const defaultRoute = getDefaultRouteForRole(user.role);
      return <Navigate to={defaultRoute} replace />;
    }
  }

  return <>{children}</>;
}
