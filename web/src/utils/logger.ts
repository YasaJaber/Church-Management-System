/**
 * Secure Frontend Logger
 * Only logs in development mode, prevents sensitive data exposure in production
 */

const isDevelopment = process.env.NODE_ENV === 'development';

// Sensitive fields that should never be logged
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'auth_token',
  'authorization',
  'secret',
  'apikey',
  'api_key',
  'jwt',
  'cookie',
  'session',
];

/**
 * Sanitize data to remove sensitive information
 */
function sanitize(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitize(item));
  }

  const sanitized: any = {};
  for (const key in data) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_FIELDS.some(field => lowerKey.includes(field));
    
    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof data[key] === 'object' && data[key] !== null) {
      sanitized[key] = sanitize(data[key]);
    } else {
      sanitized[key] = data[key];
    }
  }

  return sanitized;
}

/**
 * Safe logger that only works in development
 */
const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },

  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  error: (...args: any[]) => {
    // Always log errors, even in production, but sanitize them
    const sanitizedArgs = args.map(arg => sanitize(arg));
    console.error(...sanitizedArgs);
  },

  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },

  // Special method for API calls (only in development)
  api: (message: string, data?: any) => {
    if (isDevelopment) {
      console.log(`[API] ${message}`, data ? sanitize(data) : '');
    }
  },

  // Helper to sanitize data manually
  sanitize,
};

export default logger;

