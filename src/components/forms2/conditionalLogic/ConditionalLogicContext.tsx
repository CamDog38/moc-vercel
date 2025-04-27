import React, { createContext, useContext, useState, useEffect, useReducer } from 'react';
import { conditionalLogicReducer, initialFormState } from './conditionalLogicReducer';
import { ConditionalLogic, FieldConfig, FieldOption } from '@/lib/forms2/core/types';
import { parseOptions } from '../ui/helpers/optionsHelper';

export interface ConditionalLogicState {
  fieldId: string;
  fieldLabel?: string; // Store the field label for better matching
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
  value: string;
  action: 'show' | 'hide';
}

export interface ConditionalLogicContextType {
  state: ConditionalLogicState;
  updateState: (updates: Partial<ConditionalLogicState>) => void;
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  availableFields: FieldConfig[];
  currentFieldId: string;
  value?: ConditionalLogic;
  onChange: (conditionalLogic: ConditionalLogic | undefined) => void;
  hasOptions: boolean;
  fieldOptions: FieldOption[];
  selectedField?: FieldConfig;
  formState: any; // Form state managed by the conditionalLogicReducer
  dispatch: (action: any) => void; // Dispatch function for the conditionalLogicReducer
}

// Create the context
const ConditionalLogicContext = createContext<ConditionalLogicContextType | undefined>(undefined);

// Provider props
interface ConditionalLogicProviderProps {
  children: React.ReactNode;
  value?: ConditionalLogic;
  onChange: (conditionalLogic: ConditionalLogic | undefined) => void;
  availableFields: FieldConfig[];
  currentFieldId: string;
}

// Provider component
export const ConditionalLogicProvider: React.FC<ConditionalLogicProviderProps> = ({
  children,
  value,
  onChange,
  availableFields,
  currentFieldId,
}) => {
  // State for enabling/disabling conditional logic
  const [enabled, setEnabled] = useState<boolean>(!!value);
  
  // Initialize form state with the conditional logic reducer
  // This ensures values are always preserved in the form builder
  const [formState, dispatch] = useReducer(conditionalLogicReducer, initialFormState);
  
  // Store field selection and values in local state to ensure persistence
  const [state, setState] = useState<ConditionalLogicState>({
    fieldId: value?.when?.field || '',
    fieldLabel: value?.when?.fieldLabel || '', // Store the field label for better matching
    operator: value?.when?.operator || 'equals',
    value: value?.when?.value || '',
    action: value?.action || 'show'
  });

  // Update state function
  const updateState = (updates: Partial<ConditionalLogicState>) => {
    console.log('[CONDITIONAL LOGIC] Updating state with:', updates);
    console.log('[CONDITIONAL LOGIC] Previous state:', state);
    
    setState(prev => {
      const newState = { ...prev, ...updates };
      
      // If we're updating the field, reset the value
      if (updates.fieldId && updates.fieldId !== prev.fieldId) {
        newState.value = '';
        console.log('[CONDITIONAL LOGIC] Field ID changed, resetting value');
        
        // Also update the field label when the field ID changes
        if (updates.fieldId) {
          const selectedField = availableFields.find(field => field.id === updates.fieldId);
          if (selectedField) {
            newState.fieldLabel = selectedField.label || '';
            console.log(`[CONDITIONAL LOGIC] Updated field label to: ${newState.fieldLabel} for field ID: ${updates.fieldId}`);
          } else {
            console.log(`[CONDITIONAL LOGIC] WARNING: Could not find field with ID: ${updates.fieldId}`);
          }
        }
      }
      
      console.log('[CONDITIONAL LOGIC] New state will be:', newState);
      return newState;
    });
    
    // Update the form state directly to ensure persistence
    if (updates.fieldId) {
      dispatch({ 
        type: 'SET_FIELD_VALUE', 
        fieldId: 'when.field', 
        value: updates.fieldId 
      });
      console.log('[CONDITIONAL LOGIC] Updated form state with field ID:', updates.fieldId);
    }
    
    if (updates.value) {
      dispatch({ 
        type: 'SET_FIELD_VALUE', 
        fieldId: `when.value.${state.fieldId}`, 
        value: updates.value 
      });
      console.log('[CONDITIONAL LOGIC] Updated form state with value:', updates.value);
    }
    
    // Important: We need to call onChange with the updated state to persist changes
    // This ensures the parent component is always in sync with our internal state
    if (enabled) {
      // Use setTimeout to ensure this runs after the state update
      setTimeout(() => {
        const updatedState = { ...state, ...updates };
        
        // Ensure we have a field label if it's missing
        let fieldLabel = updatedState.fieldLabel;
        if (!fieldLabel && updatedState.fieldId) {
          const selectedField = availableFields.find(field => field.id === updatedState.fieldId);
          if (selectedField) {
            fieldLabel = selectedField.label || '';
          }
        }
        
        const conditionalLogic: ConditionalLogic = {
          action: updatedState.action,
          when: {
            field: updatedState.fieldId,
            fieldLabel: fieldLabel,
            operator: updatedState.operator,
            value: updatedState.value
          }
        };
        
        console.log('Saving updated conditional logic:', conditionalLogic);
        onChange(conditionalLogic);
      }, 0);
    }
  };

  // Effect to update the parent component when enabled state changes
  useEffect(() => {
    if (enabled) {
      // Ensure we have a field label if it's missing
      let fieldLabel = state.fieldLabel;
      if (!fieldLabel && state.fieldId) {
        const selectedField = availableFields.find(field => field.id === state.fieldId);
        if (selectedField) {
          fieldLabel = selectedField.label || '';
          // Update our internal state with the field label
          setState(prev => ({ ...prev, fieldLabel }));
        }
      }
      
      // Create conditional logic from current state
      const conditionalLogic: ConditionalLogic = {
        action: state.action,
        when: {
          field: state.fieldId,
          fieldLabel: fieldLabel,
          operator: state.operator,
          value: state.value
        }
      };
      
      console.log('Enabling conditional logic with:', conditionalLogic);
      onChange(conditionalLogic);
    } else {
      // If disabled, clear conditional logic
      onChange(undefined);
    }
  }, [enabled]);

  // Filter out the current field from available fields
  const fieldsForConditions = availableFields.filter(field => field.id !== currentFieldId);
  
  // Find the field with the given ID
  const findFieldById = (id: string): FieldConfig | undefined => {
    console.log('[CONDITIONAL LOGIC] Looking for field with ID:', id);
    console.log('[CONDITIONAL LOGIC] Available fields details:', availableFields.map(f => ({ id: f.id, label: f.label, type: f.type })));
    
    // Try to find exact match first
    let field = availableFields.find(f => f.id === id);
    
    if (field) {
      console.log('[CONDITIONAL LOGIC] Found exact field match:', field.label, field.id, field.type);
      return field;
    }
    
    console.log('[CONDITIONAL LOGIC] No exact field match found for ID:', id);
    
    // Try to find a field with a similar ID - handle both legacy and new ID formats
    field = availableFields.find(f => {
      // Handle various ID formats (item_123, field-123, etc.)
      const normalizedId = id.replace(/^(field-|item_)/, '').replace(/(_field|-field)$/, '');
      const normalizedFieldId = f.id.replace(/^(field-|item_)/, '').replace(/(_field|-field)$/, '');
      
      return normalizedFieldId.includes(normalizedId) || normalizedId.includes(normalizedFieldId);
    });
    
    if (field) {
      console.log('[CONDITIONAL LOGIC] Found field with similar ID:', field.id, field.label, field.type);
      return field;
    }
    
    // Try to find by label if available
    if (state.fieldLabel) {
      field = availableFields.find(f => 
        f.label === state.fieldLabel || 
        f.label?.toLowerCase() === state.fieldLabel?.toLowerCase()
      );
      
      if (field) {
        console.log('[CONDITIONAL LOGIC] Found field by matching label:', field.label, field.type);
        return field;
      }
    }
    
    // If we still haven't found it, try to find by value patterns in the ID
    // This helps with legacy forms where IDs might have changed format
    if (id.includes('nationality') || id.includes('province') || id.includes('service')) {
      field = availableFields.find(f => 
        f.label?.toLowerCase().includes('nationality') || 
        f.label?.toLowerCase().includes('province') || 
        f.label?.toLowerCase().includes('service')
      );
      
      if (field) {
        console.log('[CONDITIONAL LOGIC] Found field by keyword in label:', field.label, field.type);
        return field;
      }
    }
    
    console.log('[CONDITIONAL LOGIC] No matching field found for ID:', id);
    return undefined;
  };
  
  // Determine if the selected field has options
  // First try to find by exact ID match
  let selectedField = state.fieldId ? findFieldById(state.fieldId) : undefined;
  
  // If not found, try to find by label or similar ID
  if (!selectedField && state.fieldId) {
    console.log('[CONDITIONAL LOGIC] Field not found by exact ID, trying alternative methods');
    
    // Try to find by label
    if (state.fieldLabel) {
      const fieldByLabel = availableFields.find(f => 
        f.label === state.fieldLabel || 
        f.label?.toLowerCase() === state.fieldLabel?.toLowerCase()
      );
      
      if (fieldByLabel) {
        console.log('[CONDITIONAL LOGIC] Found field by label match:', fieldByLabel);
        selectedField = fieldByLabel;
      }
    }
    
    // Try to find by similar ID if still not found
    if (!selectedField) {
      // Try to find by ID pattern
      const fieldBySimilarId = availableFields.find(f => {
        // Check if the IDs share a common base (ignoring prefixes/suffixes)
        const normalizedStateId = state.fieldId.replace(/^(field-|item_)/, '').replace(/(_field|-field)$/, '');
        const normalizedFieldId = f.id.replace(/^(field-|item_)/, '').replace(/(_field|-field)$/, '');
        
        return normalizedFieldId.includes(normalizedStateId) || 
               normalizedStateId.includes(normalizedFieldId);
      });
      
      if (fieldBySimilarId) {
        console.log('[CONDITIONAL LOGIC] Found field by similar ID:', fieldBySimilarId);
        selectedField = fieldBySimilarId;
      }
    }
  }
  
  console.log('[CONDITIONAL LOGIC] Selected field:', selectedField);
  
  // Check if field is a dropdown type
  const isDropdownType = selectedField?.type === 'select' || 
                        selectedField?.type === 'radio' || 
                        selectedField?.type === 'checkbox';
  
  // Determine if the field has options
  const hasOptions = (!!selectedField && 
                     ((selectedField as any).options || isDropdownType));
                     
  // Log the options for debugging
  if (selectedField) {
    console.log('[CONDITIONAL LOGIC] Field options raw:', (selectedField as any).options);
    console.log('[CONDITIONAL LOGIC] Field options parsed:', parseOptions((selectedField as any).options, selectedField.id, selectedField.label));
  }
  
  // Get options for the selected field
  const fieldOptions = selectedField ? 
    parseOptions((selectedField as any).options, selectedField.id, selectedField.label).map((option: any) => ({
      id: option.id || option.value || `option-${Math.random().toString(36).substring(2, 9)}`,
      label: option.label,
      value: option.value
    })) : [];

  // This function is now defined above

  // Effect to update local state when value prop changes
  useEffect(() => {
    console.log('[CONDITIONAL LOGIC] Value prop changed:', value);
    console.log('[CONDITIONAL LOGIC] Available fields:', availableFields.map(f => ({ id: f.id, label: f.label, type: f.type })));
    
    if (value) {
      console.log('[CONDITIONAL LOGIC] Loading conditional logic details:');
      console.log('  - Action:', value.action);
      console.log('  - When field:', value.when?.field);
      console.log('  - When field label:', value.when?.fieldLabel);
      console.log('  - Operator:', value.when?.operator);
      console.log('  - Value:', value.when?.value);
      
      // First try to find the field by ID
      let selectedFieldId = value.when?.field || '';
      let selectedFieldLabel = value.when?.fieldLabel || '';
      
      // If we have a field ID but no matching field, try to find a similar field
      if (selectedFieldId && !availableFields.some(f => f.id === selectedFieldId)) {
        console.log(`[CONDITIONAL LOGIC] Field ID ${selectedFieldId} not found directly, trying to find a match`);
        
        // Try to find by label first
        if (selectedFieldLabel) {
          const fieldByLabel = availableFields.find(f => 
            f.label === selectedFieldLabel || 
            f.label?.toLowerCase() === selectedFieldLabel?.toLowerCase()
          );
          
          if (fieldByLabel) {
            console.log(`[CONDITIONAL LOGIC] Found field by label: ${fieldByLabel.label} with ID: ${fieldByLabel.id}`);
            selectedFieldId = fieldByLabel.id;
          }
        }
        
        // If still not found, try to find by similar ID
        if (!availableFields.some(f => f.id === selectedFieldId)) {
          const normalizedId = selectedFieldId.replace(/^(field-|item_)/, '').replace(/(_field|-field)$/, '');
          
          const fieldBySimilarId = availableFields.find(f => {
            const normalizedFieldId = f.id.replace(/^(field-|item_)/, '').replace(/(_field|-field)$/, '');
            return normalizedFieldId.includes(normalizedId) || normalizedId.includes(normalizedFieldId);
          });
          
          if (fieldBySimilarId) {
            console.log(`[CONDITIONAL LOGIC] Found field by similar ID: ${fieldBySimilarId.id}`);
            selectedFieldId = fieldBySimilarId.id;
            if (!selectedFieldLabel) {
              selectedFieldLabel = fieldBySimilarId.label || '';
            }
          }
        }
      }
      
      // If we have a field ID but no label, try to get the label
      if (selectedFieldId && !selectedFieldLabel) {
        const field = availableFields.find(f => f.id === selectedFieldId);
        if (field) {
          selectedFieldLabel = field.label || '';
          console.log(`[CONDITIONAL LOGIC] Found label for field: ${selectedFieldLabel}`);
        }
      }
      
      // Create the new state with all the information we have
      const newState = {
        fieldId: selectedFieldId,
        fieldLabel: selectedFieldLabel,
        operator: value.when?.operator || 'equals',
        value: value.when?.value || '',
        action: value.action || 'show'
      };
      
      console.log('[CONDITIONAL LOGIC] Setting state to:', newState);
      setState(newState);
      
      // Also update the form state to ensure persistence
      if (selectedFieldId) {
        dispatch({ 
          type: 'SET_FIELD_VALUE', 
          fieldId: 'when.field', 
          value: selectedFieldId 
        });
      }
      
      if (value.when?.value) {
        dispatch({ 
          type: 'SET_FIELD_VALUE', 
          fieldId: `when.value.${selectedFieldId}`, 
          value: value.when.value 
        });
      }
      
      setEnabled(true);
    } else {
      console.log('[CONDITIONAL LOGIC] No value provided, disabling conditional logic');
      setEnabled(false);
    }
  }, [value, JSON.stringify(availableFields)]);

  // Context value
  const contextValue: ConditionalLogicContextType = {
    state,
    updateState,
    enabled,
    setEnabled,
    availableFields: fieldsForConditions,
    currentFieldId,
    value,
    onChange,
    hasOptions,
    fieldOptions,
    selectedField,
    formState, // Provide the form state managed by conditionalLogicReducer
    dispatch  // Provide the dispatch function
  };

  return (
    <ConditionalLogicContext.Provider value={contextValue}>
      {children}
    </ConditionalLogicContext.Provider>
  );
};

// Custom hook to use the context
export const useConditionalLogic = () => {
  const context = useContext(ConditionalLogicContext);
  if (context === undefined) {
    throw new Error('useConditionalLogic must be used within a ConditionalLogicProvider');
  }
  return context;
};
