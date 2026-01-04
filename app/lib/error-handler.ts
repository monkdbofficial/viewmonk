import type { DbError } from '@/tauri-bindings/types';

/**
 * Database error class with enhanced error information
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'DatabaseError';
  }

  /**
   * Create a DatabaseError from any error object
   */
  static from(error: any): DatabaseError {
    // If it's already a DatabaseError, return it
    if (error instanceof DatabaseError) {
      return error;
    }

    // If it's a string, create a simple error
    if (typeof error === 'string') {
      return new DatabaseError(error, 'UNKNOWN');
    }

    // If it has a DbError structure (from Rust)
    if (error && typeof error === 'object') {
      if ('type' in error && 'message' in error) {
        const dbError = error as DbError;
        return new DatabaseError(dbError.message, dbError.type);
      }

      // If it has a message property
      if ('message' in error) {
        return new DatabaseError(error.message, 'UNKNOWN', error);
      }
    }

    // Fallback
    return new DatabaseError('An unknown error occurred', 'UNKNOWN', error);
  }

  /**
   * Check if this is a connection-related error
   */
  isConnectionError(): boolean {
    return this.code === 'ConnectionFailed' || this.code === 'AuthenticationFailed';
  }

  /**
   * Check if this is a query-related error
   */
  isQueryError(): boolean {
    return this.code === 'QueryFailed' || this.code === 'InvalidQuery';
  }

  /**
   * Check if this is a security-related error
   */
  isSecurityError(): boolean {
    return this.code === 'InjectionDetected' || this.code === 'CredentialError';
  }

  /**
   * Check if this is a validation error
   */
  isValidationError(): boolean {
    return this.code === 'ValidationError';
  }

  /**
   * Check if this is a rate limit error
   */
  isRateLimitError(): boolean {
    return this.code === 'RateLimitExceeded';
  }

  /**
   * Get a user-friendly error message
   */
  getUserMessage(): string {
    switch (this.code) {
      case 'ConnectionFailed':
        return 'Failed to connect to the database. Please check your connection settings.';
      case 'AuthenticationFailed':
        return 'Authentication failed. Please check your username and password.';
      case 'QueryFailed':
        return `Query execution failed: ${this.message}`;
      case 'InvalidQuery':
        return `Invalid query: ${this.message}`;
      case 'InjectionDetected':
        return 'Potential SQL injection detected. Please review your query.';
      case 'CredentialError':
        return 'Failed to access credentials. Please try reconnecting.';
      case 'ValidationError':
        return `Validation error: ${this.message}`;
      case 'RateLimitExceeded':
        return 'Too many requests. Please wait a moment and try again.';
      case 'DatabaseNotFound':
        return 'Connection not found. Please reconnect to the database.';
      case 'PoolExhausted':
        return 'All database connections are in use. Please try again in a moment.';
      case 'Timeout':
        return 'Operation timed out. Please try again.';
      default:
        return this.message || 'An error occurred';
    }
  }

  /**
   * Get a title for the error (for toast notifications)
   */
  getTitle(): string {
    if (this.isConnectionError()) return 'Connection Error';
    if (this.isQueryError()) return 'Query Error';
    if (this.isSecurityError()) return 'Security Error';
    if (this.isValidationError()) return 'Validation Error';
    if (this.isRateLimitError()) return 'Rate Limit Exceeded';
    return 'Error';
  }
}

/**
 * Format error for display in UI
 */
export function formatError(error: any): { title: string; message: string } {
  const dbError = DatabaseError.from(error);
  return {
    title: dbError.getTitle(),
    message: dbError.getUserMessage(),
  };
}

/**
 * Log error to console with context
 */
export function logError(context: string, error: any): void {
  const dbError = DatabaseError.from(error);
  console.error(`[${context}]`, {
    code: dbError.code,
    message: dbError.message,
    details: dbError.details,
  });
}
