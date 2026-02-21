/**
 * Structured Logging Utility using Pino
 *
 * Provides consistent logging across the application with proper
 * log levels and structured output.
 */

import pino from 'pino';
import { env } from '../config/env';

/**
 * Create Pino logger instance with browser-friendly configuration
 */
const pinoLogger = pino({
  level: env.logging.level,
  browser: {
    // Browser-specific configuration
    asObject: true,
    serialize: true,
  },
  // Format output based on environment
  ...(env.isDevelopment
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
          },
        },
      }
    : {}),
});

/**
 * Logger interface for structured logging
 */
interface Logger {
  debug(message: string, data?: Record<string, any>): void;
  info(message: string, data?: Record<string, any>): void;
  warn(message: string, data?: Record<string, any>): void;
  error(message: string, error?: Error | Record<string, any>): void;
  security(event: string, data?: Record<string, any>): void;
}

/**
 * Wrapper around Pino logger with application-specific methods
 */
class AppLogger implements Logger {
  /**
   * Log debug message (development only)
   */
  debug(message: string, data?: Record<string, any>): void {
    if (!env.logging.enableConsoleLogs && env.isProduction) return;

    pinoLogger.debug({ ...data }, message);
  }

  /**
   * Log informational message
   */
  info(message: string, data?: Record<string, any>): void {
    if (!env.logging.enableConsoleLogs && env.isProduction) return;

    pinoLogger.info({ ...data }, message);
  }

  /**
   * Log warning message
   */
  warn(message: string, data?: Record<string, any>): void {
    pinoLogger.warn({ ...data }, message);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | Record<string, any>): void {
    if (error instanceof Error) {
      pinoLogger.error(
        {
          error: {
            message: error.message,
            name: error.name,
            stack: error.stack,
          },
        },
        message
      );
    } else {
      pinoLogger.error({ ...error }, message);
    }
  }

  /**
   * Log security-related event
   * These are always logged regardless of environment
   */
  security(event: string, data?: Record<string, any>): void {
    pinoLogger.warn(
      {
        ...data,
        security: true,
        event,
      },
      `[SECURITY] ${event}`
    );
  }
}

/**
 * Singleton logger instance
 */
export const logger = new AppLogger();

/**
 * Log API request
 */
export function logApiRequest(
  method: string,
  endpoint: string,
  status?: number,
  duration?: number
) {
  logger.debug('API Request', {
    method,
    endpoint,
    status,
    duration,
    type: 'api_request',
  });
}

/**
 * Log API error
 */
export function logApiError(
  method: string,
  endpoint: string,
  error: Error | any,
  status?: number
) {
  logger.error('API Error', {
    method,
    endpoint,
    status,
    error: error instanceof Error ? error.message : String(error),
    type: 'api_error',
  });
}

/**
 * Log authentication event
 */
export function logAuthEvent(
  event: 'login' | 'logout' | 'token_refresh' | 'token_expired' | 'unauthorized',
  userId?: string,
  details?: Record<string, any>
) {
  logger.security(`Auth: ${event}`, {
    event,
    userId,
    ...details,
    type: 'auth_event',
  });
}

/**
 * Log user action
 */
export function logUserAction(
  action: string,
  userId: string,
  resource?: string,
  details?: Record<string, any>
) {
  logger.info('User Action', {
    action,
    userId,
    resource,
    ...details,
    type: 'user_action',
  });
}

/**
 * Log performance metric
 */
export function logPerformance(
  metric: string,
  value: number,
  unit: 'ms' | 's' | 'count' = 'ms',
  metadata?: Record<string, any>
) {
  logger.debug('Performance Metric', {
    metric,
    value,
    unit,
    ...metadata,
    type: 'performance',
  });
}

/**
 * Development-only console replacement
 * Use logger instead of console.log in production code
 */
export const devLog = {
  log: (...args: any[]) => {
    if (env.isDevelopment) {
      console.log(...args);
    }
  },
  info: (...args: any[]) => {
    if (env.isDevelopment) {
      console.info(...args);
    }
  },
  warn: (...args: any[]) => {
    if (env.isDevelopment) {
      console.warn(...args);
    }
  },
  error: (...args: any[]) => {
    if (env.isDevelopment) {
      console.error(...args);
    }
  },
};

// Export default logger
export default logger;
