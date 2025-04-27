/**
 * Form Detail Component
 * 
 * This component is the main container for the form detail page.
 */

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormDetailProvider, useFormDetail } from './FormDetailContext';
import FormHeader from './FormHeader';
import FormSettings from './FormSettings';
import FormBuilderTab from './FormBuilderTab';
import FormStyleTab from './FormStyleTab';
import FormSubmissionsTab from './FormSubmissionsTab';

interface FormDetailContainerProps {
  formId: string;
}

export function FormDetailContainer({ formId }: FormDetailContainerProps) {
  return (
    <FormDetailProvider formId={formId}>
      <FormDetailContent />
    </FormDetailProvider>
  );
}

function FormDetailContent() {
  const { activeTab, setActiveTab, loading } = useFormDetail();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <FormHeader />
      
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 mb-6">
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="builder">Form Builder</TabsTrigger>
            <TabsTrigger value="style">Style</TabsTrigger>
            <TabsTrigger value="submissions">Submissions</TabsTrigger>
          </TabsList>
          
          <TabsContent value="settings">
            <FormSettings />
          </TabsContent>
          
          <TabsContent value="builder">
            <FormBuilderTab />
          </TabsContent>
          
          <TabsContent value="style">
            <FormStyleTab />
          </TabsContent>
          
          <TabsContent value="submissions">
            <FormSubmissionsTab />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
