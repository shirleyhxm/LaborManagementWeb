import { UserRole } from '../types/auth';

// Define route access by role
export const ROUTE_ACCESS = {
  // Manager/Admin routes
  dashboard: [UserRole.ADMIN, UserRole.MANAGER],
  schedule: [UserRole.ADMIN, UserRole.MANAGER],
  forecast: [UserRole.ADMIN, UserRole.MANAGER],
  constraints: [UserRole.ADMIN, UserRole.MANAGER],
  alerts: [UserRole.ADMIN, UserRole.MANAGER],
  analytics: [UserRole.ADMIN, UserRole.MANAGER],
  employees: [UserRole.ADMIN, UserRole.MANAGER],

  // Employee routes
  'employee-portal': [UserRole.ADMIN, UserRole.EMPLOYEE],
} as const;

// Get default route based on user role
export function getDefaultRouteForRole(role: UserRole): string {
  switch (role) {
    case UserRole.EMPLOYEE:
      return '/employee-portal';
    case UserRole.MANAGER:
    case UserRole.ADMIN:
      return '/dashboard';
    default:
      return '/dashboard';
  }
}

// Check if user has access to a specific route
export function hasRouteAccess(route: string, userRole: UserRole): boolean {
  // Remove leading slash if present
  const normalizedRoute = route.startsWith('/') ? route.slice(1) : route;

  // Empty route or '/' defaults to dashboard
  if (normalizedRoute === '' || normalizedRoute === '/') {
    return hasRouteAccess('dashboard', userRole);
  }

  const allowedRoles = ROUTE_ACCESS[normalizedRoute as keyof typeof ROUTE_ACCESS];

  // If route not defined, deny access by default
  if (!allowedRoles) {
    return false;
  }

  return allowedRoles.includes(userRole);
}

// Get all accessible routes for a user role
export function getAccessibleRoutes(userRole: UserRole): string[] {
  return Object.entries(ROUTE_ACCESS)
    .filter(([_, roles]) => roles.includes(userRole))
    .map(([route]) => route);
}
