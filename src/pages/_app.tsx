import type { AppProps } from 'next/app'
import { AuthProvider } from '@/contexts/AuthContext'
import '../styles/globals.css';
import { Toaster } from "@/components/ui/toaster"
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

export default function App({ Component, pageProps }: AppProps) {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);
    const colorScheme = computedStyle.getPropertyValue('--mode').trim().replace(/"/g, '');
    if (colorScheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.add('light');
    }
    setMounted(true);
  }, []);

  // Prevent flash while theme loads
  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <AuthProvider>
        {router.isReady ? (
          (() => {
            // Only check routes when router is ready
            const publicRoutes = ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/magic-link-login', '/auth/callback', '/error'];
            const isPublicRoute = publicRoutes.includes(router.pathname) || 
                                router.pathname.startsWith('/forms/') || 
                                router.pathname.startsWith('/forms2/') && router.pathname.includes('/view') || 
                                (router.pathname.startsWith('/bookings/') && router.pathname.includes('/success'));
            
            // Don't apply dashboard layout to form public views
            const isFormPublicView = router.pathname.startsWith('/forms2/') && router.pathname.includes('/view');
            
            return isFormPublicView ? (
              <Component {...pageProps} />
            ) : (
              <DashboardLayout requireAuth={!isPublicRoute}>
                <Component {...pageProps} />
              </DashboardLayout>
            );
          })()
        ) : (
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
          </div>
        )}
        <Toaster />
      </AuthProvider>
    </div>
  )
}