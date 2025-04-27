import { NextApiRequest } from 'next';

/**
 * Gets the base URL for the application, handling both local development and production environments
 */
export function getBaseUrl(req?: NextApiRequest): string {
  // PRIORITY 1: PRODUCTION ENVIRONMENT CHECK
  // If we're in production and have a base URL configured, use it first
  if (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production') {
    if (process.env.NEXT_PUBLIC_BASE_URL) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Using NEXT_PUBLIC_BASE_URL in production:', process.env.NEXT_PUBLIC_BASE_URL);
      }
      return process.env.NEXT_PUBLIC_BASE_URL;
    }
  }

  // PRIORITY 2: REQUEST OBJECT RESOLUTION
  // If we have a request object, try to determine the base URL from it
  if (req) {
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
    const requestUrl = `${protocol}://${host}`;
    if (process.env.NODE_ENV !== 'production') {
      console.log('Using request-based URL resolution:', requestUrl);
    }
    return requestUrl;
  }
  
  // PRIORITY 3: CLIENT-SIDE RESOLUTION
  // If we're in the browser, use the window.location
  if (typeof window !== 'undefined') {
    const clientUrl = window.location.origin;
    if (process.env.NODE_ENV !== 'production') {
      console.log('Using client-side window location URL:', clientUrl);
    }
    return clientUrl;
  }
  
  // PRIORITY 4: VERCEL URL RESOLUTION
  // Only use Vercel's URL when not in production
  if (process.env.VERCEL_URL && process.env.VERCEL_ENV !== 'production') {
    const vercelUrl = `https://${process.env.VERCEL_URL}`;
    if (process.env.NODE_ENV !== 'production') {
      console.log('Using Vercel URL in non-production environment:', vercelUrl);
    }
    return vercelUrl;
  }
  
  // PRIORITY 5: ENVIRONMENT-SPECIFIC RESOLUTION
  // Check for co.dev preview environment
  if (process.env.NEXT_PUBLIC_CO_DEV_ENV === 'preview') {
    if (process.env.NODE_ENV !== 'production') {
      console.log('In co.dev preview environment but no VERCEL_URL available');
    }
  }
  
  // Check for Vercel preview/development deployment
  if (process.env.VERCEL_ENV === 'preview' || process.env.VERCEL_ENV === 'development') {
    if (process.env.NODE_ENV !== 'production') {
      console.log('In Vercel preview/development environment but no VERCEL_URL available');
    }
  }
  
  // PRIORITY 6: FALLBACK TO ENVIRONMENT VARIABLES
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('Using NEXT_PUBLIC_SITE_URL:', process.env.NEXT_PUBLIC_SITE_URL);
    }
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  
  // PRIORITY 7: PRODUCTION URL FALLBACK
  // Additional check for production URL
  if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_CO_DEV_ENV) {
    if (process.env.NEXT_PUBLIC_BASE_URL) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Using NEXT_PUBLIC_BASE_URL in production (fallback):', process.env.NEXT_PUBLIC_BASE_URL);
      }
      return process.env.NEXT_PUBLIC_BASE_URL;
    }
  }
  
  // PRIORITY 8: DEVELOPMENT FALLBACK
  if (process.env.NODE_ENV === 'development') {
    const devUrl = 'http://localhost:3000';
    if (process.env.NODE_ENV !== 'production') {
      console.log('Using development localhost URL:', devUrl);
    }
    return devUrl;
  }
  
  // If all else fails, log an error and use localhost as final fallback
  console.error('Could not determine base URL from any available context, using localhost fallback');
  return 'http://localhost:3000';
}
