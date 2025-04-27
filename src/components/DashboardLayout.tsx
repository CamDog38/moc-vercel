import React, { ReactNode } from 'react';
import { TopNav } from './TopNav';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/router';
import ProtectedRoute from './ProtectedRoute';

interface DashboardLayoutProps {
  children: ReactNode;
  requireAuth?: boolean;
}

export default function DashboardLayout({ 
  children, 
  requireAuth = true 
}: DashboardLayoutProps) {
  const { user, initializing } = useAuth();
  const router = useRouter();

  // Public routes that should never show the navigation
  const noNavRoutes = ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/magic-link-login'];
  
  // Check if this is a public form view or success page
  const isPublicFormView = router.pathname.includes('/forms/[id]/view');
  const isFormSuccessPage = router.pathname.includes('/forms/[id]/success');
  const isInvoiceViewPage = router.pathname.includes('/invoices/[id]/view');
  const isFormEditPage = router.pathname.includes('/forms/[id]/edit');
  
  // Check if this is a debug page
  const isDebugPage = router.pathname.startsWith('/debug/');
  
  const shouldShowNav = !noNavRoutes.includes(router.pathname) && 
                        !isPublicFormView && 
                        !isFormSuccessPage && 
                        !isInvoiceViewPage &&
                        !isFormEditPage &&
                        !isDebugPage &&
                        (user || router.pathname.startsWith('/forms/'));

  // Content with appropriate navigation
  const content = (
    <div className="min-h-screen bg-background flex flex-col">
      {shouldShowNav && <TopNav />}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );

  // If authentication is required, wrap with ProtectedRoute
  if (requireAuth) {
    return <ProtectedRoute>{content}</ProtectedRoute>;
  }

  // For public pages
  return content;
}