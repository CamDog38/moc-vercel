import React from 'react';
import { FieldConfig } from '@/lib/forms2/core/types';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FileFieldProps {
  field: FieldConfig;
  value: any;
  error?: string;
  onChange: (fieldId: string, value: any) => void;
  displayLabel: string;
}

export const FileField: React.FC<FileFieldProps> = ({ 
  field, 
  value, 
  error, 
  onChange,
  displayLabel
}) => {
  // Common props for file fields
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
        <Input
          {...commonProps}
          type="file"
          onChange={(e) => {
            const files = (e.target as HTMLInputElement).files;
            onChange(field.id, files?.[0] || null);
          }}
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
