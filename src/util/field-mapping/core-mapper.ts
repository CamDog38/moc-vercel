/**
 * Core mapping functionality for Form System 2.0 field IDs to stable identifiers
 * This helps with email rules that need to reference fields even when IDs change
 *
*/

import prisma from '@/lib/prisma';
import { addApiLog } from '@/pages/api/debug/logs';
import { extractFieldsFromForm, convertToCamelCase } from './field-utilities';
import { mapSpecialFieldsByLabel, mapSpecialFieldsByType, findEmailInFormData, processArrayFormData } from './field-utilities';

// Define valid log categories
export type LogCategory = 'other' | 'bookings' | 'leads' | 'emails' | 'forms';

// Helper function to log with the correct category
export function logMessage(message: string, level: 'info' | 'error' | 'success', category: LogCategory = 'forms'): void {
  addApiLog(message, level, category);
}

/**
 * Maps form field IDs to their corresponding stable identifiers for Form System 2.0
 * @param formId The ID of the form (must be a Form System 2.0 form)
 * @param formData The form submission data containing field IDs as keys
 * @returns A new object with both original IDs and mapped stable identifiers
 */
export async function mapFieldIds(formId: string, formData: Record<string, any>): Promise<Record<string, any>> {
  try {
    // Verify this is a Form System 2.0 form
    if (!formId.startsWith('form2_')) {
      logMessage(`Warning: Non-Form System 2.0 form ID provided: ${formId}`, 'error', 'forms');
      // Still proceed with mapping attempt
    }
    
    logMessage(`Mapping fields for Form System 2.0 form: ${formId}`, 'info', 'forms');
    
    // Create a copy of the original form data
    const mappedData = { ...formData };
    
    // Get the Form System 2.0 form
    const form = await prisma.form.findUnique({
      where: { id: formId },
      select: {
        id: true,
        name: true,
        fields: true,
        sections: true
      }
    });

    if (!form) {
      logMessage(`Form System 2.0 form not found with ID: ${formId}`, 'error', 'forms');
      return mappedData;
    }

    // Parse sections and fields from JSON
    const allFields = extractFieldsFromForm(form);
    
    logMessage(`Found ${allFields.length} fields in form ${formId}`, 'info', 'forms');
    
    // Map fields based on their properties
    allFields.forEach((field: any) => {
      // Skip fields that don't have a value in the form data
      if (!field.id || formData[field.id] === undefined) {
        return;
      }
      
      // Add the field value using its ID (original)
      mappedData[field.id] = formData[field.id];
      
      // Add the field value using its stable ID if available
      if (field.stableId) {
        mappedData[field.stableId] = formData[field.id];
        logMessage(`Mapped field ${field.id} to stable ID ${field.stableId}`, 'info', 'forms');
      }
      
      // Add mappings based on field properties
      
      // 1. Use the mapping property if available
      if (field.mapping) {
        mappedData[field.mapping] = formData[field.id];
        logMessage(`Mapped field ${field.id} to ${field.mapping}`, 'info', 'forms');
      }
      
      // 2. Use the field label converted to camelCase
      if (field.label) {
        const camelCaseLabel = convertToCamelCase(field.label);
        
        if (camelCaseLabel && camelCaseLabel !== field.mapping) {
          mappedData[camelCaseLabel] = formData[field.id];
          logMessage(`Mapped field ${field.id} to ${camelCaseLabel} (from label)`, 'info', 'forms');
        }
        
        // Map special fields based on label
        mapSpecialFieldsByLabel(field, formData[field.id], mappedData);
      }
      
      // 3. Map special fields based on type
      mapSpecialFieldsByType(field, formData[field.id], mappedData);
    });
    
    // Handle array-based form data (alternative format)
    if (Array.isArray(formData)) {
      processArrayFormData(formData, allFields, mappedData);
    }
    
    // Special case: if there's no email field found but we have a field with 'email' in its key
    if (!mappedData['email']) {
      findEmailInFormData(formData, mappedData);
    }
    
    return mappedData;
  } catch (error) {
    logMessage(`Error mapping field IDs: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'forms');
    return formData; // Return original form data if mapping fails
  }
}

/**
 * Maps a specific field ID to a stable identifier for Form System 2.0
 * @param formId The ID of the form
 * @param fieldId The field ID to map
 * @returns The stable identifier for the field, or the original ID if not found
 */
export async function mapSingleFieldId(formId: string, fieldId: string): Promise<string> {
  try {
    // Verify this is a Form System 2.0 form
    if (!formId.startsWith('form2_')) {
      logMessage(`Warning: Non-Form System 2.0 form ID provided: ${formId}`, 'error', 'forms');
      // Still proceed with mapping attempt
    }
    
    // Get the Form System 2.0 form
    const form = await prisma.form.findUnique({
      where: { id: formId },
      select: {
        id: true,
        name: true,
        fields: true,
        sections: true
      }
    });

    if (!form) {
      logMessage(`Form System 2.0 form not found with ID: ${formId}`, 'error', 'forms');
      return fieldId;
    }

    // Parse sections and fields from JSON
    const allFields = extractFieldsFromForm(form);
    
    // Find the field with the matching ID
    const field = allFields.find((f: any) => f.id === fieldId);
    
    if (!field) {
      logMessage(`Field with ID ${fieldId} not found in form ${formId}`, 'error', 'forms');
      return fieldId;
    }
    
    // Return the stable ID if available
    if (field.stableId) {
      logMessage(`Mapped field ${fieldId} to stable ID ${field.stableId}`, 'info', 'forms');
      return field.stableId;
    }
    
    // Return the mapping if available
    if (field.mapping) {
      logMessage(`Mapped field ${fieldId} to ${field.mapping}`, 'info', 'forms');
      return field.mapping;
    }
    
    // Return the camelCase label if available
    if (field.label) {
      const camelCaseLabel = convertToCamelCase(field.label);
      
      if (camelCaseLabel) {
        logMessage(`Mapped field ${fieldId} to ${camelCaseLabel} (from label)`, 'info', 'forms');
        return camelCaseLabel;
      }
    }
    
    // Return the original field ID if no mapping found
    return fieldId;
  } catch (error) {
    logMessage(`Error mapping field ID: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'forms');
    return fieldId; // Return original field ID if mapping fails
  }
}
