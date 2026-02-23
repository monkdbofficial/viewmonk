/**
 * Security validation utilities for API endpoints
 */

/**
 * Validates SQL table/schema identifier to prevent SQL injection and path traversal
 * Allows: alphanumeric, underscore, dot (for schema.table)
 * Does NOT allow: spaces, slashes, quotes, semicolons, etc.
 */
export function isValidSQLIdentifier(identifier: string): boolean {
  if (!identifier || typeof identifier !== 'string') {
    return false;
  }

  // Length check (reasonable table name length)
  if (identifier.length === 0 || identifier.length > 128) {
    return false;
  }

  // Must match SQL identifier pattern: alphanumeric, underscore, dot only
  // No path traversal characters (/, \, ..)
  // No SQL injection characters (;, ', ", --, /*, etc.)
  const validPattern = /^[a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+)?$/;

  if (!validPattern.test(identifier)) {
    return false;
  }

  // Prevent path traversal attempts
  if (identifier.includes('..') || identifier.includes('//')) {
    return false;
  }

  // Prevent reserved/dangerous names
  const dangerous = ['etc', 'passwd', 'shadow', 'root', 'admin', 'sys', 'system'];
  const lower = identifier.toLowerCase();
  if (dangerous.some(d => lower.includes(d))) {
    return false;
  }

  return true;
}

/**
 * Validates SHA1 hash format (40 hexadecimal characters)
 */
export function isValidSHA1(hash: string): boolean {
  if (!hash || typeof hash !== 'string') {
    return false;
  }

  // SHA1 is exactly 40 hexadecimal characters
  const sha1Pattern = /^[a-f0-9]{40}$/i;
  return sha1Pattern.test(hash);
}

/**
 * Validates SHA256 hash format (64 hexadecimal characters)
 */
export function isValidSHA256(hash: string): boolean {
  if (!hash || typeof hash !== 'string') {
    return false;
  }

  // SHA256 is exactly 64 hexadecimal characters
  const sha256Pattern = /^[a-f0-9]{64}$/i;
  return sha256Pattern.test(hash);
}

/**
 * Validates hostname (for SSRF prevention)
 * Allows: localhost, valid domain names, IP addresses
 * Blocks: file://, localhost variants that bypass filters
 */
export function isValidHostname(host: string): boolean {
  if (!host || typeof host !== 'string') {
    return false;
  }

  // Length check
  if (host.length > 253) {
    return false;
  }

  // Allow localhost
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
    return true;
  }

  // Allow valid IP addresses (IPv4)
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Pattern.test(host)) {
    // Validate each octet is 0-255
    const octets = host.split('.').map(Number);
    return octets.every(octet => octet >= 0 && octet <= 255);
  }

  // Allow valid domain names
  const domainPattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return domainPattern.test(host);
}

/**
 * Validates port number
 */
export function isValidPort(port: string | number): boolean {
  const portNum = typeof port === 'string' ? parseInt(port, 10) : port;

  if (isNaN(portNum)) {
    return false;
  }

  // Valid port range: 1-65535
  return portNum >= 1 && portNum <= 65535;
}

/**
 * Sanitizes error messages to prevent information leakage
 */
export function sanitizeErrorMessage(error: any): string {
  // In production, don't expose internal error details
  if (process.env.NODE_ENV === 'production') {
    return 'An error occurred. Please try again later.';
  }

  // In development, show errors but sanitize sensitive data
  const message = error?.message || String(error);

  // Remove potential passwords, tokens, keys
  return message
    .replace(/password[=:]\s*\S+/gi, 'password=***')
    .replace(/token[=:]\s*\S+/gi, 'token=***')
    .replace(/key[=:]\s*\S+/gi, 'key=***')
    .replace(/secret[=:]\s*\S+/gi, 'secret=***');
}

/**
 * Rate limiting helper (simple in-memory implementation)
 * For production, use Redis or similar
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  check(identifier: string): boolean {
    const now = Date.now();
    const timestamps = this.requests.get(identifier) || [];

    // Remove old timestamps outside the window
    const validTimestamps = timestamps.filter(ts => now - ts < this.windowMs);

    // Check if limit exceeded
    if (validTimestamps.length >= this.maxRequests) {
      return false;
    }

    // Add new timestamp
    validTimestamps.push(now);
    this.requests.set(identifier, validTimestamps);

    return true;
  }

  reset(identifier: string): void {
    this.requests.delete(identifier);
  }
}

// Export singleton instance for API routes
export const apiRateLimiter = new RateLimiter(300, 60000); // 300 requests per minute
