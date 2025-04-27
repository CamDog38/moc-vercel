/**
 * Field Mapping Selector Component
 * 
 * This component allows selecting a mapping type for a form field.
 * Used to map fields to lead/booking data like name, email, phone, etc.
 */

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FieldMapping } from '@/lib/forms2/core/types';

interface FieldMappingSelectorProps {
  value: FieldMapping | undefined;
  onChange: (mapping: FieldMapping | undefined) => void;
  fieldType: string;
  label?: string;
}

const FieldMappingSelector: React.FC<FieldMappingSelectorProps> = ({
  value,
  onChange,
  fieldType,
  label = 'Field Mapping',
}) => {
  // Get the appropriate mapping options based on field type
  const getMappingOptions = () => {
    const commonOptions = [
      { value: 'custom', label: 'Custom Field' },
    ];

    // Add type-specific mapping options
    switch (fieldType) {
      case 'text':
        return [
          { value: 'name', label: 'Name' },
          ...commonOptions,
        ];
      case 'email':
        return [
          { value: 'email', label: 'Email Address' },
          ...commonOptions,
        ];
      case 'tel':
        return [
          { value: 'phone', label: 'Phone Number' },
          ...commonOptions,
        ];
      case 'date':
        return [
          { value: 'date', label: 'Date' },
          ...commonOptions,
        ];
      case 'time':
        return [
          { value: 'time', label: 'Time' },
          ...commonOptions,
        ];
      case 'datetime':
        return [
          { value: 'datetime', label: 'Date & Time' },
          ...commonOptions,
        ];
      default:
        return commonOptions;
    }
  };

  const handleChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const mappingType = event.target.value as string;
    
    if (mappingType === '') {
      onChange(undefined);
      return;
    }
    
    const newMapping: FieldMapping = {
      type: mappingType as any,
      value: mappingType,
    };
    
    if (mappingType === 'custom') {
      newMapping.customKey = '';
    }
    
    onChange(newMapping);
  };

  return (
    <div className="space-y-1">
      {label && <Label className="text-sm font-medium">{label}</Label>}
      <Select
        value={value?.type || 'none'}
        onValueChange={(val) => {
          if (val === 'none') {
            handleChange({ target: { value: '' } } as any);
          } else {
            handleChange({ target: { value: val } } as any);
          }
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select mapping type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">
            <span className="text-muted-foreground">None</span>
          </SelectItem>
          {getMappingOptions().map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default FieldMappingSelector;
