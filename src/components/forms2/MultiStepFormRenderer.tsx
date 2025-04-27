/**
 * Multi-Step Form Renderer Component
 * 
 * This component renders a form in multi-step mode, showing one section at a time
 * and providing navigation controls to move between steps.
 */

import React, { useState } from 'react';
import { FormConfig, FormSection } from '@/lib/forms2/core/types';
import FormSectionRenderer from '@/components/forms2/FormSectionRenderer';
import { Button } from '@/components/ui/button';
import StepIndicator from '@/components/forms2/ui/StepIndicator';

interface MultiStepFormRendererProps {
  formConfig: FormConfig;
  onSubmit: (formData: Record<string, any>) => void;
  initialValues?: Record<string, any>;
  isSubmitting?: boolean;
}

export default function MultiStepFormRenderer({
  formConfig,
  onSubmit,
  initialValues = {},
  isSubmitting = false
}: MultiStepFormRendererProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [formValues, setFormValues] = useState<Record<string, any>>(initialValues);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // Get settings from metadata
  const showStepIndicator = formConfig.metadata?.showStepIndicator !== false;
  const showStepNumbers = formConfig.metadata?.showStepNumbers !== false;
  const allowStepNavigation = formConfig.metadata?.allowStepNavigation || false;
  const nextButtonText = formConfig.metadata?.nextButtonText || 'Next';
  const previousButtonText = formConfig.metadata?.previousButtonText || 'Previous';
  const submitButtonText = formConfig.submitButtonText || 'Submit';
  
  // Calculate progress percentage
  const progress = ((activeStep + 1) / formConfig.sections.length) * 100;
  
  // Get current section
  const currentSection = formConfig.sections[activeStep];
  
  // Handle field value changes
  const handleFieldChange = (fieldId: string, value: any) => {
    setFormValues({
      ...formValues,
      [fieldId]: value
    });
    
    // Clear error for this field if it exists
    if (formErrors[fieldId]) {
      const updatedErrors = { ...formErrors };
      delete updatedErrors[fieldId];
      setFormErrors(updatedErrors);
    }
  };
  
  // Validate current section
  const validateSection = (section: FormSection): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;
    
    // Check each field in the section
    section.fields.forEach(field => {
      // Skip validation for hidden fields
      if (field.hidden) return;
      
      // Check required fields
      if (field.required && (!formValues[field.id] || formValues[field.id] === '')) {
        newErrors[field.id] = 'This field is required';
        isValid = false;
      }
      
      // Add more validation as needed based on field type
      // ...
    });
    
    setFormErrors({ ...formErrors, ...newErrors });
    return isValid;
  };
  
  // Handle next button click
  const handleNext = () => {
    // Validate current section before proceeding
    if (!validateSection(currentSection)) {
      return;
    }
    
    if (activeStep < formConfig.sections.length - 1) {
      setActiveStep(activeStep + 1);
    }
  };
  
  // Handle previous button click
  const handlePrevious = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };
  
  // Handle form submission
  const handleSubmit = () => {
    // Validate final section before submitting
    if (!validateSection(currentSection)) {
      return;
    }
    
    // Submit the form
    onSubmit(formValues);
  };
  
  // Handle step click (only if allowStepNavigation is true)
  const handleStepClick = (step: number) => {
    if (allowStepNavigation && step <= activeStep) {
      setActiveStep(step);
    }
  };
  
  return (
    <div className="w-full">
      {/* Progress indicator */}
      {showStepIndicator && (
        <StepIndicator
          steps={formConfig.sections.map(section => ({ id: section.id, title: section.title }))}
          activeStep={activeStep}
          allowStepNavigation={allowStepNavigation}
          onStepClick={handleStepClick}
          showStepNumbers={showStepNumbers}
        />
      )}
      
      {/* Current section */}
      <div className="mb-6">
        <FormSectionRenderer
          section={currentSection}
          values={formValues}
          errors={formErrors}
          onChange={handleFieldChange}
        />
      </div>
      
      {/* Navigation buttons */}
      <div className="flex justify-between mt-8">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={activeStep === 0}
        >
          {previousButtonText}
        </Button>
        
        {activeStep < formConfig.sections.length - 1 ? (
          <Button
            onClick={handleNext}
          >
            {nextButtonText}
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : submitButtonText}
          </Button>
        )}
      </div>
    </div>
  );
}
