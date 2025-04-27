/**
 * Field Handlers for Form Builder 2.0
 * 
 * This file contains handlers for adding, updating, and deleting fields in the form builder.
 */

import { FieldConfig, FieldType, FormConfig } from '@/lib/forms2/core/types';
import { generateId } from '@/lib/forms2/utils/idUtils';

/**
 * Creates a new field of the specified type
 */
export const createField = (type: FieldType): FieldConfig => {
  // Ensure the type is valid and handle textarea separately
  const fieldType = type === 'textarea' ? 'text' : type;
  
  // Common properties for all field types
  const baseProps = {
    id: generateId(),
    name: `field_${generateId(6)}`,
    label: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Field`,
    required: false,
    disabled: false,
    hidden: false,
    placeholder: '',
    helpText: '',
  };
  
  // Create specific field type based on the fieldType
  if (fieldType === 'text') {
    return {
      ...baseProps,
      type: 'text',
    };
  } else if (fieldType === 'email') {
    return {
      ...baseProps,
      type: 'email',
    };
  } else if (fieldType === 'tel') {
    return {
      ...baseProps,
      type: 'tel',
    };
  } else if (fieldType === 'number') {
    return {
      ...baseProps,
      type: 'number',
    };
  } else if (fieldType === 'date' || fieldType === 'time' || fieldType === 'datetime' || 
             fieldType === 'datetime-local' || fieldType === 'dob') {
    return {
      ...baseProps,
      type: fieldType as 'date' | 'time' | 'datetime' | 'datetime-local' | 'dob',
    };
  } else if (fieldType === 'select' || fieldType === 'multiselect') {
    return {
      ...baseProps,
      type: fieldType as 'select' | 'multiselect',
      options: [
        { id: generateId(), value: 'option1', label: 'Option 1' },
        { id: generateId(), value: 'option2', label: 'Option 2' }
      ]
    };
  } else if (fieldType === 'checkbox') {
    return {
      ...baseProps,
      type: 'checkbox',
      options: [
        { id: generateId(), value: 'option1', label: 'Option 1' },
        { id: generateId(), value: 'option2', label: 'Option 2' }
      ]
    };
  } else if (fieldType === 'radio') {
    return {
      ...baseProps,
      type: 'radio',
      options: [
        { id: generateId(), value: 'option1', label: 'Option 1' },
        { id: generateId(), value: 'option2', label: 'Option 2' }
      ]
    };
  } else if (fieldType === 'file') {
    return {
      ...baseProps,
      type: 'file',
    };
  } else {
    // Default to text field if type is not recognized
    return {
      ...baseProps,
      type: 'text',
    };
  }
};

/**
 * Adds a new field to a section
 */
export const addField = (
  formConfig: FormConfig, 
  type: FieldType, 
  sectionIndex: number
): FormConfig => {
  const newField = createField(type);
  
  const updatedSections = [...formConfig.sections];
  updatedSections[sectionIndex] = {
    ...updatedSections[sectionIndex],
    fields: [...updatedSections[sectionIndex].fields, newField]
  };
  
  return {
    ...formConfig,
    sections: updatedSections
  };
};

/**
 * Updates an existing field
 */
export const updateField = (
  formConfig: FormConfig, 
  sectionIndex: number, 
  fieldIndex: number, 
  updatedField: FieldConfig
): FormConfig => {
  const updatedSections = [...formConfig.sections];
  const updatedFields = [...updatedSections[sectionIndex].fields];
  updatedFields[fieldIndex] = updatedField;
  
  updatedSections[sectionIndex] = {
    ...updatedSections[sectionIndex],
    fields: updatedFields
  };
  
  return {
    ...formConfig,
    sections: updatedSections
  };
};

/**
 * Deletes a field
 */
export const deleteField = (
  formConfig: FormConfig, 
  sectionIndex: number, 
  fieldIndex: number
): FormConfig => {
  const updatedSections = [...formConfig.sections];
  const updatedFields = updatedSections[sectionIndex].fields.filter((_, index) => index !== fieldIndex);
  
  updatedSections[sectionIndex] = {
    ...updatedSections[sectionIndex],
    fields: updatedFields
  };
  
  return {
    ...formConfig,
    sections: updatedSections
  };
};
