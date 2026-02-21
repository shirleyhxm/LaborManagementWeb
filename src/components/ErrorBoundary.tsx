import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './ui/button';
import { env } from '../config/env';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Global Error Boundary Component
 *
 * Catches unhandled errors in the React component tree
 * and displays a user-friendly error message.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to error reporting service (e.g., Sentry)
    this.logErrorToService(error, errorInfo);

    // Update state with error details
    this.setState({
      error,
      errorInfo,
    });
  }

  logErrorToService(error: Error, errorInfo: ErrorInfo) {
    // Send to Sentry if configured
    if (env.monitoring.sentryDsn) {
      const { logErrorToSentry } = require('../config/sentry');
      logErrorToSentry(error, {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
      });
    }

    // Also log to console in development
    if (!env.isProduction) {
      console.error('Uncaught error:', error);
      console.error('Component stack:', errorInfo.componentStack);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    this.handleReset();
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-red-100 p-4 rounded-full">
                <AlertTriangle className="w-12 h-12 text-red-600" />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-neutral-900 mb-2">
              Something went wrong
            </h1>

            <p className="text-neutral-600 mb-6">
              We're sorry, but something unexpected happened. The error has been logged
              and we'll look into it.
            </p>

            {!env.isProduction && this.state.error && (
              <div className="mb-6 p-4 bg-red-50 rounded-md text-left">
                <p className="text-sm font-mono text-red-800 mb-2">
                  {this.state.error.name}: {this.state.error.message}
                </p>
                {this.state.errorInfo && (
                  <details className="text-xs text-red-700">
                    <summary className="cursor-pointer font-semibold mb-1">
                      Component Stack
                    </summary>
                    <pre className="overflow-auto max-h-48 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <Button
                onClick={this.handleReset}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>

              <Button
                onClick={this.handleGoHome}
                className="flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                Go Home
              </Button>
            </div>

            {env.isProduction && (
              <p className="text-xs text-neutral-500 mt-6">
                Error ID: {Date.now().toString(36)}
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook version for catching errors in functional components
 * Use with try/catch in useEffect or event handlers
 */
export function useErrorHandler() {
  const handleError = (error: Error) => {
    // Log to Sentry if configured
    if (env.monitoring.sentryDsn) {
      const { logErrorToSentry } = require('../config/sentry');
      logErrorToSentry(error);
    }

    // Also log to console in development
    if (!env.isProduction) {
      console.error('Error caught:', error);
    }

    // Rethrow to let Error Boundary catch it
    throw error;
  };

  return handleError;
}
