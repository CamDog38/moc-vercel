/**
 * Form System 2.0 Dashboard - Form Preview
 * 
 * This page displays a preview of how the form will appear to end users.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { FormConfig, FormSection, FieldConfig } from '@/lib/forms2/core/types';
import MultiStepFormRenderer from '@/components/forms2/MultiStepFormRenderer';

export default function FormPreview() {
  const router = useRouter();
  const { id } = router.query;
  const { user, initializing } = useAuth();
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  // Fetch form when the component mounts or the ID changes
  useEffect(() => {
    if (!initializing && user && id) {
      fetchForm();
    }
  }, [initializing, user, id]);

  // Fetch form from the API
  const fetchForm = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/forms2/${id}`);
      setFormConfig(response.data.formConfig);
      setError(null);
    } catch (err) {
      console.error('Error fetching form:', err);
      setError('Failed to load form. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle field change
  const handleFieldChange = (fieldId: string, value: any) => {
    setFormValues(prev => ({
      ...prev,
      [fieldId]: value
    }));

    // Clear error when field is changed
    if (formErrors[fieldId]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  // Handle next step
  const handleNext = () => {
    // Validate current section fields
    if (formConfig) {
      const currentSection = formConfig.sections[activeStep];
      const errors: Record<string, string> = {};

      currentSection.fields.forEach(field => {
        if (field.required && (!formValues[field.id] || formValues[field.id] === '')) {
          errors[field.id] = 'This field is required';
        }
      });

      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        return;
      }
    }

    if (formConfig && activeStep < formConfig.sections.length - 1) {
      setActiveStep(prev => prev + 1);
    } else {
      // Submit the form
      handleSubmit();
    }
  };

  // Handle back step
  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      // In a real implementation, this would submit the form data to the API
      // await axios.post(`/api/forms2/${id}/submissions`, { data: formValues });
      
      // For preview purposes, we'll just simulate a successful submission
      setSubmitted(true);
    } catch (err) {
      console.error('Error submitting form:', err);
      setError('Failed to submit form. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Reset the form
  const resetForm = () => {
    setFormValues({});
    setFormErrors({});
    setActiveStep(0);
    setSubmitted(false);
  };

  // Render a field based on its type
  const renderField = (field: FieldConfig) => {
    const { id, type, label, placeholder, required, helpText } = field;
    const value = formValues[id] || '';
    const error = formErrors[id];

    switch (type) {
      case 'text':
      case 'email':
      case 'tel':
      case 'number':
      case 'date':
      case 'time':
      case 'datetime':
        return (
          <div key={id} className="space-y-2">
            <Label htmlFor={id}>
              {label}{required && ' *'}
            </Label>
            <Input
              id={id}
              type={type === 'datetime' ? 'datetime-local' : type}
              value={value}
              onChange={(e) => handleFieldChange(id, e.target.value)}
              placeholder={placeholder}
              required={required}
              className={error ? 'border-destructive' : ''}
            />
            {(error || helpText) && (
              <p className={`text-xs ${error ? 'text-destructive' : 'text-muted-foreground'}`}>
                {error || helpText}
              </p>
            )}
          </div>
        );
      
      case 'text': // Handle textarea as text with multiline
        return (
          <div key={id} className="space-y-2">
            <Label htmlFor={id}>
              {label}{required && ' *'}
            </Label>
            <Textarea
              id={id}
              value={value}
              onChange={(e) => handleFieldChange(id, e.target.value)}
              placeholder={placeholder}
              required={required}
              className={error ? 'border-destructive' : ''}
              rows={4}
            />
            {(error || helpText) && (
              <p className={`text-xs ${error ? 'text-destructive' : 'text-muted-foreground'}`}>
                {error || helpText}
              </p>
            )}
          </div>
        );
      
      case 'checkbox':
        return (
          <div key={id} className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id={id}
                checked={!!value}
                onCheckedChange={(checked) => handleFieldChange(id, checked)}
              />
              <Label htmlFor={id}>
                {label}{required && ' *'}
              </Label>
            </div>
            {(error || helpText) && (
              <p className={`text-xs ${error ? 'text-destructive' : 'text-muted-foreground'}`}>
                {error || helpText}
              </p>
            )}
          </div>
        );
      
      case 'radio':
        if (field.options) {
          return (
            <div key={id} className="space-y-2">
              <Label>
                {label}{required && ' *'}
              </Label>
              <RadioGroup
                value={value}
                onValueChange={(value) => handleFieldChange(id, value)}
              >
                <div className="space-y-2">
                  {field.options.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.value} id={`${id}-${option.value}`} />
                      <Label htmlFor={`${id}-${option.value}`}>{option.label}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
              {(error || helpText) && (
                <p className={`text-xs ${error ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {error || helpText}
                </p>
              )}
            </div>
          );
        }
        return null;
      
      case 'select':
      case 'multiselect':
        if (field.options) {
          // Note: shadcn/ui Select doesn't support multiselect out of the box
          // For multiselect, you might need a custom component or another library
          return (
            <div key={id} className="space-y-2">
              <Label htmlFor={id}>
                {label}{required && ' *'}
              </Label>
              <Select
                value={value || ''}
                onValueChange={(value) => handleFieldChange(id, value)}
              >
                <SelectTrigger id={id} className={error ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  {field.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(error || helpText) && (
                <p className={`text-xs ${error ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {error || helpText}
                </p>
              )}
            </div>
          );
        }
        return null;
      
      case 'file':
        return (
          <div key={id} className="space-y-2">
            <Label htmlFor={id}>
              {label}{required && ' *'}
            </Label>
            <div>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
                type="button"
                onClick={() => document.getElementById(`${id}-file`)?.click()}
              >
                <input
                  id={`${id}-file`}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFieldChange(id, e.target.files[0]);
                    }
                  }}
                />
                {value ? 
                  typeof value === 'object' ? (value as File).name : value 
                  : 'Upload file'}
              </Button>
            </div>
            {(error || helpText) && (
              <p className={`text-xs ${error ? 'text-destructive' : 'text-muted-foreground'}`}>
                {error || helpText}
              </p>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  // If the user is not authenticated, redirect to the login page
  if (initializing) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="container py-6 max-w-4xl">
        <div className="flex items-center mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/forms2/${id}`)}
            className="mr-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold flex-grow">Form Preview</h1>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex justify-center my-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <Card className="mb-6">
            <CardContent className="p-6">
              {formConfig ? (
                <>
                  <h2 className="text-2xl font-bold mb-2">
                    {formConfig.title}
                  </h2>
                  {formConfig.description && (
                    <p className="text-muted-foreground mb-6">
                      {formConfig.description}
                    </p>
                  )}

                  <Separator className="mb-6" />
                  
                  {/* Use MultiStepFormRenderer for both single-page and multi-step forms */}
                  <MultiStepFormRenderer
                    formConfig={formConfig}
                    onSubmit={handleSubmit}
                    initialValues={formValues}
                    isSubmitting={loading}
                  />
                </>
              ) : submitted ? (
                <div className="text-center py-8">
                  <h2 className="text-xl font-semibold text-primary mb-2">
                    {formConfig?.successMessage || 'Thank you for your submission!'}
                  </h2>
                  <p className="mb-6">
                    Your form has been submitted successfully.
                  </p>
                  <Button variant="outline" onClick={resetForm}>
                    Submit Another Response
                  </Button>
                </div>
              ) : (
                <p className="text-destructive">
                  Form configuration not found.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="bg-muted/50">
          <CardContent className="p-6">
            <h3 className="text-lg font-medium mb-2">
              Preview Information
            </h3>
            <p className="text-sm mb-4">
              This is a preview of how your form will appear to users. You can interact with the form to test its functionality.
            </p>
            <p className="text-sm text-muted-foreground">
              Note: Form submissions in preview mode are not saved to the database.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
