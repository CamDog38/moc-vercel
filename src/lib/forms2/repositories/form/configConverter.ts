/**
 * Form Configuration Converter
 * 
 * This file contains utilities for converting between database models and FormConfig.
 */

import { Form } from '@prisma/client';
import { FormConfig, FieldType, FieldConfig } from '../../core/types';
import * as logger from '@/util/logger';

// Interface for database field model that includes additional properties not in FieldConfig
interface DbFieldModel {
  id?: string;
  type?: string;
  label?: string;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  stableId?: string;
  inUseByRules?: boolean;
  order?: number;
  conditionalLogic?: any;
  mapping?: any;
  options?: any;
}

/**
 * Create a mapping of database IDs to stableIds for all fields in a form
 */
function createFieldIdMapping(form: Form): Record<string, string> {
  const mapping: Record<string, string> = {};
  
  // Process all sections and fields
  if (form.sections) {
    // Parse sections if it's a string, otherwise use it directly
    const sectionsArray = typeof form.sections === 'string' 
      ? JSON.parse(form.sections) 
      : form.sections;
      
    if (Array.isArray(sectionsArray)) {
      for (const section of sectionsArray) {
        if (section.fields && Array.isArray(section.fields)) {
          for (const field of section.fields) {
            // Only map fields that have both a database ID and a stableId
            if (field.id && field.stableId) {
              mapping[field.id] = field.stableId;
            }
          }
        }
      }
    }
  }
  
  return mapping;
}

/**
 * Convert database models to FormConfig
 */
export async function convertToFormConfig(form: Form, sections: any[]): Promise<FormConfig> {
  // Extract metadata from fields JSON
  let customFields = {};
  let isMultiPage = form.isMultiPage || false;
  let submitButtonText = '';
  let successMessage = '';
  let isPublic = false;
  
  try {
    if (form.fields) {
      const fieldsObj = typeof form.fields === 'string' 
        ? JSON.parse(form.fields as string) 
        : form.fields;
      
      // Extract known fields
      submitButtonText = fieldsObj.submitButtonText || '';
      successMessage = fieldsObj.successMessage || '';
      isPublic = fieldsObj.isPublic !== undefined ? fieldsObj.isPublic : false;
      
      console.log('Extracted isPublic from fields:', isPublic);
      
      // Extract any other custom fields
      const knownFields = ['version', 'isPublic', 'submitButtonText', 'successMessage'];
      customFields = Object.keys(fieldsObj)
        .filter(key => !knownFields.includes(key))
        .reduce((obj: Record<string, any>, key) => {
          obj[key] = fieldsObj[key];
          return obj;
        }, {});
    }
  } catch (error) {
    logger.error('Error parsing form fields:', 'forms', { error });
  }
  
  // Sort sections by order
  const sortedSections = [...sections].sort((a: any, b: any) => a.order - b.order);
  
  // Create a mapping of database IDs to stableIds
  const fieldIdMapping = createFieldIdMapping(form);
  console.log('Field ID mapping:', fieldIdMapping);
  
  // Build the FormConfig object
  return {
    id: form.id,
    title: form.name,
    description: form.description || undefined,
    sections: sortedSections.map(section => ({
      id: section.id,
      title: section.title,
      description: section.description,
      order: section.order,
      // Parse conditionalLogic if it exists
      conditionalLogic: section.conditionalLogic 
        ? (typeof section.conditionalLogic === 'string' 
            ? JSON.parse(section.conditionalLogic) 
            : section.conditionalLogic)
        : undefined,
      // Sort fields by order
      fields: section.fields
        .sort((a: any, b: any) => a.order - b.order)
        .map((field: any) => {
          // Create base field object
          const baseField = {
            id: field.id,
            type: field.type as FieldType,
            label: field.label,
            name: field.name || field.label,
            placeholder: field.placeholder || undefined,
            helpText: field.helpText || undefined,
            required: field.required || false,
            disabled: false,
            hidden: false,
            stableId: field.stableId,
            inUseByRules: field.inUseByRules,
            order: field.order,
            // Parse conditionalLogic if it exists and normalize field IDs to use stableIds
            conditionalLogic: field?.conditionalLogic 
              ? (() => {
                  // Parse if it's a string
                  const parsedLogic = typeof field?.conditionalLogic === 'string' 
                    ? JSON.parse(field?.conditionalLogic as string) 
                    : field?.conditionalLogic;
                    
                  // If there's no when condition, return as is
                  if (!parsedLogic || !parsedLogic?.when) {
                    return parsedLogic;
                  }
                  
                  // Get the target field ID from the conditional logic
                  const targetFieldId = parsedLogic?.when?.field;
                  if (!targetFieldId) {
                    return parsedLogic;
                  }
                  
                  // If the field ID already looks like a stableId (starts with 'item_'), return as is
                  if (targetFieldId.startsWith('item_')) {
                    console.log(`Field ID ${targetFieldId} is already a stableId, no conversion needed`);
                    return parsedLogic;
                  }
                  
                  // Check if we have a mapping for this field ID
                  const mappedStableId = fieldIdMapping[targetFieldId];
                  if (mappedStableId) {
                    console.log(`Mapping field ID ${targetFieldId} to stableId ${mappedStableId}`);
                    
                    // Create a new conditional logic object with the mapped field ID
                    return {
                      ...parsedLogic,
                      when: {
                        ...parsedLogic.when,
                        field: mappedStableId
                      }
                    };
                  }
                  
                  // Log if we couldn't find a mapping
                  console.log(`No mapping found for field ID ${targetFieldId}, using as is`);
                  return parsedLogic;
                })()
              : undefined,
            // Parse mapping if it exists
            mapping: field.mapping 
              ? (typeof field.mapping === 'string' 
                  ? JSON.parse(field.mapping) 
                  : field.mapping)
              : undefined,
          };

          // Parse type-specific config and ensure options are properly formatted
          let config = {};
          
          // Handle options for select, radio, checkbox fields
          if (field.options) {
            try {
              // Parse options if they're stored as a string
              const parsedOptions = typeof field.options === 'string' 
                ? JSON.parse(field.options) 
                : field.options;
              
              // If options is an array, ensure each option has id, label, and value
              if (Array.isArray(parsedOptions)) {
                const validatedOptions = parsedOptions.map((opt: any) => ({
                  id: opt.id || `option_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                  label: opt.label || '',
                  value: opt.value || ''
                }));
                
                config = { options: validatedOptions };
                console.log(`Validated options for field ${field.id}:`, validatedOptions);
              } else {
                config = parsedOptions;
              }
            } catch (optError) {
              console.error(`Error parsing options for field ${field.id}:`, optError);
              config = {};
            }
          }

          // Combine base field with type-specific config
          return {
            ...baseField,
            ...config,
          };
        }),
    })),
    isMultiPage,
    submitButtonText,
    successMessage,
    isPublic,
    version: 'modern',
    metadata: customFields,
  };
}

/**
 * Extract metadata from form fields JSON
 */
export function extractFormMetadata(fieldsJson: string | object | null | any): Record<string, any> {
  if (!fieldsJson) return {};
  
  try {
    const fieldsObj = typeof fieldsJson === 'string' 
      ? JSON.parse(fieldsJson as string) 
      : fieldsJson;
    
    return fieldsObj || {};
  } catch (error) {
    logger.error('Error parsing form fields JSON:', 'forms', { error });
    return {};
  }
}

/**
 * Update form metadata
 */
export function updateFormMetadata(
  existingMetadata: Record<string, any>,
  updates: Record<string, any>
): string {
  const updatedMetadata = {
    ...existingMetadata,
    ...updates
  };
  
  return JSON.stringify(updatedMetadata);
}

/**
 * Convert database model to FormConfig
 */
export function dbModelToFormConfig(form: Form): FormConfig {
  try {
    // Create a mapping of database IDs to stableIds
    const fieldIdMapping = createFieldIdMapping(form);
    console.log('Field ID mapping:', fieldIdMapping);
    
    // Extract form metadata
    const metadata = extractFormMetadata(form.fields || null);
    
    // Build sections with fields
    const sectionsArray = form.sections ? (typeof form.sections === 'string' ? JSON.parse(form.sections) : form.sections) : [];
    const sections = Array.isArray(sectionsArray) ? sectionsArray.map(section => {
      const fieldsArray = section.fields ? (Array.isArray(section.fields) ? section.fields : []) : [];
      const fields = fieldsArray.map((field: any) => {
        try {
          // Base field properties
          const baseField = {
            id: field?.id || '',
            type: (field?.type || 'text') as FieldType,
            label: field?.label || '',
            placeholder: field?.placeholder || '',
            helpText: field?.helpText || '',
            required: field?.required || false,
            hidden: false,
            stableId: field?.stableId || '',
            inUseByRules: field?.inUseByRules || false,
            order: field?.order || 0,
            // Parse conditionalLogic if it exists and normalize field IDs to use stableIds
            conditionalLogic: field?.conditionalLogic 
              ? (() => {
                  // Parse if it's a string
                  const parsedLogic = typeof field?.conditionalLogic === 'string' 
                    ? JSON.parse(field?.conditionalLogic as string) 
                    : field?.conditionalLogic;
                    
                  // If there's no when condition, return as is
                  if (!parsedLogic || !parsedLogic?.when) {
                    return parsedLogic;
                  }
                  
                  // Get the target field ID from the conditional logic
                  const targetFieldId = parsedLogic?.when?.field;
                  if (!targetFieldId) {
                    return parsedLogic;
                  }
                  
                  // If the field ID already looks like a stableId (starts with 'item_'), return as is
                  if (targetFieldId.startsWith('item_')) {
                    console.log(`Field ID ${targetFieldId} is already a stableId, no conversion needed`);
                    return parsedLogic;
                  }
                  
                  // Check if we have a mapping for this field ID
                  const mappedStableId = fieldIdMapping[targetFieldId];
                  if (mappedStableId) {
                    console.log(`Mapping field ID ${targetFieldId} to stableId ${mappedStableId}`);
                    
                    // Create a new conditional logic object with the mapped field ID
                    return {
                      ...parsedLogic,
                      when: {
                        ...parsedLogic.when,
                        field: mappedStableId
                      }
                    };
                  }
                  
                  // Log if we couldn't find a mapping
                  console.log(`No mapping found for field ID ${targetFieldId}, using as is`);
                  return parsedLogic;
                })()
              : undefined,
            // Parse mapping if it exists
            mapping: field.mapping 
              ? (typeof field.mapping === 'string' 
                  ? JSON.parse(field.mapping) 
                  : field.mapping)
              : undefined,
          };

          // Parse type-specific config and ensure options are properly formatted
          let config = {};
          
          // Handle options for select, radio, checkbox fields
          if (field.options) {
            try {
              // Parse options if they're stored as a string
              const parsedOptions = typeof field.options === 'string' 
                ? JSON.parse(field.options) 
                : field.options;
              
              // If options is an array, ensure each option has id, label, and value
              if (Array.isArray(parsedOptions)) {
                const validatedOptions = parsedOptions.map((opt: any) => ({
                  id: opt.id || `option_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                  label: opt.label || '',
                  value: opt.value || ''
                }));
                
                config = { options: validatedOptions };
                console.log(`Validated options for field ${field.id}:`, validatedOptions);
              } else {
                config = parsedOptions;
              }
            } catch (optError) {
              console.error(`Error parsing options for field ${field.id}:`, optError);
              config = {};
            }
          }

          // Combine base field with type-specific config
          return {
            ...baseField,
            ...config,
          };
        } catch (error) {
          console.error(`Error processing field ${field.id}:`, error);
          return {
            id: field.id,
            type: field.type as FieldType,
            label: field.label || 'Error loading field',
            required: false,
            hidden: true
          };
        }
      });
      
      return {
        id: section.id,
        title: section.title || '',
        description: section.description || '',
        fields,
        order: section.order || 0,
        isPage: section.isPage || false
      };
    }) : [];
    
    // Extract form metadata
    const { submitButtonText, successMessage, isPublic } = metadata;
    
    // Build the FormConfig object
    return {
      id: form.id,
      title: form.name,
      description: form.description || '',
      sections,
      submitButtonText: submitButtonText || 'Submit',
      successMessage: successMessage || 'Thank you for your submission!',
      isMultiPage: form.isMultiPage || false,
      isPublic: isPublic !== undefined ? isPublic : false,
      version: 'modern',
      metadata
    };
  } catch (error) {
    console.error('Error converting database model to FormConfig:', error);
    throw new Error(`Failed to convert form: ${error instanceof Error ? error.message : String(error)}`);
  }
}
