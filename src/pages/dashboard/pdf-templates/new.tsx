import React from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/DashboardLayout';
import PdfTemplateEditor from '@/components/PdfTemplateEditor';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';

const NewPdfTemplatePage = () => {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleSaveTemplate = async (template: any) => {
    try {
      const response = await fetch('/api/pdf-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(template),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create template');
      }
      
      toast({
        title: 'Success',
        description: 'Template created successfully',
      });
      
      // Redirect to templates list
      router.push('/dashboard/pdf-templates');
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to create template',
        variant: 'destructive',
      });
      throw err;
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/pdf-templates');
  };

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
      <DashboardLayout>
        <div className="container mx-auto py-6">
          <h1 className="text-2xl font-bold mb-6">Create PDF Template</h1>
          
          <PdfTemplateEditor
            onSave={handleSaveTemplate}
            onCancel={handleCancel}
          />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default NewPdfTemplatePage;