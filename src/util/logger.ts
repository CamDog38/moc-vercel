/**
 * Centralized logging utility for the application
 * Replaces direct console.log calls with structured logging
 */

// Log levels
type LogLevel = 'info' | 'error' | 'success' | 'warn' | 'debug';

// Log sources
type LogSource = 'leads' | 'bookings' | 'emails' | 'forms' | 'invoices' | 'api' | 'auth' | 'system' | 'other';

/**
 * Maps log levels to their corresponding API log types
 */
const logLevelToApiType: Record<LogLevel, 'info' | 'error' | 'success'> = {
  info: 'info',
  error: 'error',
  success: 'success',
  warn: 'info',    // API log doesn't have warn, so map to info
  debug: 'info'    // API log doesn't have debug, so map to info
};

// Type for the addApiLog function
type AddApiLogFunction = (
  message: string, 
  type: 'info' | 'error' | 'success', 
  source: 'leads' | 'bookings' | 'emails' | 'forms' | 'other'
) => any;

// Flag to track if we've already attempted to load the addApiLog function
let apiLoggerInitialized = false;
let addApiLogFunction: AddApiLogFunction | null = null;

/**
 * Dynamically loads the API logger to avoid circular dependencies
 */
async function getApiLogger(): Promise<AddApiLogFunction | null> {
  if (apiLoggerInitialized) {
    return addApiLogFunction;
  }
  
  apiLoggerInitialized = true;
  
  try {
    // Use dynamic import to avoid circular dependencies
    const apiLogsModule = await import('../pages/api/debug/logs/index');
    addApiLogFunction = apiLogsModule.addApiLog;
    return addApiLogFunction;
  } catch (err) {
    console.error('Failed to load API logger:', err);
    return null;
  }
}

/**
 * Centralized logger function
 * @param message The message to log
 * @param level The log level
 * @param source The source of the log
 * @param data Additional data to log (will not be included in API logs)
 */
async function log(
  message: string, 
  level: LogLevel = 'info', 
  source: LogSource = 'other',
  data?: any
): Promise<void> {
  // Only log in server-side context
  if (typeof window !== 'undefined') {
    return;
  }

  // Format the message with the data if provided
  let formattedMessage = message;
  if (data !== undefined) {
    if (typeof data === 'object') {
      try {
        formattedMessage = `${message} ${JSON.stringify(data)}`;
      } catch (e) {
        formattedMessage = `${message} [Object cannot be stringified]`;
      }
    } else {
      formattedMessage = `${message} ${data}`;
    }
  }

  // Map the source to one of the allowed API log sources
  const apiSource = (
    source === 'leads' || 
    source === 'bookings' || 
    source === 'emails' || 
    source === 'forms' ||
    source === 'invoices'
  ) ? source : 'other';

  // Add to console logs
  const consoleMethod = level === 'error' 
    ? console.error 
    : level === 'success' 
      ? console.log 
      : level === 'warn' 
        ? console.warn 
        : console.info;
  
  // Ensure source is a string before calling toUpperCase
  const sourceStr = typeof source === 'string' ? source.toUpperCase() : String(source).toUpperCase();
  consoleMethod(`[${sourceStr}] ${message}`, data !== undefined ? data : '');

  // Try to add to API logs
  try {
    const addApiLog = await getApiLogger();
    if (addApiLog) {
      addApiLog(formattedMessage, logLevelToApiType[level], apiSource as any);
    }
  } catch (err) {
    console.error('Error adding to API logs:', err);
  }
}

/**
 * Log an informational message
 */
export function info(message: string, source: LogSource = 'other', data?: any): void {
  // Call the async log function but don't await it
  log(message, 'info', source, data).catch(err => {
    console.error('Error in info logger:', err);
  });
}

/**
 * Log an error message
 */
export function error(message: string, source: LogSource = 'other', data?: any): void {
  // Call the async log function but don't await it
  log(message, 'error', source, data).catch(err => {
    console.error('Error in error logger:', err);
  });
}

/**
 * Log a success message
 */
export function success(message: string, source: LogSource = 'other', data?: any): void {
  // Call the async log function but don't await it
  log(message, 'success', source, data).catch(err => {
    console.error('Error in success logger:', err);
  });
}

/**
 * Log a warning message
 */
export function warn(message: string, source: LogSource = 'other', data?: any): void {
  // Call the async log function but don't await it
  log(message, 'warn', source, data).catch(err => {
    console.error('Error in warn logger:', err);
  });
}

/**
 * Log a debug message (only in development)
 */
export function debug(message: string, source: LogSource = 'other', data?: any): void {
  if (process.env.NODE_ENV === 'development') {
    // Call the async log function but don't await it
    log(message, 'debug', source, data).catch(err => {
      console.error('Error in debug logger:', err);
    });
  }
}

/**
 * Log API errors in a consistent format
 * @param error The error to log
 * @param context Additional context information
 */
export function logApiError(error: any, context: string): void {
  const errorDetails = {
    message: error.message,
    status: error.status,
    statusText: error.statusText,
    url: error.url,
    details: error.details,
    stack: error.stack,
  };
  
  // Call the async log function but don't await it
  log(`API Error in ${context}: ${error.message}`, 'error', 'api', errorDetails).catch(err => {
    console.error('Error in API error logger:', err);
  });
} 