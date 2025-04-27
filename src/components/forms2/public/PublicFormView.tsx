import { useState, useEffect, useReducer } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { FormConfig } from '@/lib/forms2/core/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Import components
import { FormSection } from './FormSection';
import { FormTabs } from './FormTabs';
import { DebugPanel, LogEntry } from './DebugPanel';

// Import reducer and utils
import { publicFormReducer, initialFormState } from './publicFormReducer';
import { validateSection } from './formUtils';

export const PublicFormView = () => {
  const router = useRouter();
  const { id } = router.query;
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Initialize form state with the public form reducer
  const [formState, dispatch] = useReducer(publicFormReducer, initialFormState);

  // Add a log entry
  const addLog = (type: 'info' | 'success' | 'error', message: string, details?: any) => {
    setLogs(prev => [
      {
        timestamp: new Date(),
        message,
        type,
        details
      },
      ...prev
    ]);
  };

  // Fetch form from the API
  const fetchForm = async () => {
    try {
      setLoading(true);
      addLog('info', `Fetching form with ID: ${id}`);
      
      // Use the public API endpoint that doesn't require authentication
      const response = await axios.get(`/api/forms2/public/${id}`);
      
      setFormConfig(response.data.formConfig);
      addLog('success', `Form loaded: ${response.data.formConfig.title}`, response.data.formConfig);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching form:', err);
      
      // Handle specific error messages from the API
      if (err.response) {
        if (err.response.status === 403) {
          setError('This form is not available for public access.');
          addLog('error', 'Form access denied: Not public');
        } else if (err.response.status === 404) {
          setError('The requested form could not be found.');
          addLog('error', 'Form not found');
        } else if (err.response.data?.error) {
          setError(err.response.data.error);
          addLog('error', `API error: ${err.response.data.error}`);
        } else {
          setError('An error occurred while loading the form. Please try again later.');
          addLog('error', `API error: ${err.response.status}`);
        }
      } else {
        setError('Failed to load form. Please check your connection and try again.');
        addLog('error', `Error loading form: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle field value change
  const handleFieldChange = (fieldId: string, value: any) => {
    // The publicFormReducer will handle text field clearing automatically
    dispatch({ type: 'SET_FIELD_VALUE', fieldId, value });
    
    // Clear error when field is changed
    dispatch({ type: 'CLEAR_FIELD_ERROR', fieldId });
  };

  // Set field error
  const setFieldError = (fieldId: string, error: string) => {
    dispatch({ 
      type: 'SET_FIELD_ERROR', 
      fieldId, 
      error
    });
  };

  // Handle form section change
  const handleSectionChange = (sectionIndex: number) => {
    setActiveStep(sectionIndex);
    addLog('info', `Changed to section ${sectionIndex + 1}`);
  };

  // Handle form submission
  const handleFormSubmit = async () => {
    // Validate all sections before submitting
    if (!formConfig) return;
    
    let isValid = true;
    
    // Validate the current section first
    const currentSection = formConfig.sections[activeStep];
    isValid = validateSection(currentSection, formState.values, setFieldError);
    
    if (!isValid) {
      addLog('error', 'Validation failed for current section');
      return;
    }
    
    // Set form to submitting state
    dispatch({ type: 'SET_FORM_SUBMITTING', value: true });
    addLog('info', 'Form submission initiated');
    
    // Submit the form
    await handleSubmit();
  };

  // Handle next button click
  const handleNext = async () => {
    // If this is the last section, submit the form
    if (!formConfig) return;
    
    if (activeStep === formConfig.sections.length - 1) {
      // We're on the last section, so submit the form
      addLog('info', 'Last section reached, submitting form');
      await handleFormSubmit();
      return;
    }
    
    // Otherwise, go to the next section
    handleSectionChange(activeStep + 1);
  };

  // Handle back button click
  const handleBack = () => {
    if (activeStep > 0) {
      handleSectionChange(activeStep - 1);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      // Validate all fields in the form
      if (!formConfig) return;
      
      // Pre-process form values to ensure date fields have valid values
      const processedValues = { ...formState.values };
      
      // Find and fix any date fields
      formConfig.sections.forEach(section => {
        section.fields.forEach(field => {
          if (field.type === 'date' || field.type === 'datetime' || field.type === 'datetime-local') {
            const fieldValue = processedValues[field.id];
            
            // Check if the value is missing or equal to the field ID (which indicates an error)
            if (!fieldValue || fieldValue === field.id) {
              // Set a default date (today) to ensure we have a valid date for booking forms
              const today = new Date().toISOString().split('T')[0];
              console.log(`Setting date field ${field.id} with default value:`, today);
              processedValues[field.id] = today;
              
              // Also update the form state
              dispatch({ type: 'SET_FIELD_VALUE', fieldId: field.id, value: today });
            }
          }
        });
      });
      
      let isValid = true;
      const currentSection = formConfig.sections[activeStep];
      
      if (currentSection) {
        isValid = validateSection(currentSection, processedValues, setFieldError);
      }
      
      if (!isValid) {
        addLog('error', 'Validation failed');
        return;
      }
      
      // Set form to submitting state
      dispatch({ type: 'SET_FORM_SUBMITTING', value: true });
      addLog('info', 'Submitting form...', processedValues);
      
      // Submit the form data to the API
      const response = await axios.post(`/api/forms2/public/${id}/submit2`, {
        formData: processedValues
      });
      
      // Handle successful submission
      dispatch({ type: 'SET_FORM_SUBMITTED', value: true });
      addLog('success', 'Form submitted successfully', response.data);
      
      // Show success message or redirect
      setActiveStep(formConfig.sections.length);
    } catch (err: any) {
      console.error('Error submitting form:', err);
      
      // Extract error message from the error object
      let errorMessage: string;
      
      if (err.response?.data?.error) {
        // Handle API error response
        const apiError = err.response.data.error;
        console.log('API error object:', apiError);
        
        if (typeof apiError === 'string') {
          errorMessage = apiError;
        } else if (typeof apiError === 'object' && apiError !== null) {
          // Extract message from error object
          errorMessage = apiError.message || JSON.stringify(apiError);
          
          // Check for validation errors in the details
          if (apiError.type === 'VALIDATION_ERROR' && apiError.details) {
            console.log('Validation error details:', apiError.details);
            
            // Set field-specific errors
            Object.entries(apiError.details).forEach(([fieldId, message]) => {
              if (fieldId !== '_form') {
                // Set error for specific field
                dispatch({ 
                  type: 'SET_FIELD_ERROR', 
                  fieldId, 
                  error: message as string 
                });
                
                // Log the field error
                addLog('error', `Field validation error: ${fieldId}`, { fieldId, message });
              }
            });
          }
        } else {
          errorMessage = 'Unknown API error';
        }
      } else if (err.message) {
        // Use error message property if available
        errorMessage = err.message;
      } else {
        // Fallback error message
        errorMessage = 'Failed to submit form';
      }
      
      console.log('Setting error message to:', errorMessage);
      
      // Dispatch with string error message
      dispatch({ 
        type: 'SET_FORM_ERROR', 
        error: errorMessage 
      });
      
      addLog('error', `Error submitting form: ${errorMessage}`);
    } finally {
      dispatch({ type: 'SET_FORM_SUBMITTING', value: false });
    }
  };

  // Reset the form
  const resetForm = () => {
    dispatch({ type: 'RESET_FORM' });
    setActiveStep(0);
    
    if (formConfig) {
      addLog('info', 'Form reset');
    }
  };

  // Toggle debug panel
  const toggleDebugPanel = () => {
    setShowDebugPanel(prev => !prev);
  };

  // Fetch form on component mount
  useEffect(() => {
    if (id) {
      fetchForm();
    }
  }, [id]);

  // If loading, show a loading spinner
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If there's an error, show an error message
  if (error) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // If form is not found, show a message
  if (!formConfig) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Card>
          <CardHeader>
            <CardTitle>Form Not Found</CardTitle>
            <CardDescription>The requested form could not be found.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // If form is submitted, show success message
  if (formState.isSubmitted) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Thank You!</CardTitle>
            <CardDescription>
              {formConfig.successMessage || "Your form has been submitted successfully."}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={resetForm}>Submit Another Response</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <Card className="max-w-4xl mx-auto">
        <CardHeader className="form-header">
          <CardTitle className="form-title">{formConfig.title}</CardTitle>
          {formConfig.description && (
            <CardDescription className="form-description">{formConfig.description}</CardDescription>
          )}
        </CardHeader>
        
        <CardContent>
          {formState.submitError && (
            <Alert variant="destructive" className="mb-6">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{formState.submitError}</AlertDescription>
            </Alert>
          )}
          
          {/* Tab-based section navigation */}
          <FormTabs 
            sections={formConfig.sections} 
            activeSection={activeStep} 
            onSectionChange={handleSectionChange} 
          />
          
          {/* Current section */}
          <div>
            {formConfig.sections[activeStep] && (
              <FormSection
                section={formConfig.sections[activeStep]}
                values={formState.values}
                errors={formState.errors}
                onChange={handleFieldChange}
                formConfig={formConfig}
              />
            )}
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={activeStep === 0}
          >
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={formState.isSubmitting}
          >
            {formState.isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Submitting...
              </>
            ) : activeStep === formConfig.sections.length - 1 ? (
              formConfig.submitButtonText || "Submit"
            ) : (
              "Next"
            )}
          </Button>
        </CardFooter>
      </Card>
      
      {/* Debug button (hidden in production) */}
      {process.env.NODE_ENV !== 'production' && (
        <div className="mt-4 text-center">
          <Button variant="ghost" size="sm" onClick={toggleDebugPanel}>
            {showDebugPanel ? "Hide Debug Panel" : "Show Debug Panel"}
          </Button>
        </div>
      )}
      
      {/* Debug Panel */}
      {showDebugPanel && (
        <DebugPanel 
          formState={formState} 
          logs={logs} 
          onClose={toggleDebugPanel} 
        />
      )}
    </div>
  );
};
