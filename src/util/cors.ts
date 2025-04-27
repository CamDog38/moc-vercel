import { NextApiRequest, NextApiResponse } from 'next';

interface CorsOptions {
  allowedOrigins?: string[];
  allowedMethods?: string[];
  allowedHeaders?: string[];
  maxAge?: number;
  allowCredentials?: boolean;
}

/**
 * Default CORS configuration
 */
const defaultOptions: CorsOptions = {
  // Default to empty array - will be replaced with environment variable or specific origins
  allowedOrigins: [],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'X-Client-Info',
    'X-Supabase-Auth',
    'X-Supabase-Client'
  ],
  maxAge: 3600, // 1 hour
  allowCredentials: true,
};

/**
 * Get allowed origins from environment or use defaults
 */
function getAllowedOrigins(): string[] {
  // Check for environment variable with comma-separated origins
  const originsFromEnv = process.env.NEXT_PUBLIC_ALLOWED_ORIGINS;
  
  if (originsFromEnv) {
    return originsFromEnv.split(',').map(origin => origin.trim());
  }
  
  // Special handling for preview environment
  if (process.env.NEXT_PUBLIC_CO_DEV_ENV === "preview") {
    return ['https://*.preview.co.dev'];
  }
  
  // Fallback to deployment URL if available
  if (process.env.NEXT_PUBLIC_DEPLOYMENT_URL) {
    return [process.env.NEXT_PUBLIC_DEPLOYMENT_URL];
  }
  
  // Fallback to base URL if available
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return [process.env.NEXT_PUBLIC_BASE_URL];
  }
  
  // Development fallback
  if (process.env.NODE_ENV === 'development') {
    return ['http://localhost:3000'];
  }
  
  // Empty array means no CORS will be allowed
  return [];
}

/**
 * Apply CORS headers to the response
 */
export function applyCorsHeaders(
  req: NextApiRequest,
  res: NextApiResponse,
  options: CorsOptions = {}
): void {
  // Merge options with defaults
  const corsOptions: CorsOptions = {
    ...defaultOptions,
    ...options,
  };
  
  // Get allowed origins, prioritizing passed options
  const allowedOrigins = corsOptions.allowedOrigins?.length 
    ? corsOptions.allowedOrigins 
    : getAllowedOrigins();
  
  // Get the origin from the request
  const requestOrigin = req.headers.origin || '';
  
  // Check if the request origin is allowed
  const isAllowedOrigin = allowedOrigins.includes(requestOrigin) || allowedOrigins.includes('*');
  
  // Set Access-Control-Allow-Origin header
  if (isAllowedOrigin) {
    // Never use wildcard with credentials
    if (requestOrigin && (corsOptions.allowCredentials !== true || requestOrigin !== '*')) {
      res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    } else {
      // If no specific origin matched but we want to allow some CORS access
      if (allowedOrigins.length > 0) {
        // Use the first allowed origin as a fallback
        res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0]);
      }
    }
  } else if (process.env.NEXT_PUBLIC_CO_DEV_ENV === "preview") {
    // Special handling for preview environment
    const previewOrigin = req.headers.origin || '';
    if (previewOrigin.includes('.preview.co.dev')) {
      res.setHeader('Access-Control-Allow-Origin', previewOrigin);
    }
  }
  
  // Set other CORS headers
  if (corsOptions.allowCredentials) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  if (corsOptions.allowedMethods && corsOptions.allowedMethods.length > 0) {
    res.setHeader('Access-Control-Allow-Methods', corsOptions.allowedMethods.join(', '));
  }
  
  if (corsOptions.allowedHeaders && corsOptions.allowedHeaders.length > 0) {
    res.setHeader('Access-Control-Allow-Headers', corsOptions.allowedHeaders.join(', '));
  }
  
  if (corsOptions.maxAge !== undefined) {
    res.setHeader('Access-Control-Max-Age', corsOptions.maxAge.toString());
  }
}

/**
 * CORS middleware for Next.js API routes
 */
export function withCors(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void,
  options: CorsOptions = {}
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Apply CORS headers
    applyCorsHeaders(req, res, options);
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    // Call the original handler
    return handler(req, res);
  };
}