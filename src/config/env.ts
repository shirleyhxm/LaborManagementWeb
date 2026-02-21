/**
 * Environment variable validation and configuration
 *
 * This file validates all required environment variables on app startup
 * and provides typed access to configuration values.
 */

interface EnvConfig {
  // App Environment
  mode: 'development' | 'staging' | 'production';
  isDevelopment: boolean;
  isStaging: boolean;
  isProduction: boolean;

  // API Configuration
  apiBaseUrl: string;
  apiTimeout: number;
  apiMaxRetries: number;

  // Authentication
  authTokenExpiry: number; // minutes
  authRefreshTokenExpiry: number; // days

  // Feature Flags
  features: {
    optimizationWorkflow: boolean;
    legacyUI: boolean;
    schedule: boolean;
    forecast: boolean;
    constraints: boolean;
    employees: boolean;
  };

  // Monitoring & Analytics
  monitoring: {
    sentryDsn: string | null;
    gaTrackingId: string | null;
    environment: string;
  };

  // Security
  security: {
    forceHttps: boolean;
    enableCSP: boolean;
  };

  // Logging
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enableConsoleLogs: boolean;
  };
}

/**
 * Get environment variable with optional default value
 */
function getEnv(key: string, defaultValue?: string): string {
  const value = import.meta.env[key];

  if (value === undefined || value === '') {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

/**
 * Get boolean environment variable
 */
function getBoolEnv(key: string, defaultValue: boolean): boolean {
  const value = import.meta.env[key];

  if (value === undefined || value === '') {
    return defaultValue;
  }

  return value === 'true' || value === '1';
}

/**
 * Get number environment variable
 */
function getNumberEnv(key: string, defaultValue: number): number {
  const value = import.meta.env[key];

  if (value === undefined || value === '') {
    return defaultValue;
  }

  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    console.warn(`Invalid number for ${key}: ${value}, using default: ${defaultValue}`);
    return defaultValue;
  }

  return parsed;
}

/**
 * Validate and load environment configuration
 */
function loadEnvConfig(): EnvConfig {
  // Determine environment mode
  const viteMode = import.meta.env.MODE || 'development';
  const appEnv = getEnv('VITE_APP_ENV', viteMode) as 'development' | 'staging' | 'production';

  const isDevelopment = appEnv === 'development';
  const isStaging = appEnv === 'staging';
  const isProduction = appEnv === 'production';

  // API Configuration
  const apiBaseUrl = getEnv('VITE_API_BASE_URL', '/api');
  const apiTimeout = getNumberEnv('VITE_API_TIMEOUT', 30000);
  const apiMaxRetries = getNumberEnv('VITE_API_MAX_RETRIES', 3);

  // Authentication
  const authTokenExpiry = getNumberEnv('VITE_AUTH_TOKEN_EXPIRY', 15);
  const authRefreshTokenExpiry = getNumberEnv('VITE_AUTH_REFRESH_TOKEN_EXPIRY', 7);

  // Feature Flags
  const features = {
    optimizationWorkflow: getBoolEnv('VITE_FEATURE_OPTIMIZATION_WORKFLOW', isDevelopment),
    legacyUI: getBoolEnv('VITE_FEATURE_LEGACY_UI', false),
    // Backend-integrated features always enabled
    schedule: true,
    forecast: true,
    constraints: true,
    employees: true,
  };

  // Monitoring & Analytics
  const monitoring = {
    sentryDsn: import.meta.env.VITE_SENTRY_DSN || null,
    gaTrackingId: import.meta.env.VITE_GA_TRACKING_ID || null,
    environment: getEnv('VITE_MONITORING_ENV', appEnv),
  };

  // Security
  const security = {
    forceHttps: getBoolEnv('VITE_FORCE_HTTPS', isProduction),
    enableCSP: getBoolEnv('VITE_ENABLE_CSP', true),
  };

  // Logging
  const logLevel = getEnv('VITE_LOG_LEVEL', 'info') as 'debug' | 'info' | 'warn' | 'error';
  const logging = {
    level: ['debug', 'info', 'warn', 'error'].includes(logLevel) ? logLevel : 'info',
    enableConsoleLogs: getBoolEnv('VITE_ENABLE_CONSOLE_LOGS', isDevelopment),
  };

  return {
    mode: appEnv,
    isDevelopment,
    isStaging,
    isProduction,
    apiBaseUrl,
    apiTimeout,
    apiMaxRetries,
    authTokenExpiry,
    authRefreshTokenExpiry,
    features,
    monitoring,
    security,
    logging,
  };
}

/**
 * Validate environment configuration
 */
function validateEnvConfig(config: EnvConfig): void {
  const errors: string[] = [];

  // Validate API URL
  if (!config.apiBaseUrl) {
    errors.push('API base URL is required');
  }

  // Validate timeouts
  if (config.apiTimeout <= 0) {
    errors.push('API timeout must be positive');
  }

  if (config.apiMaxRetries < 0) {
    errors.push('API max retries cannot be negative');
  }

  // Validate auth token expiry
  if (config.authTokenExpiry <= 0) {
    errors.push('Auth token expiry must be positive');
  }

  if (config.authRefreshTokenExpiry <= 0) {
    errors.push('Refresh token expiry must be positive');
  }

  // Warn about production configuration
  if (config.isProduction) {
    if (config.logging.enableConsoleLogs) {
      console.warn('⚠️ Console logs are enabled in production');
    }
    if (!config.security.forceHttps) {
      console.warn('⚠️ HTTPS is not enforced in production');
    }
    if (!config.monitoring.sentryDsn) {
      console.warn('⚠️ Sentry DSN not configured for production');
    }
  }

  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
  }
}

// Load and validate configuration
export const env = loadEnvConfig();

// Validate on load
validateEnvConfig(env);

// Log configuration on startup (only in development, before logger is ready)
if (env.isDevelopment) {
  console.log('🔧 Running in DEVELOPMENT mode');
  console.log('Environment configuration:', {
    mode: env.mode,
    apiBaseUrl: env.apiBaseUrl,
    features: env.features,
  });
} else if (env.isStaging) {
  console.log('🧪 Running in STAGING mode');
} else {
  console.log('🚀 Running in PRODUCTION mode');
}

// Note: Use logger.info() instead of console.log() in application code

// Export backward compatibility
export const IS_PRODUCTION = env.isProduction;
export const IS_DEVELOPMENT = env.isDevelopment;
export const IS_STAGING = env.isStaging;
