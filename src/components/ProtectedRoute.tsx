import { useContext, useEffect } from 'react';
import { useRouter } from 'next/router';
import { AuthContext } from '@/contexts/AuthContext';
import { useToast } from "@/components/ui/use-toast";

// Static public routes
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
  /^\/bookings\/[^\/]+\/success$/,
  /^\/invoices\/[^\/]+\/view$/
];

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, userRole, initializing } = useContext(AuthContext);
  const router = useRouter();
  const { toast } = useToast();

  const isPublicRoute = () => {
    // Check static paths
    if (publicPaths.includes(router.pathname)) {
      return true;
    }
    
    // Check dynamic patterns
    const path = router.asPath.split('?')[0]; // Remove query params
    return publicPatterns.some(pattern => pattern.test(path));
  };

  useEffect(() => {
    // If not initializing and not logged in and not on a public route, redirect to login
    if (!initializing && !user && !isPublicRoute()) {
      router.push('/login');
      return;
    }

    // If logged in, has a role, and there are allowed roles specified
    if (!initializing && user && userRole && allowedRoles && allowedRoles.length > 0) {
      // If user's role is not in the allowed roles, redirect to appropriate page
      if (!allowedRoles.includes(userRole)) {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "You don't have permission to access this page.",
        });
        
        // Redirect based on role
        if (userRole === 'MARRIAGE_OFFICER') {
          router.push('/portal');
        } else {
          router.push('/dashboard');
        }
      }
    }
  }, [user, userRole, initializing, router, allowedRoles]);

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // If not logged in and not on a public route, don't render anything
  if (!user && !isPublicRoute()) {
    return null;
  }

  // If role restrictions are in place and user doesn't have the required role, don't render
  if (user && userRole && allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
export { ProtectedRoute };