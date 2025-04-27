import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from "@/components/ui/use-toast";

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
  /^\/bookings\/[^\/]+\/success$/,
  /^\/invoices\/[^\/]+\/view$/
];

interface RoleBasedAccessControlProps {
  children: ReactNode;
}

export default function RoleBasedAccessControl({ children }: RoleBasedAccessControlProps) {
  const router = useRouter();
  const { user, userRole, initializing } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // Skip for public routes and when initializing
    if (initializing || !user || !userRole) return;

    const path = router.pathname;
    
    // Function to check if this is a public route
    const isPublicRoute = () => {
      // Check static paths
      if (publicPaths.includes(path)) {
        return true;
      }
      
      // Check dynamic patterns
      return publicPatterns.some(pattern => pattern.test(path));
    };
    
    // Skip redirect for public routes
    if (isPublicRoute()) return;
    
    // Apply role-based access control
    if (userRole === 'MARRIAGE_OFFICER' && path.startsWith('/dashboard')) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Redirecting marriage officer from dashboard to portal');
      }
      
      toast({
        title: "Access Restricted",
        description: "Marriage officers can only access the portal section",
        variant: "destructive",
      });
      
      router.push('/portal');
      return;
    }
    
    // Only admins and super admins can access dashboard
    if (path.startsWith('/dashboard') && !['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`User with role ${userRole} not allowed to access dashboard`);
      }
      
      toast({
        title: "Access Denied",
        description: "You don't have permission to access the dashboard",
        variant: "destructive",
      });
      
      router.push('/portal');
      return;
    }
    
    // Only allowed roles can access portal
    if (path.startsWith('/portal') && !['MARRIAGE_OFFICER', 'ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`User with role ${userRole} not allowed to access portal`);
      }
      
      toast({
        title: "Access Denied",
        description: "You don't have permission to access the portal",
        variant: "destructive",
      });
      
      router.push('/dashboard');
      return;
    }
  }, [router, user, userRole, initializing, router.pathname, toast]);

  // Just render children - redirects are handled in the effect
  return <>{children}</>;
} 