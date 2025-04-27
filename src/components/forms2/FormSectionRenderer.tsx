/**
 * Form Section Renderer Component
 * 
 * This component renders a single form section with all its fields.
 */

import React from 'react';
import { FormSection, FieldConfig } from '@/lib/forms2/core/types';
import FormFieldRenderer from './ui/FormFieldRenderer';

interface FormSectionRendererProps {
  section: FormSection;
  values: Record<string, any>;
  errors: Record<string, string>;
  onChange: (fieldId: string, value: any) => void;
}

export default function FormSectionRenderer({
  section,
  values,
  errors,
  onChange
}: FormSectionRendererProps) {
  // Check if section should be shown based on conditional logic
  const shouldShowSection = () => {
    if (!section.conditionalLogic) return true;
    
    const { action, when } = section.conditionalLogic;
    const { field, operator, value } = when;
    const fieldValue = values[field];
    
    let conditionMet = false;
    
    switch (operator) {
      case 'equals':
        conditionMet = fieldValue === value;
        break;
      case 'not_equals':
        conditionMet = fieldValue !== value;
        break;
      case 'contains':
        conditionMet = fieldValue?.includes(value);
        break;
      case 'not_contains':
        conditionMet = !fieldValue?.includes(value);
        break;
      case 'greater_than':
        conditionMet = Number(fieldValue) > Number(value);
        break;
      case 'less_than':
        conditionMet = Number(fieldValue) < Number(value);
        break;
      default:
        conditionMet = false;
    }
    
    return action === 'show' ? conditionMet : !conditionMet;
  };
  
  // Check if field should be shown based on conditional logic
  const shouldShowField = (field: FieldConfig) => {
    if (!field.conditionalLogic) return true;
    
    const { action, when } = field.conditionalLogic;
    const { field: conditionField, operator, value } = when;
    const fieldValue = values[conditionField];
    
    let conditionMet = false;
    
    switch (operator) {
      case 'equals':
        conditionMet = fieldValue === value;
        break;
      case 'not_equals':
        conditionMet = fieldValue !== value;
        break;
      case 'contains':
        conditionMet = fieldValue?.includes(value);
        break;
      case 'not_contains':
        conditionMet = !fieldValue?.includes(value);
        break;
      case 'greater_than':
        conditionMet = Number(fieldValue) > Number(value);
        break;
      case 'less_than':
        conditionMet = Number(fieldValue) < Number(value);
        break;
      default:
        conditionMet = false;
    }
    
    return action === 'show' ? conditionMet : !conditionMet;
  };
  
  // If section shouldn't be shown based on conditional logic, return null
  if (!shouldShowSection()) {
    return null;
  }
  
  return (
    <div className="w-full">
      {/* Section title and description */}
      {section.title && (
        <h2 className="text-xl font-semibold mb-2">
          {section.title}
        </h2>
      )}
      
      {section.description && (
        <p className="text-sm text-muted-foreground mb-6">
          {section.description}
        </p>
      )}
      
      {/* Section fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {section.fields.map((field) => {
          // Skip hidden fields or fields that shouldn't be shown based on conditional logic
          if (field.hidden || !shouldShowField(field)) {
            return null;
          }
          
          // Use full width for checkbox fields, textareas, and other complex inputs
          const isFullWidth = field.type === 'checkbox' || field.type === 'textarea' || 
                             field.type === 'radio' || field.type === 'file';
          
          return (
            <div 
              key={field.id} 
              className={isFullWidth ? 'col-span-1 md:col-span-2' : ''}
            >
              <FormFieldRenderer
                config={field}
                defaultValue={values[field.id]}
                errorMessage={errors[field.id]}
                onValueChange={(value: any) => onChange(field.id, value)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
