/**
 * Utility for mapping Form System 2.0 field IDs to stable identifiers
 * This helps with email rules that need to reference fields even when IDs change
 * and provides robust variable replacement for email templates
 */

import prisma from '@/lib/prisma';
import { addApiLog } from '@/pages/api/debug/logs';

// Define valid log categories
type LogCategory = 'other' | 'bookings' | 'leads' | 'emails' | 'forms';

// Define field types that we want to map specially
type SpecialFieldType = 'email' | 'phone' | 'name' | 'firstName' | 'lastName' | 'company' | 'address' | 'city' | 'state' | 'zip' | 'country';

// Helper function to log with the correct category
function logMessage(message: string, level: 'info' | 'error' | 'success', category: LogCategory = 'forms'): void {
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
    
    // Log the keys in the mapped data for debugging
    logMessage(`Mapped data keys: ${Object.keys(mappedData).join(', ')}`, 'info', 'forms');
    
    return mappedData;
  } catch (error) {
    logMessage(`Error mapping field IDs: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'forms');
    return formData; // Return original data if mapping fails
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

    // Find the field with the given ID
    const field = allFields.find(f => f.id === fieldId);
    
    if (!field) {
      logMessage(`Field not found with ID: ${fieldId} in form ${formId}`, 'error', 'forms');
      return fieldId;
    }

    // Return the stable ID if available, otherwise use mapping or original ID
    if (field.stableId) {
      logMessage(`Mapped field ${fieldId} to stable ID ${field.stableId}`, 'info', 'forms');
      return field.stableId;
    }
    
    if (field.mapping) {
      logMessage(`Mapped field ${fieldId} to mapping ${field.mapping}`, 'info', 'forms');
      return field.mapping;
    }
    
    // Use the field label converted to camelCase as a fallback
    if (field.label) {
      const camelCaseLabel = convertToCamelCase(field.label);
      
      if (camelCaseLabel) {
        logMessage(`Mapped field ${fieldId} to ${camelCaseLabel} (from label)`, 'info', 'forms');
        return camelCaseLabel;
      }
    }

    // Return the original ID if no stable identifier is found
    return fieldId;
  } catch (error) {
    logMessage(`Error mapping field ID: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'forms');
    return fieldId;
  }
}

/**
 * Finds a field value in form data based on a stable identifier for Form System 2.0
 * @param formId The ID of the form
 * @param stableId The stable identifier to look for
 * @param formData The form submission data
 * @returns The field value if found, or undefined if not found
 */
export async function findFieldValueByStableId(formId: string, stableId: string, formData: Record<string, any>): Promise<any> {
  try {
    logMessage(`Looking for field value with stable ID: ${stableId} in form ${formId}`, 'info', 'emails');
    
    // First check if the stable ID exists directly in the form data
    if (formData[stableId] !== undefined) {
      logMessage(`Found direct match for stable ID ${stableId} in form data`, 'info', 'emails');
      return formData[stableId];
    }
    
    // Log all keys in formData for debugging
    logMessage(`Form data keys: ${Object.keys(formData).join(', ')}`, 'info', 'emails');
    
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
      logMessage(`Form System 2.0 form not found with ID: ${formId}`, 'error', 'emails');
      return undefined;
    }

    // Parse sections and fields from JSON
    const allFields = extractFieldsFromForm(form);
    
    logMessage(`Found ${allFields.length} fields in form ${formId} when searching for ${stableId}`, 'info', 'emails');
    
    // Log all fields with their IDs and stable IDs for debugging
    allFields.forEach(field => {
      logMessage(`Field: ${field.id}, Label: ${field.label}, StableId: ${field.stableId || 'none'}`, 'info', 'emails');
    });
    
    // Find a field with a matching stableId
    const fieldWithStableId = allFields.find(field => field.stableId === stableId);
    if (fieldWithStableId) {
      logMessage(`Found field ${fieldWithStableId.id} with stable ID ${stableId}`, 'info', 'emails');
      
      // Check if the field ID exists in the form data
      if (formData[fieldWithStableId.id] !== undefined) {
        logMessage(`Found value for field ${fieldWithStableId.id} with stable ID ${stableId}`, 'info', 'emails');
        return formData[fieldWithStableId.id];
      }
      
      // If the field ID doesn't exist in the form data, try to find it by other means
      logMessage(`Field ID ${fieldWithStableId.id} not found in form data, trying alternative methods`, 'info', 'emails');
    }
    
    // Find a field with a matching mapping
    const fieldWithMapping = allFields.find(field => field.mapping === stableId);
    if (fieldWithMapping && formData[fieldWithMapping.id] !== undefined) {
      logMessage(`Found field ${fieldWithMapping.id} with mapping ${stableId}`, 'info', 'emails');
      return formData[fieldWithMapping.id];
    }
    
    // Find a field with a matching label
    const fieldWithMatchingLabel = allFields.find(field => {
      if (!field.label) return false;
      
      // Check for exact label match
      if (field.label.toLowerCase() === stableId.toLowerCase()) {
        return true;
      }
      
      // Check for camelCase label match
      const camelCaseLabel = field.label.toLowerCase().replace(/[^a-z0-9]+(.)/g, (_: string, char: string) => char.toUpperCase());
      return camelCaseLabel === stableId;
    });
    
    if (fieldWithMatchingLabel && formData[fieldWithMatchingLabel.id] !== undefined) {
      logMessage(`Found field ${fieldWithMatchingLabel.id} with label matching ${stableId}`, 'info', 'emails');
      return formData[fieldWithMatchingLabel.id];
    }
    
    // Check for special field types (email, phone, name, etc.)
    const specialFieldValue = findSpecialFieldValue(stableId, allFields, formData);
    if (specialFieldValue !== undefined) {
      logMessage(`Found special field value for ${stableId}`, 'info', 'emails');
      return specialFieldValue;
    }
    
    // Try to find a field with a similar ID or key
    const similarField = allFields.find(field => {
      // Check if the field ID contains the stable ID or vice versa
      if (field.id.includes(stableId) || stableId.includes(field.id)) {
        return true;
      }
      
      // Check if the field has a key that matches or contains the stable ID
      if (field.key && (field.key === stableId || field.key.includes(stableId) || stableId.includes(field.key))) {
        return true;
      }
      
      return false;
    });
    
    if (similarField && formData[similarField.id] !== undefined) {
      logMessage(`Found field ${similarField.id} with similar ID or key to ${stableId}`, 'info', 'emails');
      return formData[similarField.id];
    }
    
    // If all else fails, look for a field ID in the form data that contains the stable ID
    const fieldWithIdContainingStableId = Object.keys(formData).find(key => 
      key.includes(stableId) || stableId.includes(key)
    );
    
    if (fieldWithIdContainingStableId) {
      logMessage(`Found field ${fieldWithIdContainingStableId} containing stable ID ${stableId}`, 'info', 'emails');
      return formData[fieldWithIdContainingStableId];
    }
    
    logMessage(`No field found for stable ID ${stableId}`, 'error', 'emails');
    return undefined;
  } catch (error) {
    logMessage(`Error finding field value by stable ID: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'emails');
    return undefined;
  }
}

/**
 * Replaces variables in a template with values from form data
 * @param template The template string with variables in the format {{variable}}
 * @param formId The ID of the form
 * @param formData The form submission data
 * @returns The template with variables replaced with values
 */
export async function replaceVariables(template: string, formId: string, formData: Record<string, any>): Promise<string> {
  try {
    // Extract variables from the template
    const variableRegex = /{{([^{}]+)}}/g;
    const variables = [];
    let match;
    
    while ((match = variableRegex.exec(template)) !== null) {
      variables.push(match[1].trim());
    }
    
    // No variables found, return the template as is
    if (variables.length === 0) {
      return template;
    }
    
    logMessage(`Found ${variables.length} variables in template: ${variables.join(', ')}`, 'info', 'forms');
    
    // Replace each variable with its value
    let result = template;
    
    for (const variable of variables) {
      const value = await findFieldValueByStableId(formId, variable, formData);
      
      if (value !== undefined) {
        // Replace all occurrences of the variable
        const regex = new RegExp(`{{\\s*${variable}\\s*}}`, 'g');
        result = result.replace(regex, String(value));
        logMessage(`Replaced variable {{${variable}}} with value: ${value}`, 'info', 'forms');
      } else {
        // If no value found, replace with empty string
        const regex = new RegExp(`{{\\s*${variable}\\s*}}`, 'g');
        result = result.replace(regex, '');
        logMessage(`No value found for variable {{${variable}}}, replaced with empty string`, 'info', 'forms');
      }
    }
    
    return result;
  } catch (error) {
    logMessage(`Error replacing variables: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'forms');
    return template; // Return original template if replacement fails
  }
}

/**
 * Helper function to extract fields from a Form System 2.0 form
 * @param form The form object from the database
 * @returns An array of all fields from the form
 */
function extractFieldsFromForm(form: any): any[] {
  let allFields: any[] = [];
  
  // Extract fields from sections
  if (form.sections) {
    try {
      const sectionsData = typeof form.sections === 'string' 
        ? JSON.parse(form.sections as string) 
        : form.sections;
        
      if (Array.isArray(sectionsData)) {
        sectionsData.forEach((section: any) => {
          if (section.fields && Array.isArray(section.fields)) {
            allFields = [...allFields, ...section.fields];
          }
        });
      }
    } catch (e) {
      logMessage(`Error parsing sections data: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error', 'forms');
    }
  }
  
  // Extract standalone fields if any
  if (form.fields) {
    try {
      const fieldsData = typeof form.fields === 'string'
        ? JSON.parse(form.fields as string)
        : form.fields;
        
      if (Array.isArray(fieldsData)) {
        allFields = [...allFields, ...fieldsData];
      }
    } catch (e) {
      logMessage(`Error parsing fields data: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error', 'forms');
    }
  }
  
  return allFields;
}

/**
 * Helper function to convert a string to camelCase
 * @param str The string to convert
 * @returns The camelCase version of the string
 */
function convertToCamelCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (_: string, chr: string) => chr.toUpperCase())
    .replace(/[^a-zA-Z0-9]+/g, '')
    .replace(/^[A-Z]/, (firstChar: string) => firstChar.toLowerCase());
}

/**
 * Helper function to map special fields based on field type
 * @param field The field object
 * @param fieldValue The value of the field
 * @param mappedData The object to add mappings to
 */
function mapSpecialFieldsByType(field: any, fieldValue: any, mappedData: Record<string, any>): void {
  if (!field.type) return;
  
  switch (field.type.toLowerCase()) {
    case 'email':
      mappedData['email'] = fieldValue;
      logMessage(`Mapped field ${field.id} to email (from type)`, 'info', 'forms');
      break;
    case 'tel':
    case 'phone':
      mappedData['phone'] = fieldValue;
      logMessage(`Mapped field ${field.id} to phone (from type)`, 'info', 'forms');
      break;
    case 'name':
      mappedData['name'] = fieldValue;
      logMessage(`Mapped field ${field.id} to name (from type)`, 'info', 'forms');
      break;
    case 'text':
      // For text fields, check if the ID or label contains special field names
      if (field.id) {
        const idLower = field.id.toLowerCase();
        if (idLower.includes('name') && !idLower.includes('first') && !idLower.includes('last')) {
          mappedData['name'] = fieldValue;
          logMessage(`Mapped field ${field.id} to name (from id)`, 'info', 'forms');
        } else if (idLower.includes('firstname') || idLower.includes('first_name') || idLower.includes('first-name')) {
          mappedData['firstName'] = fieldValue;
          logMessage(`Mapped field ${field.id} to firstName (from id)`, 'info', 'forms');
        } else if (idLower.includes('lastname') || idLower.includes('last_name') || idLower.includes('last-name')) {
          mappedData['lastName'] = fieldValue;
          logMessage(`Mapped field ${field.id} to lastName (from id)`, 'info', 'forms');
        } else if (idLower.includes('company') || idLower.includes('organization') || idLower.includes('business')) {
          mappedData['company'] = fieldValue;
          logMessage(`Mapped field ${field.id} to company (from id)`, 'info', 'forms');
        }
      }
      break;
  }
}

/**
 * Helper function to map special fields based on field label
 * @param field The field object
 * @param fieldValue The value of the field
 * @param mappedData The object to add mappings to
 */
function mapSpecialFieldsByLabel(field: any, fieldValue: any, mappedData: Record<string, any>): void {
  if (!field.label) return;
  
  const labelLower = field.label.toLowerCase();
  
  if (labelLower.includes('email')) {
    mappedData['email'] = fieldValue;
    logMessage(`Mapped field ${field.id} to email (from label)`, 'info', 'forms');
  }
  
  if (labelLower.includes('phone') || labelLower.includes('tel')) {
    mappedData['phone'] = fieldValue;
    logMessage(`Mapped field ${field.id} to phone (from label)`, 'info', 'forms');
  }
  
  if (labelLower.includes('name') && !labelLower.includes('first') && !labelLower.includes('last')) {
    mappedData['name'] = fieldValue;
    logMessage(`Mapped field ${field.id} to name (from label)`, 'info', 'forms');
  }
  
  if (labelLower.includes('first name')) {
    mappedData['firstName'] = fieldValue;
    logMessage(`Mapped field ${field.id} to firstName (from label)`, 'info', 'forms');
  }
  
  if (labelLower.includes('last name')) {
    mappedData['lastName'] = fieldValue;
    logMessage(`Mapped field ${field.id} to lastName (from label)`, 'info', 'forms');
  }
  
  if (labelLower.includes('company') || labelLower.includes('organization') || labelLower.includes('business')) {
    mappedData['company'] = fieldValue;
    logMessage(`Mapped field ${field.id} to company (from label)`, 'info', 'forms');
  }
  
  if (labelLower.includes('address') && !labelLower.includes('email')) {
    mappedData['address'] = fieldValue;
    logMessage(`Mapped field ${field.id} to address (from label)`, 'info', 'forms');
  }
  
  if (labelLower.includes('city')) {
    mappedData['city'] = fieldValue;
    logMessage(`Mapped field ${field.id} to city (from label)`, 'info', 'forms');
  }
  
  if (labelLower.includes('state') || labelLower.includes('province')) {
    mappedData['state'] = fieldValue;
    logMessage(`Mapped field ${field.id} to state (from label)`, 'info', 'forms');
  }
  
  if (labelLower.includes('zip') || labelLower.includes('postal')) {
    mappedData['zip'] = fieldValue;
    logMessage(`Mapped field ${field.id} to zip (from label)`, 'info', 'forms');
  }
  
  if (labelLower.includes('country')) {
    mappedData['country'] = fieldValue;
    logMessage(`Mapped field ${field.id} to country (from label)`, 'info', 'forms');
  }
}

/**
 * Helper function to process array-based form data
 * @param formData The array-based form data
 * @param allFields All fields from the form
 * @param mappedData The object to add mappings to
 */
function processArrayFormData(formData: any[], allFields: any[], mappedData: Record<string, any>): void {
  formData.forEach((item, index) => {
    if (item && typeof item === 'object' && item.id) {
      // Find the field with this ID
      const field = allFields.find(f => f.id === item.id);
      if (field && item.value !== undefined) {
        // Map based on field properties
        if (field.type === 'email' || (field.label && field.label.toLowerCase().includes('email'))) {
          mappedData['email'] = item.value;
          logMessage(`Mapped array item ${index} (field ${item.id}) to email`, 'info', 'forms');
        } else if (field.type === 'tel' || field.type === 'phone' || 
                  (field.label && (field.label.toLowerCase().includes('phone') || field.label.toLowerCase().includes('tel')))) {
          mappedData['phone'] = item.value;
          logMessage(`Mapped array item ${index} (field ${item.id}) to phone`, 'info', 'forms');
        } else if (field.type === 'name' || (field.label && field.label.toLowerCase().includes('name'))) {
          mappedData['name'] = item.value;
          logMessage(`Mapped array item ${index} (field ${item.id}) to name`, 'info', 'forms');
        }
      }
    }
  });
}

/**
 * Helper function to find an email in form data
 * @param formData The form data
 * @param mappedData The object to add mappings to
 */
function findEmailInFormData(formData: Record<string, any>, mappedData: Record<string, any>): void {
  // Look for any field in formData that might contain an email
  const emailKey = Object.keys(formData).find(key => 
    key.toLowerCase().includes('email') && 
    typeof formData[key] === 'string' && 
    formData[key].includes('@')
  );
  
  if (emailKey) {
    mappedData['email'] = formData[emailKey];
    logMessage(`Found email field by key search: ${emailKey}`, 'info', 'forms');
  }
}

/**
 * Helper function to find a special field value
 * @param stableId The stable ID to look for
 * @param allFields All fields from the form
 * @param formData The form data
 * @returns The field value if found, or undefined if not found
 */
function findSpecialFieldValue(stableId: string, allFields: any[], formData: Record<string, any>): any {
  // Check for special field types
  if (stableId === 'email') {
    // First look for a field with type 'email'
    const emailField = allFields.find(field => field.type === 'email');
    if (emailField && formData[emailField.id] !== undefined) {
      logMessage(`Found email field ${emailField.id} for stable ID ${stableId}`, 'info', 'forms');
      return formData[emailField.id];
    }
    
    // Then look for a field with 'email' in the label
    const emailLabelField = allFields.find(field => field.label && field.label.toLowerCase().includes('email'));
    if (emailLabelField && formData[emailLabelField.id] !== undefined) {
      logMessage(`Found email field ${emailLabelField.id} from label for stable ID ${stableId}`, 'info', 'forms');
      return formData[emailLabelField.id];
    }
    
    // Then look for a field with 'email' in the ID
    const emailIdField = allFields.find(field => field.id.toLowerCase().includes('email'));
    if (emailIdField && formData[emailIdField.id] !== undefined) {
      logMessage(`Found email field ${emailIdField.id} from ID for stable ID ${stableId}`, 'info', 'forms');
      return formData[emailIdField.id];
    }
    
    // Finally, look for any field in formData that might contain an email
    const emailKeyInFormData = Object.keys(formData).find(key => 
      key.toLowerCase().includes('email') && 
      typeof formData[key] === 'string' && 
      formData[key].includes('@')
    );
    
    if (emailKeyInFormData) {
      logMessage(`Found email field directly in form data with key ${emailKeyInFormData}`, 'info', 'forms');
      return formData[emailKeyInFormData];
    }
  } else if (stableId === 'phone') {
    // Look for a field with type 'tel' or 'phone'
    const phoneField = allFields.find(field => field.type === 'tel' || field.type === 'phone');
    if (phoneField && formData[phoneField.id] !== undefined) {
      logMessage(`Found phone field ${phoneField.id} for stable ID ${stableId}`, 'info', 'forms');
      return formData[phoneField.id];
    }
    
    // Look for a field with 'phone' or 'tel' in the label
    const phoneLabelField = allFields.find(field => 
      field.label && (field.label.toLowerCase().includes('phone') || field.label.toLowerCase().includes('tel'))
    );
    if (phoneLabelField && formData[phoneLabelField.id] !== undefined) {
      logMessage(`Found phone field ${phoneLabelField.id} from label for stable ID ${stableId}`, 'info', 'forms');
      return formData[phoneLabelField.id];
    }
  } else if (stableId === 'name') {
    // Look for a field with type 'name'
    const nameField = allFields.find(field => field.type === 'name' || (field.label && field.label.toLowerCase().includes('name')));
    if (nameField && formData[nameField.id] !== undefined) {
      logMessage(`Found name field ${nameField.id} for stable ID ${stableId}`, 'info', 'forms');
      return formData[nameField.id];
    }
  }
  
  return undefined;
}
