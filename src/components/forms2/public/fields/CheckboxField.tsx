import React from 'react';
import { FieldConfig } from '@/lib/forms2/core/types';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface CheckboxFieldProps {
  field: FieldConfig;
  value: any;
  error?: string;
  onChange: (fieldId: string, value: any) => void;
  displayLabel: string;
}

export const CheckboxField: React.FC<CheckboxFieldProps> = ({ 
  field, 
  value, 
  error, 
  onChange,
  displayLabel
}) => {
  return (
    <div className="mb-4" key={field.id}>
      <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
        <Checkbox
          id={field.id}
          checked={!!value}
          onCheckedChange={(checked) => {
            onChange(field.id, checked);
          }}
        />
        <div className="space-y-1 leading-none">
          <Label htmlFor={field.id} className="text-sm font-medium">
            {displayLabel}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          {field.helpText && (
            <p id={`${field.id}-description`} className="text-sm text-muted-foreground">
              {field.helpText}
            </p>
          )}
        </div>
      </div>
      {error && <p className="text-sm text-destructive mt-1">{error}</p>}
    </div>
  );
};
