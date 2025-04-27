import React from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useConditionalLogic } from './ConditionalLogicContext';
import { createConditionalLogic } from './helpers';
import { FieldConfig } from '@/lib/forms2/core/types';

export const FieldSelector: React.FC = () => {
  const { state, updateState, availableFields, onChange } = useConditionalLogic();

  const handleFieldChange = (fieldId: string) => {
    // Find the selected field to get its label
    const selectedField = availableFields.find(f => f.id === fieldId);
    const fieldLabel = selectedField?.label || '';
    
    // Get the stable ID if available, or use the field ID
    // This is crucial for matching fields correctly in both builder and public views
    const databaseId = fieldId; // The ID used in the builder
    
    // Extract a stable ID from the field if possible
    // First check if there's a stableId property
    let stableId = (selectedField as any)?.stableId || '';
    
    // If no stableId, try to extract one from the ID format
    if (!stableId && fieldId) {
      // If the ID looks like a legacy format (item_123456_xyz), extract that as stable ID
      if (fieldId.startsWith('item_')) {
        stableId = fieldId;
      } else {
        // Otherwise just use the field ID as the stable ID
        stableId = fieldId;
      }
    }
    
    console.log(`[FIELD SELECTOR] Field changed to: ${fieldLabel}`);
    console.log(`[FIELD SELECTOR] Database ID: ${databaseId}, Stable ID: ${stableId}`);
    console.log(`[FIELD SELECTOR] Field type: ${(selectedField as FieldConfig)?.type}`);
    
    // Update local state with the ID, label, and reset the value
    updateState({ 
      fieldId: databaseId, // Keep the database ID for UI selection
      fieldLabel, // Store the field label for better matching later
      value: '' // Reset value when changing fields
    });
    
    // Notify parent component with the updated conditional logic
    if (onChange) {
      const updatedLogic = {
        action: state.action,
        when: {
          field: databaseId, // Use database ID for builder compatibility
          fieldLabel, // Include the field label for better matching
          operator: state.operator,
          value: ''
        }
      };
      
      console.log('[FIELD SELECTOR] Updated conditional logic:', updatedLogic);
      onChange(updatedLogic);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="field" className="text-sm font-medium">When</Label>
      <Select 
        value={state.fieldId || ''} 
        onValueChange={handleFieldChange}
        disabled={availableFields.length === 0}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select field" />
        </SelectTrigger>
        <SelectContent>
          {availableFields.map((field) => (
            <SelectItem key={field.id} value={field.id}>
              {field.label || 'Unnamed Field'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default FieldSelector;
