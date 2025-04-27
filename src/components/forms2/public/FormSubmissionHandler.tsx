/**
 * Form Submission Handler
 * 
 * A component that handles form submissions and provides better error handling
 * for validation errors.
 */

import React, { useState } from 'react';
import axios from 'axios';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface FormSubmissionHandlerProps {
  formId: string;
  formData: Record<string, any>;
  onSuccess: (result: any) => void;
  onError?: (error: any) => void;
  submitButtonText?: string;
  className?: string;
}

interface ValidationError {
  fieldId: string;
  message: string;
}

export default function FormSubmissionHandler({
  formId,
  formData,
  onSuccess,
  onError,
  submitButtonText = 'Submit',
  className = ''
}: FormSubmissionHandlerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    setValidationErrors([]);

    try {
      // Submit the form data to the API
      const response = await axios.post(`/api/forms2/public/${formId}/submit2`, {
        formData
      });

      // Handle successful submission
      if (response.data.success) {
        onSuccess(response.data);
      } else {
        // Handle API error response
        setError(response.data.error?.message || 'An error occurred during form submission');
        
        // If there are validation errors, extract and display them
        if (response.data.error?.details) {
          const errors = Object.entries(response.data.error.details).map(([fieldId, message]) => ({
            fieldId,
            message: message as string
          }));
          setValidationErrors(errors);
        }
      }
    } catch (err: any) {
      console.error('Form submission error:', err);
      
      // Handle axios error response
      if (err.response?.data?.error) {
        setError(err.response.data.error.message || 'An error occurred during form submission');
        
        // If there are validation errors, extract and display them
        if (err.response.data.error.details) {
          const errors = Object.entries(err.response.data.error.details).map(([fieldId, message]) => ({
            fieldId,
            message: message as string
          }));
          setValidationErrors(errors);
        }
      } else {
        setError(err.message || 'An error occurred during form submission');
      }
      
      // Call the onError callback if provided
      if (onError) {
        onError(err);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={className}>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {validationErrors.length > 0 && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Validation Errors</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-5 mt-2">
              {validationErrors.map((error, index) => (
                <li key={index}>
                  <strong>{error.fieldId}</strong>: {error.message}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      
      <Button 
        onClick={handleSubmit} 
        disabled={isSubmitting}
        className="w-full"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting...
          </>
        ) : (
          submitButtonText
        )}
      </Button>
    </div>
  );
}
