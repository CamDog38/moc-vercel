import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import PdfTemplateList from '@/components/PdfTemplateList';
import PdfTemplateEditor from '@/components/PdfTemplateEditor';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button'; 

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

const PdfTemplatesPage = () => {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<PdfTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<PdfTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<PdfTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Handle filter from URL query parameter
  useEffect(() => {
    if (router.query.filter && typeof router.query.filter === 'string') {
      const filterType = router.query.filter.toUpperCase();
      if (['INVOICE', 'BOOKING', 'CERTIFICATE'].includes(filterType)) {
        setActiveFilter(filterType);
      }
    }
  }, [router.query.filter]);

  // Apply filtering when templates or activeFilter changes
  useEffect(() => {
    if (activeFilter) {
      setFilteredTemplates(templates.filter(template => template.type === activeFilter));
    } else {
      setFilteredTemplates(templates);
    }
  }, [templates, activeFilter]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/pdf-templates');
      if (!response.ok) {
        throw new Error('Failed to fetch PDF templates');
      }
      const data = await response.json();
      setTemplates(data);
      // Apply initial filtering
      if (activeFilter) {
        setFilteredTemplates(data.filter(template => template.type === activeFilter));
      } else {
        setFilteredTemplates(data);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      setError(error.message);
      toast({
        title: 'Error',
        description: 'Failed to load PDF templates',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setIsCreating(true);
  };

  const handleEditTemplate = (template: PdfTemplate) => {
    setEditingTemplate(template);
    setIsCreating(false);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const response = await fetch(`/api/pdf-templates/${templateId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete template');
      }

      toast({
        title: 'Success',
        description: 'Template deleted successfully',
      });

      // Refresh templates
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete template',
        variant: 'destructive',
      });
    }
  };

  const handleSaveTemplate = async (templateData: Partial<PdfTemplate>) => {
    try {
      let response;
      
      if (isCreating) {
        // Create new template
        response = await fetch('/api/pdf-templates', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(templateData),
        });
      } else if (editingTemplate) {
        // Update existing template
        response = await fetch(`/api/pdf-templates/${editingTemplate.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(templateData),
        });
      }

      if (!response.ok) {
        throw new Error('Failed to save template');
      }

      toast({
        title: 'Success',
        description: isCreating ? 'Template created successfully' : 'Template updated successfully',
      });

      // Reset state and refresh templates
      setIsCreating(false);
      setEditingTemplate(null);
      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: 'Error',
        description: 'Failed to save template',
        variant: 'destructive',
      });
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingTemplate(null);
  };

  const handleFilterChange = (type: string | null) => {
    setActiveFilter(type);
    
    // Update URL query parameter
    if (type) {
      router.push({
        pathname: router.pathname,
        query: { ...router.query, filter: type.toLowerCase() },
      }, undefined, { shallow: true });
    } else {
      const { filter, ...restQuery } = router.query;
      router.push({
        pathname: router.pathname,
        query: restQuery,
      }, undefined, { shallow: true });
    }
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">PDF Templates</h1>
          <div className="flex space-x-2">
            {router.pathname.includes('/dashboard/pdf-templates') && (
              <Button variant="outline" onClick={() => router.push('/dashboard/settings')}>
                Back to Settings
              </Button>
            )}
          </div>
        </div>
        
        {isCreating || editingTemplate ? (
          <PdfTemplateEditor
            template={editingTemplate || undefined}
            defaultType={activeFilter as 'INVOICE' | 'BOOKING' | 'CERTIFICATE' | undefined}
            onSave={handleSaveTemplate}
            onCancel={handleCancel}
          />
        ) : (
          <PdfTemplateList
            templates={filteredTemplates}
            onEdit={handleEditTemplate}
            onDelete={handleDeleteTemplate}
            onCreateNew={handleCreateTemplate}
            activeFilter={activeFilter}
          />
        )}
      </div>
    </div>
  );
};

export default PdfTemplatesPage;
