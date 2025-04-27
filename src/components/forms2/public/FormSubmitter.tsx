/**
 * Form Submitter Component
 * 
 * A component that properly handles form submissions for Form System 2.0
 * by ensuring all field IDs are correctly included in the submission data.
 */

import React, { useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import * as logger from '@/util/logger';

interface FormSubmitterProps {
  formId: string;
  formData: Record<string, any>;
  onSuccess?: (result: any) => void;
  onError?: (error: any) => void;
  submitButtonText?: string;
  className?: string;
  disabled?: boolean;
}

export default function FormSubmitter({
  formId,
  formData,
  onSuccess,
  onError,
  submitButtonText = 'Submit',
  className = '',
  disabled = false
}: FormSubmitterProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const handleSubmit = async () => {
    // Don't submit if already submitting or disabled
    if (isSubmitting || disabled) return;

    setIsSubmitting(true);
    setError(null);
    setValidationErrors({});

    try {
      // Log the form data being submitted
      logger.debug('Submitting form data:', 'forms', { formId, formData });

      // Submit the form data to the API
      // IMPORTANT: We're sending the raw formData with field IDs intact
      const response = await axios.post(`/api/forms2/public/${formId}/submit2`, {
        formData
      });

      // Handle successful submission
      logger.success('Form submitted successfully', 'forms', response.data);

      if (onSuccess) {
        onSuccess(response.data);
      } else {
        // Default success behavior - redirect to success page
        router.push(`/forms/${formId}/success?submissionId=${response.data.submissionId}`);
      }
    } catch (err: any) {
      logger.error('Form submission error:', 'forms', err);
      
      // Extract error message and validation errors
      let errorMessage = 'An error occurred during form submission';
      let fieldErrors: Record<string, string> = {};
      
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error.message || errorMessage;
        
        // Extract field-specific validation errors if available
        if (err.response.data.error.details) {
          fieldErrors = err.response.data.error.details;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setValidationErrors(fieldErrors);
      
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
      
      {Object.keys(validationErrors).length > 0 && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Validation Errors</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-5 mt-2">
              {Object.entries(validationErrors).map(([fieldId, message], index) => (
                <li key={index}>
                  <strong>{fieldId}</strong>: {message}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      
      <Button 
        onClick={handleSubmit} 
        disabled={isSubmitting || disabled}
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
