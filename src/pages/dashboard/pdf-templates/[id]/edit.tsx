import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/DashboardLayout';
import PdfTemplateEditor from '@/components/PdfTemplateEditor';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';

interface PdfTemplate {
  id: string;
  name: string;
  description?: string;
  type: 'INVOICE' | 'BOOKING' | 'CERTIFICATE';
  htmlContent: string;
  cssContent?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const EditPdfTemplatePage = () => {
  const { user } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();
  const [template, setTemplate] = useState<PdfTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchTemplate();
    }
  }, [id]);

  const fetchTemplate = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/pdf-templates/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch template');
      }
      const data = await response.json();
      setTemplate(data);
      setError(null);
    } catch (err) {
      setError('Failed to load template');
      toast({
        title: 'Error',
        description: 'Failed to load template',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async (updatedTemplate: any) => {
    try {
      const response = await fetch(`/api/pdf-templates/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedTemplate),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update template');
      }
      
      toast({
        title: 'Success',
        description: 'Template updated successfully',
      });
      
      // Redirect to templates list
      router.push('/dashboard/pdf-templates');
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update template',
        variant: 'destructive',
      });
      throw err;
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/pdf-templates');
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6">
          <p>Loading template...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !template) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6">
          <p className="text-red-500">{error || 'Template not found'}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
      <DashboardLayout>
        <div className="container mx-auto py-6">
          <h1 className="text-2xl font-bold mb-6">Edit PDF Template</h1>
          
          <PdfTemplateEditor
            template={template}
            onSave={handleSaveTemplate}
            onCancel={handleCancel}
          />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default EditPdfTemplatePage;