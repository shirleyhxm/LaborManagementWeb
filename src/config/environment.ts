/**
 * Environment configuration for production vs development modes
 *
 * Production mode shows only backend-integrated features:
 * - Schedule (backend-integrated)
 * - Forecast (backend-integrated)
 * - Constraints/Rules (backend-integrated)
 * - Employees (backend-integrated)
 *
 * Development mode additionally shows features with hardcoded/example data:
 * - New optimization workflow (Inputs, Optimize, Results)
 * - Dashboard (hardcoded metrics)
 * - Alerts (hardcoded alerts)
 * - Analytics (hardcoded reports)
 */

import { env, IS_PRODUCTION, IS_DEVELOPMENT, IS_STAGING } from './env';

// Re-export for backward compatibility
export { IS_PRODUCTION, IS_DEVELOPMENT, IS_STAGING };

// Export full environment config
export { env };

// Feature flags for different parts of the application
export const FEATURE_FLAGS = {
  // New optimization workflow features (Inputs, Optimize, Results)
  showOptimizationWorkflow: env.features.optimizationWorkflow,

  // Backend-integrated features - Available in production
  showSchedule: env.features.schedule,
  showForecast: env.features.forecast,
  showConstraints: env.features.constraints,
  showEmployees: env.features.employees,

  // Features with hardcoded data - Development only
  showDashboard: IS_DEVELOPMENT, // Hardcoded metrics
  showAlerts: IS_DEVELOPMENT, // Hardcoded alerts
  showAnalytics: IS_DEVELOPMENT, // Hardcoded reports

  // Legacy UI toggle
  showLegacyUIToggle: env.features.legacyUI || IS_DEVELOPMENT,
} as const;
