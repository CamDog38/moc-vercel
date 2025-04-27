/**
 * Utility functions for handling API requests and responses
 */

// Directly import debug for console output only, not for API logs
import { debug } from './logger';

/**
 * Gets the base URL for the application based on the current environment
 * @returns The base URL to use for API calls and links
 */
export function getBaseUrl(): string {
  try {
    // Log environment information for debugging
    if (typeof window === 'undefined') {
      debug('Environment context:', 'system', {
        NODE_ENV: process.env.NODE_ENV,
        CO_DEV_ENV: process.env.NEXT_PUBLIC_CO_DEV_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV,
        VERCEL_URL: process.env.VERCEL_URL ? 'set' : 'not set',
        BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || 'not set',
        DEPLOYMENT_URL: process.env.NEXT_PUBLIC_DEPLOYMENT_URL || 'not set'
      });
    }

    // PRIORITY 1: PRODUCTION ENVIRONMENT CHECK
    // If we're in production and have a base URL configured, use it first
    if (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production' && process.env.NEXT_PUBLIC_BASE_URL) {
      // Avoid logging in production
      return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, '');
    }

    // PRIORITY 2: CLIENT-SIDE RESOLUTION
    // For client-side in any environment, use the current window location
    if (typeof window !== 'undefined') {
      const clientUrl = `${window.location.protocol}//${window.location.host}`;
      // Uncomment for debugging if needed
      // console.log('Using client-side window location URL:', clientUrl);
      return clientUrl;
    }
    
    // PRIORITY 3: VERCEL URL RESOLUTION
    // Only use Vercel's URL when not in production
    if (process.env.VERCEL_URL && process.env.VERCEL_ENV !== 'production') {
      const vercelUrl = `https://${process.env.VERCEL_URL}`;
      // Uncomment for debugging if needed
      // console.log('Using Vercel URL in non-production environment:', vercelUrl);
      return vercelUrl;
    }
    
    // PRIORITY 4: ENVIRONMENT-BASED RESOLUTION
    // For server-side calls, prioritize based on environment
    if (typeof window === 'undefined') {
      // Development environment - always use localhost
      if (process.env.NODE_ENV === 'development') {
        const devUrl = `http://localhost:${process.env.PORT || 3000}`;
        // Uncomment for debugging if needed
        // console.log('Using development localhost URL:', devUrl);
        return devUrl;
      }
      
      // Check for co.dev preview environment
      if (process.env.NEXT_PUBLIC_CO_DEV_ENV === 'preview') {
        debug('In co.dev preview environment but no VERCEL_URL available');
      }
      
      // Check for Vercel preview/development deployment
      if (process.env.VERCEL_ENV === 'preview' || process.env.VERCEL_ENV === 'development') {
        debug('In Vercel preview/development environment but no VERCEL_URL available');
      }
    }
    
    // PRIORITY 5: EXPLICIT BASE URL CONFIGURATION
    // Use NEXT_PUBLIC_BASE_URL if available and not in a preview environment
    if (process.env.NEXT_PUBLIC_BASE_URL) {
      // Don't use production URL in preview environments
      const isPreviewEnv = 
        process.env.NEXT_PUBLIC_CO_DEV_ENV === 'preview' || 
        process.env.VERCEL_ENV === 'preview' ||
        process.env.VERCEL_ENV === 'development';
        
      if (!isPreviewEnv) {
        // Uncomment for debugging if needed
        // console.log('Using explicitly configured NEXT_PUBLIC_BASE_URL:', process.env.NEXT_PUBLIC_BASE_URL);
        return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, '');
      } else {
        debug('Skipping NEXT_PUBLIC_BASE_URL in preview environment');
      }
    }
    
    // PRIORITY 6: DEPLOYMENT URL FALLBACK
    // Use NEXT_PUBLIC_DEPLOYMENT_URL as a last resort
    if (process.env.NEXT_PUBLIC_DEPLOYMENT_URL) {
      // Uncomment for debugging if needed
      // console.log('Using deployment URL fallback:', process.env.NEXT_PUBLIC_DEPLOYMENT_URL);
      return process.env.NEXT_PUBLIC_DEPLOYMENT_URL.replace(/\/$/, '');
    }
    
    // If all else fails, log an error and return a default
    console.error('Could not determine base URL from any available context');
    if (process.env.NODE_ENV === 'development') {
      return 'http://localhost:3000';
    }
    return '';
  } catch (error) {
    console.error('Error determining base URL:', error);
    return process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : '';
  }
}

/**
 * Safely makes an external API request with proper error handling
 * @param url The URL to fetch
 * @param options Fetch options
 * @returns The response data or throws an enhanced error
 */
export async function safeExternalApiCall<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    if (!url) {
      throw new Error('No URL provided for API call');
    }

    // Add default timeout using AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: options.signal || controller.signal,
    });
    
    // Clear timeout
    clearTimeout(timeoutId);

    // Check if the response is OK
    if (!response.ok) {
      // Try to get error details from response
      let errorDetails = '';
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorJson = await response.json();
          errorDetails = JSON.stringify(errorJson);
        } else {
          // For non-JSON responses, get a preview of the content
          const text = await response.text();
          errorDetails = text.substring(0, 100) + (text.length > 100 ? '...' : '');
        }
      } catch (parseError) {
        errorDetails = 'Could not parse error response';
      }

      // Create a detailed error
      const error = new Error(`External API error: ${response.status} ${response.statusText}`);
      (error as any).status = response.status;
      (error as any).statusText = response.statusText;
      (error as any).url = url;
      (error as any).details = errorDetails;
      
      throw error;
    }

    // Parse the response
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json() as T;
    } else {
      const text = await response.text();
      return text as unknown as T;
    }
  } catch (error) {
    // Handle abort errors specifically
    if (error instanceof DOMException && error.name === 'AbortError') {
      const timeoutError = new Error(`API call to ${url} timed out after 30 seconds`);
      (timeoutError as any).status = 408; // Request Timeout
      (timeoutError as any).url = url;
      throw timeoutError;
    }
    
    // Enhance the error with more context
    if (error instanceof Error) {
      error.message = `API call failed to ${url}: ${error.message}`;
    }
    throw error;
  }
}

/**
 * Logs API errors in a consistent format
 * @param error The error to log
 * @param context Additional context information
 */
export function logApiError(error: any, context: string): void {
  console.error(`API Error in ${context}:`, {
    message: error.message,
    status: error.status,
    statusText: error.statusText,
    url: error.url,
    details: error.details,
    stack: error.stack,
  });
  
  // Import the logApiError from logger to avoid circular dependencies
  import('./logger').then(({ logApiError }) => {
    logApiError(error, context);
  }).catch(err => {
    console.error('Failed to load logger for API error:', err);
  });
}

/**
 * Checks if a request is an internal server-to-server API call
 * @param req The Next.js API request object
 * @returns Boolean indicating if this is an internal API call
 */
export function isInternalApiCall(req: any): boolean {
  return (
    // Check for our special internal API call header
    (req.headers && req.headers['x-internal-api-call'] === 'true') ||
    // In development, check if request is from localhost
    (process.env.NODE_ENV === 'development' && 
     req.headers && 
     (req.headers.host?.includes('localhost') || 
      req.headers['x-forwarded-host']?.includes('localhost'))) ||
    // For production, check if it's a server-side API call with axios
    (req.headers && req.headers['user-agent']?.includes('axios'))
  );
}