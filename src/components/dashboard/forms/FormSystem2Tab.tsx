/**
 * Form System 2.0 Tab Component
 * 
 * This component provides a tab interface for the Form System 2.0 builder
 * that can be integrated into the existing form edit page.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, AlertTriangle } from 'lucide-react';
import FormBuilder2 from '@/components/forms2/FormBuilder2';
import { FormConfig, FormSection, FieldConfig } from '@/lib/forms2/core/types';
import { generateId } from '@/lib/forms2/utils/idUtils';

interface FormSystem2TabProps {
  formId: string;
  formName: string;
  formDescription: string;
  formType: 'INQUIRY' | 'BOOKING';
}

export default function FormSystem2Tab({
  formId,
  formName,
  formDescription,
  formType
}: FormSystem2TabProps) {
  const router = useRouter();
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasConverted, setHasConverted] = useState(false);

  // Fetch form2 config if it exists
  useEffect(() => {
    if (formId) {
      fetchForm2Config();
    }
  }, [formId]);

  // Fetch form2 configuration
  const fetchForm2Config = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/forms2/${formId}`);
      
      if (response.data && response.data.formConfig) {
        setFormConfig(response.data.formConfig);
      } else {
        // No Form2 config exists yet
        setFormConfig(null);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching Form2 config:', err);
      // If 404, it means the form doesn't have a Form2 config yet
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setFormConfig(null);
      } else {
        setError('Failed to load Form System 2.0 configuration. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Convert legacy form to Form System 2.0
  const convertToForm2 = async () => {
    try {
      setSaving(true);
      
      // Fetch legacy form data
      const legacyResponse = await axios.get(`/api/forms/${formId}`);
      const legacyForm = legacyResponse.data;
      
      // Create a new Form2 configuration
      const newFormConfig: FormConfig = {
        id: generateId('form'),
        title: formName,
        description: formDescription,
        sections: [],
        version: 'modern',
        isMultiPage: legacyForm.isMultiPage || false,
        submitButtonText: 'Submit',
        successMessage: 'Thank you for your submission!'
      };
      
      // Convert legacy sections or create a default section
      if (legacyForm.formSections && legacyForm.formSections.length > 0) {
        newFormConfig.sections = legacyForm.formSections.map((section: any, index: number) => {
          return {
            id: section.id || generateId('section'),
            title: section.title || `Section ${index + 1}`,
            description: section.description || '',
            fields: convertLegacyFields(section.fields || []),
            order: section.order || index + 1
          };
        });
      } else if (legacyForm.sections && legacyForm.sections.length > 0) {
        newFormConfig.sections = legacyForm.sections.map((section: any, index: number) => {
          return {
            id: section.id || generateId('section'),
            title: section.title || `Section ${index + 1}`,
            description: section.description || '',
            fields: convertLegacyFields(section.fields || []),
            order: section.order || index + 1
          };
        });
      } else if (legacyForm.fields && legacyForm.fields.length > 0) {
        // If no sections but has fields, create a default section
        newFormConfig.sections = [{
          id: generateId('section'),
          title: 'Form Fields',
          description: '',
          fields: convertLegacyFields(legacyForm.fields),
          order: 1
        }];
      } else {
        // Create an empty default section
        newFormConfig.sections = [{
          id: generateId('section'),
          title: 'Form Fields',
          description: '',
          fields: [],
          order: 1
        }];
      }
      
      // Save the new Form2 configuration
      await axios.post(`/api/forms2`, {
        formId: formId,
        title: formName,
        description: formDescription,
        formConfig: newFormConfig,
        isActive: true,
        isPublic: true,
        legacyFormId: formId
      });
      
      setFormConfig(newFormConfig);
      setHasConverted(true);
      setSuccessMessage('Successfully converted to Form System 2.0!');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      console.error('Error converting to Form System 2.0:', err);
      setError('Failed to convert to Form System 2.0. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Convert legacy fields to Form System 2.0 fields
  const convertLegacyFields = (legacyFields: any[]): FieldConfig[] => {
    if (!Array.isArray(legacyFields) || legacyFields.length === 0) {
      return [];
    }
    
    return legacyFields.map((field: any) => {
      // Base field properties
      const baseField = {
        id: field.id || generateId('field'),
        name: field.id || generateId('name'),
        label: field.label || 'Unnamed Field',
        placeholder: field.placeholder || '',
        helpText: field.helpText || '',
        required: !!field.required,
        disabled: false,
        hidden: false,
        stableId: field.stableId || null,
        inUseByRules: !!field.inUseByRules,
        conditionalLogic: field.conditionalLogic ? {
          ...field.conditionalLogic
        } : undefined,
        mapping: field.mapping ? {
          type: field.mapping,
          value: field.mapping,
          customKey: undefined
        } : undefined
      };
      
      // Handle field type-specific properties
      switch (field.type) {
        case 'select':
          return {
            ...baseField,
            type: 'select',
            options: Array.isArray(field.options) 
              ? field.options.map((opt: string, i: number) => ({
                  id: generateId('option'),
                  label: opt,
                  value: opt.toLowerCase().replace(/\s+/g, '_')
                }))
              : []
          };
        
        case 'checkbox':
          return {
            ...baseField,
            type: 'checkbox',
            options: Array.isArray(field.options) 
              ? field.options.map((opt: string, i: number) => ({
                  id: generateId('option'),
                  label: opt,
                  value: opt.toLowerCase().replace(/\s+/g, '_')
                }))
              : []
          };
        
        case 'radio':
          return {
            ...baseField,
            type: 'radio',
            options: Array.isArray(field.options) 
              ? field.options.map((opt: string, i: number) => ({
                  id: generateId('option'),
                  label: opt,
                  value: opt.toLowerCase().replace(/\s+/g, '_')
                }))
              : []
          };
        
        case 'date':
          return {
            ...baseField,
            type: 'date',
            excludeTime: field.excludeTime
          };
        
        case 'dob':
          return {
            ...baseField,
            type: 'date',
            excludeTime: true
          };
        
        default:
          return {
            ...baseField,
            type: field.type || 'text'
          };
      }
    });
  };

  // Save form configuration
  const saveFormConfig = async () => {
    if (!formConfig) return;
    
    try {
      setSaving(true);
      await axios.put(`/api/forms2/${formId}`, {
        formConfig
      });
      
      setSuccessMessage('Form builder changes saved successfully!');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      console.error('Error saving form config:', err);
      setError('Failed to save form configuration. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Update form configuration
  const handleFormConfigChange = (updatedConfig: FormConfig) => {
    setFormConfig(updatedConfig);
  };

  return (
    <div className="space-y-6">
      {successMessage && (
        <Alert className="bg-green-50 border-green-200">
          <AlertTitle className="text-green-800">Success</AlertTitle>
          <AlertDescription className="text-green-700">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}
      
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {!formConfig && !loading ? (
        <Card>
          <CardHeader>
            <CardTitle>Form System 2.0</CardTitle>
            <CardDescription>
              Upgrade to our new form builder with enhanced features and improved performance.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Information</AlertTitle>
              <AlertDescription>
                This form has not been migrated to Form System 2.0 yet. Converting will create a new Form 2.0 version while preserving your original form.
              </AlertDescription>
            </Alert>
            
            <div className="flex justify-end">
              <Button 
                onClick={convertToForm2} 
                disabled={saving}
              >
                {saving ? "Converting..." : "Convert to Form System 2.0"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          {hasConverted && (
            <Alert className="bg-blue-50 border-blue-200 mb-4">
              <Info className="h-4 w-4" />
              <AlertTitle className="text-blue-800">Form Converted</AlertTitle>
              <AlertDescription className="text-blue-700">
                Your form has been successfully converted to Form System 2.0. You can now use the new builder to edit your form.
              </AlertDescription>
            </Alert>
          )}
          
          {formConfig && (
            <FormBuilder2 
              formConfig={formConfig}
              onChange={handleFormConfigChange}
              onSave={saveFormConfig}
              onPreview={() => router.push(`/forms2/${formId}/view`)}
              loading={saving}
              error={error}
            />
          )}
        </>
      )}
    </div>
  );
}
