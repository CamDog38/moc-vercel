/**
 * Form Field Editor Component
 * 
 * A reusable component for editing form field properties in the form builder.
 * Provides a comprehensive interface for configuring all aspects of a form field.
 * 
 * Features:
 * - Field type selection with appropriate controls for each type
 * - Smart field name generation based on labels
 * - Placeholder text configuration
 * - Required field toggle
 * - Special handling for date/time fields
 * - Field mapping for data integration
 * - Conditional logic builder
 * - Fully accessible with ARIA attributes and keyboard navigation
 */

import { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Trash2, MapPin, SlidersHorizontal, Clock } from 'lucide-react';
import { FieldConfig, FieldType, FieldMapping, ConditionalLogic } from '@/lib/forms2/core/types';
import FieldMappingSelector from '@/components/forms2/FieldMappingSelector';
import ConditionalLogicBuilder from '@/components/forms2/conditionalLogic';
import { generateFieldName, shouldAutoUpdateFieldName } from './helpers/fieldNameHelper';

interface FormFieldEditorProps {
  field: FieldConfig;
  availableFields: FieldConfig[];
  onUpdate: (updates: Partial<FieldConfig>) => void;
  onDelete: () => void;
  sectionTitle?: string; // Add section title prop to generate proper field names
}

export default function FormFieldEditor({
  field,
  availableFields,
  onUpdate,
  onDelete,
  sectionTitle = 'Default' // Default section title if not provided
}: FormFieldEditorProps) {
  const fieldTypes = [
    { value: 'text', label: 'Text' },
    { value: 'textarea', label: 'Text Area' },
    { value: 'email', label: 'Email' },
    { value: 'tel', label: 'Phone' },
    { value: 'number', label: 'Number' },
    { value: 'date', label: 'Date' },
    { value: 'dob', label: 'Date of Birth' },
    { value: 'datetime-local', label: 'Date & Time (with toggle)' },
    { value: 'select', label: 'Dropdown' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'radio', label: 'Radio' },
    { value: 'file', label: 'File Upload' }
  ];

  return (
    <Card className="mb-4 border border-gray-200">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex-1">
            <Input
              placeholder="Field Label"
              value={field.label || ''}
              onChange={(e) => {
                const newLabel = e.target.value;
                const updates: Partial<FieldConfig> = { label: newLabel };
                
                // Check if we should auto-update the field name
                if (shouldAutoUpdateFieldName(field, true)) {
                  const newFieldName = generateFieldName(newLabel, sectionTitle, field.id);
                  console.log(`Field label changed to "${newLabel}". Auto-updating field name to "${newFieldName}".`);
                  
                  // Update the field name and mapping
                  updates.name = newFieldName;
                  updates.mapping = {
                    type: 'custom',
                    value: newFieldName,
                    customKey: newFieldName
                  };
                }
                
                onUpdate(updates);
              }}
              className="font-medium"
            />
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onDelete}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`field-${field.id}-type`}>Field Type</Label>
            <Select
              value={field.type as string}
              onValueChange={(value) => onUpdate({ type: value as FieldType })}
            >
              <SelectTrigger id={`field-${field.id}-type`}>
                <SelectValue placeholder="Select field type" />
              </SelectTrigger>
              <SelectContent>
                {fieldTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor={`field-${field.id}-name`}>Field Name</Label>
            <Input
              id={`field-${field.id}-name`}
              placeholder="field_name"
              value={field.name || ''}
              onChange={(e) => {
                // If the user is manually editing the field name, update it directly
                onUpdate({ 
                  name: e.target.value,
                  mapping: {
                    type: 'custom',
                    value: e.target.value,
                    customKey: e.target.value
                  }
                });
              }}
            />
          </div>
        </div>
        
        <div className="mt-4 space-y-2">
          <Label htmlFor={`field-${field.id}-placeholder`}>Placeholder</Label>
          <Input
            id={`field-${field.id}-placeholder`}
            placeholder="Enter placeholder text"
            value={field.placeholder || ''}
            onChange={(e) => onUpdate({ placeholder: e.target.value })}
          />
        </div>
        
        <div className="mt-4 flex items-center">
          <Checkbox 
            id={`field-${field.id}-required`}
            checked={field.required || false}
            onCheckedChange={(checked) => onUpdate({ required: !!checked })}
          />
          <Label htmlFor={`field-${field.id}-required`} className="ml-2">
            Required Field
          </Label>
        </div>
        
        {/* Time toggle for datetime-local fields */}
        {field.type === 'datetime-local' && (
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                <Label htmlFor={`field-${field.id}-time-toggle`} className="text-sm font-medium">
                  Include Time
                </Label>
              </div>
              <Switch
                id={`field-${field.id}-time-toggle`}
                checked={(field as any).includeTime !== false}
                onCheckedChange={(checked) => {
                  onUpdate({ 
                    includeTime: checked,
                    allowTimeToggle: (field as any).allowTimeToggle
                  });
                }}
              />
            </div>
            
            <div className="mt-2 flex items-center justify-between">
              <Label htmlFor={`field-${field.id}-allow-time-toggle`} className="text-sm font-medium">
                Allow users to toggle time
              </Label>
              <Switch
                id={`field-${field.id}-allow-time-toggle`}
                checked={(field as any).allowTimeToggle !== false}
                onCheckedChange={(checked) => {
                  onUpdate({ allowTimeToggle: checked });
                }}
              />
            </div>
          </div>
        )}
        
        {/* Field Mapping */}
        <div className="mt-4">
          <div className="flex items-center mb-1">
            <MapPin className="h-3 w-3 mr-1" />
            <Label className="text-sm font-medium">Field Mapping</Label>
          </div>
          <div className="w-full">
            <FieldMappingSelector
              value={field.mapping}
              onChange={(mapping) => onUpdate({ mapping })}
              fieldType={field.type}
              label=""
            />
          </div>
        </div>

        {/* Conditional Logic */}
        <div className="mt-4">
          <div className="flex items-center mb-1">
            <SlidersHorizontal className="h-3 w-3 mr-1" />
            <Label className="text-sm font-medium">Conditional Logic</Label>
          </div>
          <div className="w-full">
            <ConditionalLogicBuilder
              value={field.conditionalLogic}
              onChange={(conditionalLogic) => onUpdate({ conditionalLogic })}
              availableFields={availableFields}
              currentFieldId={field.id}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
