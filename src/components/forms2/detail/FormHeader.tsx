/**
 * Form Header Component
 * 
 * This component displays the form header with actions.
 */

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Save, Eye, Trash2 } from 'lucide-react';
import { useFormDetail } from './FormDetailContext';

export default function FormHeader() {
  const router = useRouter();
  const { 
    form, 
    saving, 
    error, 
    successMessage, 
    hasUnsavedChanges,
    saveFormConfig
  } = useFormDetail();
  const { id } = router.query;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            asChild
          >
            <Link href="/dashboard/forms2">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Forms
            </Link>
          </Button>
          
          <h1 className="text-2xl font-bold">
            {form ? form.name : 'Loading...'}
          </h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/forms/${id}/view`)}
          >
            <Eye className="h-4 w-4 mr-1" />
            View Form
          </Button>
          
          <Button
            variant="default"
            size="sm"
            onClick={saveFormConfig}
            disabled={saving || !hasUnsavedChanges}
          >
            <Save className="h-4 w-4 mr-1" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
          
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (confirm('Are you sure you want to delete this form? This action cannot be undone.')) {
                router.push(`/dashboard/forms2/delete?id=${id}`);
              }
            }}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </div>
      
      {error && (
        <>
          {/* Debug logging for error object */}
          {console.log('FormHeader - error type:', typeof error)}
          {console.log('FormHeader - error value:', error)}
          {typeof error === 'object' && error !== null && console.log('FormHeader - error keys:', Object.keys(error))}
          
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {(() => {
                // Wrap in IIFE for more complex logic
                console.log('FormHeader - Rendering error description');
                try {
                  if (typeof error === 'object' && error !== null) {
                    // Handle object errors
                    console.log('FormHeader - Handling object error');
                    if ((error as any).message) {
                      console.log('FormHeader - Using error.message:', (error as any).message);
                      return (error as any).message;
                    } else {
                      const errorStr = JSON.stringify(error);
                      console.log('FormHeader - Using stringified error:', errorStr);
                      return errorStr;
                    }
                  } else {
                    // Handle string errors
                    console.log('FormHeader - Using string error:', error);
                    return error;
                  }
                } catch (e) {
                  console.error('FormHeader - Error while rendering error:', e);
                  return 'An error occurred';
                }
              })()}
            </AlertDescription>
          </Alert>
        </>
      )}
      
      {successMessage && (
        <Alert className="bg-green-50 text-green-800 border-green-200">
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}
      
      {hasUnsavedChanges && (
        <Alert className="bg-yellow-50 text-yellow-800 border-yellow-200">
          <AlertTitle>Unsaved Changes</AlertTitle>
          <AlertDescription>
            You have unsaved changes. Click the Save button to save your changes.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
