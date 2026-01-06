'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCategory: 'connection' | 'query' | 'network' | 'component' | 'unknown';
  isCritical: boolean;
  autoRecoveryAttempted: boolean;
}

/**
 * Enterprise-grade Error Boundary component with auto-recovery
 *
 * Features:
 * - Automatic error categorization (connection, query, network, component)
 * - Auto-recovery for non-critical errors (3-second timeout)
 * - Detailed error logging with custom events
 * - User-friendly error messages based on error type
 * - Component stack trace for debugging
 *
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 * ```
 */
export default class ErrorBoundary extends Component<Props, State> {
  private autoRecoveryTimeout: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCategory: 'unknown',
      isCritical: false,
      autoRecoveryAttempted: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  /**
   * Categorize errors for better handling and user messaging
   */
  private categorizeError(error: Error): { category: State['errorCategory']; isCritical: boolean } {
    const errorString = error.toString().toLowerCase();
    const errorMessage = error.message?.toLowerCase() || '';

    // Connection errors - usually recoverable
    if (errorString.includes('connection') ||
        errorString.includes('econnrefused') ||
        errorString.includes('network') ||
        errorMessage.includes('no active database connection')) {
      return { category: 'connection', isCritical: false };
    }

    // Query errors - usually user input issues, not critical
    if (errorString.includes('query') ||
        errorString.includes('sql') ||
        errorString.includes('syntax')) {
      return { category: 'query', isCritical: false };
    }

    // Network errors - usually temporary
    if (errorString.includes('fetch') ||
        errorString.includes('timeout') ||
        errorString.includes('network')) {
      return { category: 'network', isCritical: false };
    }

    // Component errors - check if critical
    const isCritical = errorString.includes('fatal') ||
                       errorString.includes('security') ||
                       errorString.includes('auth') ||
                       errorString.includes('permission');

    return { category: 'component', isCritical };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Ignore React hydration/hot-reload errors in development
    const errorString = error.toString();
    if (
      process.env.NODE_ENV === 'development' &&
      (errorString.includes('removeChild') ||
       errorString.includes('Hydration') ||
       errorString.includes('did not match'))
    ) {
      console.warn('[ErrorBoundary] Ignoring development-only error:', error.message);
      return;
    }

    // Log error details for debugging
    console.error('[ErrorBoundary] Caught an error:', error, errorInfo);

    // Categorize the error
    const { category, isCritical } = this.categorizeError(error);

    // Store error info in state
    this.setState({
      error,
      errorInfo,
      errorCategory: category,
      isCritical,
    });

    // Auto-recovery logic for non-critical errors
    if (!isCritical && !this.state.autoRecoveryAttempted) {
      console.log(`[ErrorBoundary] Non-critical ${category} error detected. Auto-recovering in 3 seconds...`);
      this.autoRecoveryTimeout = setTimeout(() => {
        console.log('[ErrorBoundary] Auto-recovery triggered');
        this.setState({
          autoRecoveryAttempted: true,
        });
        this.handleReset();
      }, 3000);
    }

    // Dispatch custom error event with enhanced details
    if (typeof window !== 'undefined') {
      const errorEvent = new CustomEvent('app-error', {
        detail: {
          error: error.toString(),
          message: error.message,
          category,
          isCritical,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
          autoRecoveryScheduled: !isCritical,
        },
      });
      window.dispatchEvent(errorEvent);
    }
  }

  componentWillUnmount() {
    // Clean up auto-recovery timeout
    if (this.autoRecoveryTimeout) {
      clearTimeout(this.autoRecoveryTimeout);
    }
  }

  handleReset = () => {
    // Clear auto-recovery timeout if exists
    if (this.autoRecoveryTimeout) {
      clearTimeout(this.autoRecoveryTimeout);
      this.autoRecoveryTimeout = null;
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorCategory: 'unknown',
      isCritical: false,
      autoRecoveryAttempted: false,
    });
  };

  /**
   * Get user-friendly error message based on category
   */
  private getErrorMessage(): { title: string; description: string; suggestion: string } {
    const { errorCategory, isCritical } = this.state;

    switch (errorCategory) {
      case 'connection':
        return {
          title: 'Database Connection Issue',
          description: 'Unable to connect to the database. This usually happens when the database is offline or unreachable.',
          suggestion: isCritical
            ? 'Please check your database connection settings and try again.'
            : 'Automatically recovering in 3 seconds...',
        };
      case 'query':
        return {
          title: 'Query Error',
          description: 'There was an issue executing your database query. This is usually caused by invalid SQL syntax.',
          suggestion: isCritical
            ? 'Please check your query and try again.'
            : 'Automatically recovering in 3 seconds...',
        };
      case 'network':
        return {
          title: 'Network Error',
          description: 'A network error occurred while communicating with the database.',
          suggestion: isCritical
            ? 'Please check your internet connection and try again.'
            : 'Automatically recovering in 3 seconds...',
        };
      case 'component':
        return {
          title: isCritical ? 'Critical Application Error' : 'Component Error',
          description: isCritical
            ? 'A critical error occurred that requires your attention.'
            : 'A component error occurred but the application should recover automatically.',
          suggestion: isCritical
            ? 'Please reload the page or contact support if this persists.'
            : 'Automatically recovering in 3 seconds...',
        };
      default:
        return {
          title: 'Unexpected Error',
          description: 'An unexpected error occurred in the application.',
          suggestion: isCritical
            ? 'Please try again or contact support if the problem persists.'
            : 'Attempting automatic recovery...',
        };
    }
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI provided by parent
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { title, description, suggestion } = this.getErrorMessage();
      const { isCritical, errorCategory } = this.state;

      // Color scheme based on error severity
      const colorScheme = isCritical
        ? {
            border: 'border-red-200 dark:border-red-800',
            iconBg: 'bg-red-100 dark:bg-red-900/20',
            iconColor: 'text-red-600 dark:text-red-400',
            badge: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
          }
        : {
            border: 'border-yellow-200 dark:border-yellow-800',
            iconBg: 'bg-yellow-100 dark:bg-yellow-900/20',
            iconColor: 'text-yellow-600 dark:text-yellow-400',
            badge: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
          };

      // Default error UI with enhanced messaging
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
          <div className={`w-full max-w-md rounded-lg border ${colorScheme.border} bg-white p-6 shadow-lg dark:bg-gray-800`}>
            {/* Header with Icon */}
            <div className="mb-4 flex items-center gap-3">
              <div className={`rounded-full ${colorScheme.iconBg} p-2`}>
                <svg
                  className={`h-6 w-6 ${colorScheme.iconColor}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {title}
                </h2>
                {/* Error Category Badge */}
                <span className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-medium ${colorScheme.badge}`}>
                  {errorCategory.toUpperCase()}
                  {isCritical && ' - CRITICAL'}
                </span>
              </div>
            </div>

            {/* Description */}
            <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
              {description}
            </p>

            {/* Suggestion/Auto-recovery message */}
            <p className={`mb-4 text-sm font-medium ${isCritical ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
              {suggestion}
            </p>

            {this.state.error && (
              <details className="mb-4 rounded border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
                  Error Details
                </summary>
                <div className="mt-2 space-y-2">
                  <div>
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                      Error Message:
                    </p>
                    <p className="mt-1 rounded bg-red-50 p-2 font-mono text-xs text-red-700 dark:bg-red-900/20 dark:text-red-400">
                      {this.state.error.toString()}
                    </p>
                  </div>
                  {this.state.errorInfo?.componentStack && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                        Component Stack:
                      </p>
                      <pre className="mt-1 max-h-32 overflow-auto rounded bg-gray-100 p-2 font-mono text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
