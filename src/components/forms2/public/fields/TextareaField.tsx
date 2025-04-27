import React from 'react';
import { FieldConfig } from '@/lib/forms2/core/types';
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface TextareaFieldProps {
  field: FieldConfig;
  value: any;
  error?: string;
  onChange: (value: any) => void;
  displayLabel: string;
}

export const TextareaField: React.FC<TextareaFieldProps> = ({ 
  field, 
  value, 
  error, 
  onChange,
  displayLabel
}) => {
  // Common props for textarea fields
  const commonProps = {
    id: field.id,
    name: field.id,
    disabled: field.disabled,
    required: field.required,
    placeholder: field.placeholder,
    'aria-describedby': field.helpText ? `${field.id}-description` : undefined,
  };
  
  return (
    <div className="mb-4" key={field.id}>
      <div className="space-y-2">
        <Label htmlFor={field.id} className="text-sm font-medium">
          {displayLabel}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </Label>
        <Textarea
          {...commonProps}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={error ? "border-destructive" : ""}
        />
        {field.helpText && (
          <p id={`${field.id}-description`} className="text-sm text-muted-foreground">
            {field.helpText}
          </p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
};
