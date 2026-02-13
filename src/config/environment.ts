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

// Check if we're in production mode
// Uses Vite's import.meta.env.MODE which is 'production' or 'development'
export const IS_PRODUCTION = import.meta.env.MODE === 'production';
export const IS_DEVELOPMENT = import.meta.env.MODE === 'development';

// Feature flags for different parts of the application
export const FEATURE_FLAGS = {
  // New optimization workflow features (Inputs, Optimize, Results) - Development only
  showOptimizationWorkflow: IS_DEVELOPMENT,

  // Backend-integrated features - Available in production
  showSchedule: true, // Backend-integrated
  showForecast: true, // Backend-integrated
  showConstraints: true, // Backend-integrated (Rules)
  showEmployees: true, // Backend-integrated

  // Features with hardcoded data - Development only
  showDashboard: IS_DEVELOPMENT, // Hardcoded metrics
  showAlerts: IS_DEVELOPMENT, // Hardcoded alerts
  showAnalytics: IS_DEVELOPMENT, // Hardcoded reports

  // Legacy UI toggle - Development only
  showLegacyUIToggle: IS_DEVELOPMENT,
} as const;

// Log the current mode on app startup (useful for debugging)
if (IS_DEVELOPMENT) {
  console.log('🔧 Running in DEVELOPMENT mode - all features visible');
} else {
  console.log('🚀 Running in PRODUCTION mode - example data features hidden');
}
