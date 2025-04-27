/**
 * Form Field Component
 * 
 * A reusable component for managing form fields in the form builder.
 * Extracted from the create page to ensure consistency between create and edit pages.
 * 
 * Features:
 * - Automatic field name generation based on labels
 * - Drag and drop reordering
 * - Field mapping for data integration
 * - Conditional logic support
 * - Accessibility optimizations for keyboard and screen reader users
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Trash2, MapPin, SlidersHorizontal, GripVertical } from 'lucide-react';
import { FieldConfig, FieldType, FieldMapping, ConditionalLogic, FieldOption } from '@/lib/forms2/core/types';
import FieldMappingSelector from '@/components/forms2/FieldMappingSelector';
import ConditionalLogicBuilder from '@/components/forms2/conditionalLogic';
import { parseOptions, normalizeOption } from './helpers/optionsHelper';
import { generateFieldName } from './helpers/fieldNameHelper';

interface FormFieldProps {
  field: FieldConfig;
  availableFields: FieldConfig[];
  onUpdate: (updates: Partial<FieldConfig>) => void;
  onDelete: () => void;
  dragHandleProps?: any; // For field drag handle
  sectionTitle?: string; // Section title for prefixing field names
}

export default function FormField({
  field,
  availableFields,
  onUpdate,
  onDelete,
  dragHandleProps,
  sectionTitle
}: FormFieldProps) {
  const [expanded, setExpanded] = useState(true);
  
  // Generate a mapping string from a label
  const generateMappingFromLabel = (label: string): string => {
    // Use the fieldNameHelper function to generate a consistent field name
    return generateFieldName(label, sectionTitle || 'Default', field.id);
  };
  
  // Create a FieldMapping object from a string mapping
  const createFieldMappingObject = (mappingString: string): FieldMapping => {
    return {
      type: 'custom',
      value: mappingString,
      customKey: mappingString
    };
  };
  
  // Get field name from mapping or name property
  const getFieldName = (): string => {
    if (field.name) {
      return field.name;
    }
    
    if (field.mapping && typeof field.mapping === 'object') {
      return field.mapping.customKey || field.mapping.value || '';
    }
    
    return '';
  };

  return (
    <Card className="mb-4 border border-gray-200 relative">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center flex-1 gap-2">
            {/* Drag handle for field */}
            <div 
              {...dragHandleProps} 
              className="cursor-grab text-muted-foreground hover:text-foreground"
            >
              <GripVertical className="h-4 w-4" />
            </div>
            
            <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              {field.type}
            </div>
            
            <div className="flex-1">
              <Input
                placeholder="Field Label"
                value={field.label || ''}
                onChange={(e) => {
                  // Always generate a slug from the label for the field name
                  const mappingValue = generateMappingFromLabel(e.target.value);
                  
                  // Update the label and mapping field
                  onUpdate({ 
                    label: e.target.value,
                    name: mappingValue,
                    mapping: createFieldMappingObject(mappingValue)
                  });
                  
                  console.log(`Field label changed to "${e.target.value}". Auto-updating field name to "${mappingValue}".`);
                }}
                className="font-medium"
              />
            </div>
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
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="textarea">Text Area</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="tel">Phone</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="dob">Date of Birth</SelectItem>
                <SelectItem value="datetime-local">Date & Time (with toggle)</SelectItem>
                <SelectItem value="select">Dropdown</SelectItem>
                <SelectItem value="checkbox">Checkbox</SelectItem>
                <SelectItem value="radio">Radio</SelectItem>
                <SelectItem value="file">File Upload</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor={`field-${field.id}-name`}>Field Name (for mapping)</Label>
            <Input
              id={`field-${field.id}-name`}
              placeholder="field_name"
              value={getFieldName()}
              onChange={(e) => {
                // Ensure the name is valid for mapping (no spaces, special chars)
                const validName = e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9]/g, '_')
                  .replace(/_+/g, '_')
                  .replace(/^_|_$/g, '');
                  
                onUpdate({ 
                  name: validName,
                  mapping: createFieldMappingObject(validName)
                });
              }}
              className="font-mono text-sm"
            />
            {field.stableId && (
              <div className="text-xs text-muted-foreground mt-1">
                <span className="font-semibold">Stable ID:</span> {field.stableId}
              </div>
            )}
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
        
        {/* Options for dropdown, radio, and checkbox fields */}
        {(field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && (
          <div className="mt-4 space-y-2">
            <Label>Options</Label>
            <div className="border border-gray-200 rounded-md p-2 space-y-2">
              {/* Display existing options */}
              {(() => {
                // Get the options array from the field
                const fieldOptions = (field as any).options;
                
                // Parse the options using our helper function
                const parsedOptions = parseOptions(fieldOptions, field.id, field.label);
                
                return parsedOptions.map((option: FieldOption, index: number) => (
                  <div key={option.id || index} className="flex items-center gap-2 mb-2">
                    <Input
                      value={option.label || ''}
                      onChange={(e) => {
                        // Get the current options in the correct format
                        const currentOptions = parseOptions((field as any).options, field.id, field.label);
                        
                        // Create a copy of the options array
                        const updatedOptions = [...currentOptions];
                        
                        // Update the option at the specified index
                        updatedOptions[index] = {
                          ...updatedOptions[index],
                          id: option.id || `option_${Date.now()}_${index}`,
                          label: e.target.value,
                          value: e.target.value.toLowerCase().replace(/\s+/g, '_')
                        };
                        
                        // Log the update for debugging
                        console.log(`Updating option at index ${index}:`, updatedOptions[index]);
                        
                        // Get the field name
                        const fieldName = getFieldName();
                        
                        // Update both options and ensure name is preserved
                        onUpdate({ 
                          options: updatedOptions,
                          name: fieldName
                        });
                      }}
                      placeholder="Option label"
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => {
                        // Get the current options in the correct format
                        const currentOptions = parseOptions((field as any).options, field.id, field.label);
                        
                        // Create a copy of the options array and remove the option at the specified index
                        const updatedOptions = [...currentOptions];
                        updatedOptions.splice(index, 1);
                        
                        console.log(`Removing option at index ${index}`);
                        console.log('Updated options after removal:', updatedOptions);
                        
                        // Get the field name
                        const fieldName = getFieldName();
                        
                        // Update both options and ensure name is preserved
                        onUpdate({ 
                          options: updatedOptions,
                          name: fieldName
                        });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ));
              })()}
              
              {/* Add Option button */}
              <Button
                variant="outline"
                size="sm"
                className="w-full flex items-center justify-center gap-1"
                onClick={() => {
                  // Get the existing options in the correct format using our helper
                  const existingOptions = parseOptions((field as any).options, field.id, field.label);
                  
                  const newOption = {
                    id: `option_${Date.now()}`,
                    label: `Option ${existingOptions.length + 1}`,
                    value: `option${existingOptions.length + 1}`
                  };
                  
                  // Create a new array to ensure React detects the change
                  const updatedOptions = [...existingOptions, newOption];
                  console.log('Adding new option:', newOption);
                  console.log('Updated options array:', updatedOptions);
                  
                  // Ensure all options have IDs
                  const validatedOptions = updatedOptions.map(opt => ({
                    id: opt.id || `option_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                    label: opt.label || '',
                    value: opt.value || ''
                  }));
                  
                  console.log('Validated options array:', validatedOptions);
                  
                  // Get the field name
                  const fieldName = getFieldName();
                  
                  // Update both options and ensure name is preserved
                  onUpdate({ 
                    options: validatedOptions,
                    name: fieldName
                  });
                }}
              >
                <span>+</span> Add Option
              </Button>
            </div>
          </div>
        )}
        
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
        
        {/* Field Mapping */}
        <div className="mt-4">
          <div className="flex items-center mb-1">
            <MapPin className="h-3 w-3 mr-1" />
            <Label className="text-sm font-medium">Field Mapping</Label>
          </div>
          <div className="w-full">
            <FieldMappingSelector
              value={field.mapping as FieldMapping}
              onChange={(mappingObj) => {
                // When mapping is set, ensure the field name is properly set
                if (mappingObj) {
                  let mappingName = mappingObj.type === 'custom' && mappingObj.customKey
                    ? mappingObj.customKey.toLowerCase().replace(/[^a-z0-9]/g, '_')
                    : mappingObj.type.toLowerCase().replace(/[^a-z0-9]/g, '_');
                  
                  // If we have a section title, prefix the mapping name with the section name
                  if (sectionTitle) {
                    const sectionSlug = sectionTitle
                      .toLowerCase()
                      .replace(/[^a-z0-9]/g, '_')
                      .replace(/_+/g, '_')
                      .replace(/^_|_$/g, '');
                    
                    // Combine section name and mapping name
                    mappingName = `${sectionSlug}_${mappingName}`;
                  }
                  
                  // Store the mapping name in the name field and the mapping object in the mapping field
                  onUpdate({ 
                    name: mappingName,
                    mapping: {
                      type: mappingObj.type,
                      value: mappingObj.value,
                      customKey: mappingObj.customKey
                    }
                  });
                } else {
                  onUpdate({ 
                    mapping: undefined
                  });
                }
              }}
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
