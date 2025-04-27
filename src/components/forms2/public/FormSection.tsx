import React from 'react';
import { FormSection as FormSectionType, FieldConfig, FormConfig } from '@/lib/forms2/core/types';
import { FormField } from './FormField';

interface FormSectionProps {
  section: FormSectionType;
  values: Record<string, any>;
  errors: Record<string, string>;
  onChange: (fieldId: string, value: any) => void;
  formConfig?: FormConfig;
}

export const FormSection: React.FC<FormSectionProps> = ({
  section,
  values,
  errors,
  onChange,
  formConfig
}) => {
  return (
    <>
      <h3 className="text-lg font-medium mb-2">{section.title}</h3>
      {section.description && (
        <p className="text-muted-foreground mb-6">{section.description}</p>
      )}
      
      <div className="space-y-2">
        {section.fields.map(field => (
          <FormField
            key={field.id}
            field={field}
            value={values[field.id]}
            error={errors[field.id]}
            onChange={(value) => onChange(field.id, value)}
            formValues={values}
            formConfig={formConfig}
          />
        ))}
      </div>
    </>
  );
};
