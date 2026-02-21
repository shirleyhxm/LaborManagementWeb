/**
 * Sentry Error Monitoring Configuration
 *
 * Initializes Sentry for error tracking and performance monitoring
 */

import * as Sentry from '@sentry/react';
import { env } from './env';

/**
 * Initialize Sentry error monitoring
 * Only initializes if DSN is configured in environment
 */
export function initSentry() {
  // Only initialize if Sentry DSN is configured
  if (!env.monitoring.sentryDsn) {
    if (env.isDevelopment) {
      console.log('⚠️ Sentry DSN not configured - error monitoring disabled');
    }
    return;
  }

  Sentry.init({
    dsn: env.monitoring.sentryDsn,
    environment: env.monitoring.environment,

    // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring
    // In production, you may want to lower this to reduce costs
    tracesSampleRate: env.isProduction ? 0.1 : 1.0,

    // Capture 100% of errors in production, sample in development
    sampleRate: env.isProduction ? 1.0 : 0.5,

    // Enable debug mode in development
    debug: env.isDevelopment,

    // Integrations
    integrations: [
      // Browser profiling integration
      Sentry.browserTracingIntegration({
        // Track navigation and route changes
        enableInp: true,
      }),
      // Replay integration for session recording (optional)
      // Only enable in production or when explicitly needed
      ...(env.isProduction
        ? [
            Sentry.replayIntegration({
              // Sample 10% of sessions
              sessionSampleRate: 0.1,
              // Sample 100% of sessions with errors
              errorSampleRate: 1.0,
            }),
          ]
        : []),
    ],

    // Filter out certain errors
    beforeSend(event, hint) {
      // Don't send errors in development unless explicitly enabled
      if (env.isDevelopment && !env.logging.enableConsoleLogs) {
        return null;
      }

      // Filter out known non-critical errors
      const error = hint.originalException;
      if (error && typeof error === 'object' && 'message' in error) {
        const message = String(error.message);

        // Ignore ResizeObserver errors (common browser quirks)
        if (message.includes('ResizeObserver loop')) {
          return null;
        }

        // Ignore cancelled requests
        if (message.includes('cancelled') || message.includes('aborted')) {
          return null;
        }
      }

      return event;
    },

    // Attach user context when available
    initialScope: {
      tags: {
        app_version: import.meta.env.VITE_APP_VERSION || 'unknown',
      },
    },
  });

  if (env.isDevelopment) {
    console.log('✅ Sentry initialized for error monitoring');
  }
}

/**
 * Set user context for error tracking
 */
export function setSentryUser(user: { id: string; email: string; role: string } | null) {
  if (!env.monitoring.sentryDsn) return;

  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      role: user.role,
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Log custom event to Sentry
 */
export function logToSentry(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  extra?: Record<string, any>
) {
  if (!env.monitoring.sentryDsn) return;

  Sentry.captureMessage(message, {
    level,
    extra,
  });
}

/**
 * Log exception to Sentry
 */
export function logErrorToSentry(error: Error, context?: Record<string, any>) {
  if (!env.monitoring.sentryDsn) return;

  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Create Sentry-wrapped ErrorBoundary
 */
export const SentryErrorBoundary = Sentry.ErrorBoundary;
