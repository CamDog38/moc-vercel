/**
 * Form System 2.0 Dashboard - Form Detail
 * 
 * This page displays the details of a form and allows editing its properties.
 * The implementation has been refactored into smaller, more manageable components.
 */

import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { FormDetailContainer } from '@/components/forms2/detail';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function FormDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { initializing } = useAuth();
  
  // Show loading state while checking authentication
  if (initializing) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout>
      {id ? <FormDetailContainer formId={id as string} /> : (
        <div className="container mx-auto py-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Form ID Required</AlertTitle>
            <AlertDescription>No form ID provided. Please select a form from the forms list.</AlertDescription>
          </Alert>
        </div>
      )}
    </DashboardLayout>
  );
}
