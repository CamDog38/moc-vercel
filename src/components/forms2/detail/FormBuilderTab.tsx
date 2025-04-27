/**
 * Form Builder Tab Component
 * 
 * This component displays the form builder interface.
 */

import React from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { AlertCircle } from 'lucide-react';
import FormBuilder from '@/components/forms2/ui/FormBuilder';
import { useFormDetail } from './FormDetailContext';

export default function FormBuilderTab() {
  const router = useRouter();
  const { 
    form, 
    formConfig, 
    loading, 
    saving, 
    error, 
    hasUnsavedChanges,
    setForm,
    handleFormConfigChange,
    saveFormConfig
  } = useFormDetail();

  if (loading || !formConfig) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        {formConfig && !loading ? (
          <div className="space-y-6">
            <FormBuilder
              formConfig={formConfig}
              onChange={handleFormConfigChange}
              onSave={saveFormConfig}
              onPreview={() => router.push(`/dashboard/forms2/${router.query.id}/preview`)}
              isSaving={saving}
              hasUnsavedChanges={hasUnsavedChanges}
              form={form}
              onUpdateForm={(updates) => {
                if (form) {
                  setForm({
                    ...form,
                    ...updates
                  });
                }
              }}
            />

            <Separator />

            {error && (
              <>
                {/* Debug logging for error object */}
                {console.log('FormBuilderTab - error type:', typeof error)}
                {console.log('FormBuilderTab - error value:', error)}
                {typeof error === 'object' && error !== null && console.log('FormBuilderTab - error keys:', Object.keys(error))}
                
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    {(() => {
                      // Wrap in IIFE for more complex logic
                      console.log('FormBuilderTab - Rendering error description');
                      try {
                        if (typeof error === 'object' && error !== null) {
                          // Handle object errors
                          console.log('FormBuilderTab - Handling object error');
                          if ((error as any).message) {
                            console.log('FormBuilderTab - Using error.message:', (error as any).message);
                            return (error as any).message;
                          } else {
                            const errorStr = JSON.stringify(error);
                            console.log('FormBuilderTab - Using stringified error:', errorStr);
                            return errorStr;
                          }
                        } else {
                          // Handle string errors
                          console.log('FormBuilderTab - Using string error:', error);
                          return error;
                        }
                      } catch (e) {
                        console.error('FormBuilderTab - Error while rendering error:', e);
                        return 'An error occurred';
                      }
                    })()}
                  </AlertDescription>
                </Alert>
              </>
            )}
          </div>
        ) : loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <div className="p-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Failed to load form configuration</AlertTitle>
              <AlertDescription>Please try refreshing the page.</AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
