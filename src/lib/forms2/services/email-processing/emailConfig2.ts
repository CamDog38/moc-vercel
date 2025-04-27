/**
 * Email Configuration Service
 * 
 * Provides centralized configuration for email services including timeouts,
 * retry logic, and other shared settings for both direct email and SendGrid.
 */

// Default timeout values (in milliseconds)
export const EMAIL_TIMEOUTS = {
  // Timeout for SMTP connections (Nodemailer)
  SMTP_CONNECTION: 5000, // 5 seconds
  
  // Timeout for SMTP command (Nodemailer)
  SMTP_COMMAND: 8000, // 8 seconds
  
  // Timeout for SendGrid API calls
  SENDGRID_API: 10000, // 10 seconds
  
  // Timeout for email processing API calls
  EMAIL_PROCESSING_API: 15000, // 15 seconds
  
  // Timeout for database queries
  DATABASE_QUERY: 3000, // 3 seconds
  
  // Timeout for variable replacement operations
  VARIABLE_REPLACEMENT: 3000, // 3 seconds per variable
  
  // Maximum total time for variable replacement
  MAX_VARIABLE_REPLACEMENT: 15000, // 15 seconds total
};

// Retry configuration
export const EMAIL_RETRY = {
  // Maximum number of retry attempts
  MAX_RETRIES: 1, // Will try 2 times total (initial + 1 retry)
  
  // Base delay between retries (in milliseconds)
  // Will use exponential backoff: delay * 2^(retry - 1)
  RETRY_DELAY: 500, // 0.5 second, then 1 second
  
  // Whether to use exponential backoff for retries
  USE_EXPONENTIAL_BACKOFF: true,
};

// Email service priorities
export const EMAIL_SERVICES = {
  // Whether to use direct email as the primary service
  USE_DIRECT_EMAIL_FIRST: true,
  
  // Whether to fall back to SendGrid if direct email fails
  FALLBACK_TO_SENDGRID: true,
};

/**
 * Get the appropriate timeout for a specific operation
 * @param operation The operation to get the timeout for
 * @returns The timeout value in milliseconds
 */
export function getEmailTimeout(operation: keyof typeof EMAIL_TIMEOUTS): number {
  return EMAIL_TIMEOUTS[operation];
}

/**
 * Calculate retry delay with optional exponential backoff
 * @param attempt The current retry attempt (1-based)
 * @returns The delay in milliseconds before the next retry
 */
export function getRetryDelay(attempt: number): number {
  if (EMAIL_RETRY.USE_EXPONENTIAL_BACKOFF) {
    // Exponential backoff: baseDelay * 2^(attempt-1)
    return EMAIL_RETRY.RETRY_DELAY * Math.pow(2, attempt - 1);
  }
  
  return EMAIL_RETRY.RETRY_DELAY;
}

/**
 * Helper to create a promise that rejects after a timeout
 * @param ms Timeout in milliseconds
 * @param errorMessage Error message for the timeout
 * @returns A promise that rejects after the specified timeout
 */
export function createTimeout<T>(ms: number, errorMessage: string): Promise<T> {
  return new Promise<T>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Timeout: ${errorMessage} (${ms}ms)`));
    }, ms);
  });
}

/**
 * Execute a function with a timeout
 * @param fn The function to execute
 * @param timeoutMs Timeout in milliseconds
 * @param errorMessage Error message for the timeout
 * @returns The result of the function or a timeout error
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  errorMessage: string
): Promise<T> {
  return Promise.race([
    fn(),
    createTimeout<T>(timeoutMs, errorMessage)
  ]);
}
