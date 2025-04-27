import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public paths that don't require authentication
const publicPaths = [
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/magic-link-login',
  '/reset-password',
  '/auth/callback',
  '/error'
];

// Dynamic public route patterns
const publicPatterns = [
  /^\/forms\/[^\/]+\/view$/,
  /^\/forms\/[^\/]+\/success$/,
  /^\/forms2\/[^\/]+\/view$/,
  /^\/bookings\/[^\/]+\/success$/,
  /^\/invoices\/[^\/]+\/view$/
];

// Function to apply security headers consistently across all responses
function applySecurityHeaders(response: NextResponse): NextResponse {
  // Content Security Policy - Allow necessary resources while maintaining security
  // In development mode, include 'unsafe-eval' for hot module replacement
  const isDevelopment = process.env.NODE_ENV === 'development';
  const scriptSrc = isDevelopment 
    ? "'self' 'unsafe-eval' https://assets.co.dev" 
    : "'self' https://assets.co.dev";
    
  response.headers.set(
    'Content-Security-Policy',
    `default-src 'self'; script-src ${scriptSrc}; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https://assets.co.dev; connect-src 'self' https://*.supabase.co https://*.preview.co.dev; font-src 'self' https://fonts.gstatic.com; object-src 'none'; frame-ancestors 'self'; form-action 'self'; base-uri 'self';`
  );
  
  // Standard security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  
  // HSTS with includeSubDomains directive
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
  
  // Cache control
  response.headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
  
  // Additional security headers requested
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy', 
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'
  );
  
  // Clear-Site-Data header is typically used for logout scenarios
  // Not setting it globally as it would clear data on every request
  
  return response;
}

export function middleware(req: NextRequest) {
  // Get the response
  const response = NextResponse.next();
  
  // Apply security headers
  applySecurityHeaders(response);
  
  // Get the pathname
  const path = req.nextUrl.pathname;
  
  // Function to check if this is a public route
  const isPublicRoute = () => {
    // Check static paths
    if (publicPaths.some(publicPath => path === publicPath)) {
      return true;
    }
    
    // Check dynamic patterns
    return publicPatterns.some(pattern => pattern.test(path));
  };
  
  // Allow public routes
  if (isPublicRoute()) {
    return response;
  }
  
  // Allow API routes - they have their own authorization
  if (path.startsWith('/api/')) {
    return response;
  }
  
  // Allow auth routes
  if (path.startsWith('/auth/')) {
    return response;
  }
  
  // Read user info from cookies
  const userRole = req.cookies.get('user_role')?.value;
  
  // If no role cookie found, allow the client-side ProtectedRoute to handle it
  if (!userRole) {
    return response;
  }
  
  // Apply role-based access control for dashboard routes
  if (path.startsWith('/dashboard') && userRole === 'MARRIAGE_OFFICER') {
    if (process.env.NODE_ENV !== 'production') {
      console.log('Middleware redirecting marriage officer from dashboard to portal');
    }
    // For redirects, we need to create a new response with the headers
    const redirectResponse = NextResponse.redirect(new URL('/portal', req.url));
    // Apply security headers to redirect response
    applySecurityHeaders(redirectResponse);
    return redirectResponse;
  }
  
  // Allow access to other routes
  return response;
}

// Configure which paths this middleware applies to
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};