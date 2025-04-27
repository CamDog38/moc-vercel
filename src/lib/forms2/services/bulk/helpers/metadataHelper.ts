/**
 * Metadata Helper
 * 
 * Helper functions for creating and managing form submission metadata
 */

import * as logger from '@/util/logger';
import { FieldConfig, FieldMapping } from '@/lib/forms2/core/types';

/**
 * Creates the __mappedFields metadata structure for form submissions
 * 
 * @param formData The raw form data
 * @param allFields Array of field configurations from the form
 * @returns The __mappedFields metadata object
 */
export function createMappedFieldsMetadata(
  formData: Record<string, any>,
  allFields: FieldConfig[]
): Record<string, any> {
  console.log(`[LEAD SUBMISSION] Creating __mappedFields metadata structure`);
  
  // Create an empty __mappedFields object to store the metadata
  const mappedFields: Record<string, any> = {};
  
  // Process standard fields (firstName, lastName, email, phone, etc.)
  const standardFieldMappings: Record<string, string[]> = {
    name: ['name', 'fullName', 'full_name'],
    // We'll map these to 'name' and 'custom' in the actual metadata
    // but keep them here for identification purposes
    'first_name': ['firstName', 'first_name', 'fname', 'first'],
    'last_name': ['lastName', 'last_name', 'lname', 'last'],
    email: ['email', 'emailAddress', 'email_address'],
    phone: ['phone', 'phoneNumber', 'phone_number', 'mobile', 'cell'],
    date: ['date', 'bookingDate', 'booking_date', 'eventDate', 'event_date'],
    time: ['time', 'bookingTime', 'booking_time', 'eventTime', 'event_time'],
    location: ['location', 'venue', 'place'],
    location_office: ['office', 'branch', 'location_office'],
    custom: ['other', 'custom', 'additional', 'extra', 'notes', 'comments', 'questions']
  };
  
  // First pass: Look for fields with explicit mappings in field configuration
  for (const field of allFields) {
    if (!field.id) continue;
    
    // Skip if no value in form data
    if (formData[field.id] === undefined || formData[field.id] === null || formData[field.id] === '') continue;
    
    const fieldId = field.id;
    const fieldValue = formData[fieldId];
    const fieldLabel = field.label || '';
    
    // Check if this field has explicit mapping in field configuration
    if (field.mapping) {
      // Get the mapping type, defaulting to 'custom' if undefined
      let mappingKey = field.mapping.type || 'custom';
      
      // Store the original mapping key for the metadata
      const originalMappingKey = mappingKey;
      
      // For UI display purposes, we'll use firstName and lastName
      // but in the actual metadata we'll use the valid mapping types
      let displayKey: string = mappingKey;
      
      // Special handling for first name and last name fields
      if (fieldLabel) {
        const labelLower = fieldLabel.toLowerCase();
        if (labelLower === 'first name' || labelLower.includes('first name')) {
          displayKey = 'firstName';
          mappingKey = 'name'; // Use 'name' as the actual mapping key
        } else if (labelLower === 'last name' || labelLower.includes('last name')) {
          displayKey = 'lastName';
          mappingKey = 'custom'; // Use 'custom' as the actual mapping key
        }
      }
      
      // Use the mapping key for the actual metadata
      mappedFields[mappingKey] = {
        fieldId,
        value: fieldValue,
        label: fieldLabel,
        stableId: field.stableId || fieldId,
        displayKey: displayKey // Add a display key for UI purposes
      };
      
      console.log(`[LEAD SUBMISSION] Added ${mappingKey} to __mappedFields via explicit mapping: ${fieldValue}`);
      continue;
    }
    
    // Check field label for standard mappings
    if (fieldLabel) {
      const labelLower = fieldLabel.toLowerCase();
      
      // Check each standard mapping
      for (const [mappingKey, possibleNames] of Object.entries(standardFieldMappings)) {
        if (possibleNames.some(name => labelLower.includes(name.toLowerCase()))) {
          // Skip undefined mapping keys
          if (mappingKey === 'undefined') continue;
          
          mappedFields[mappingKey] = {
            fieldId,
            value: fieldValue,
            label: fieldLabel,
            stableId: field.stableId || fieldId
          };
          console.log(`[LEAD SUBMISSION] Added ${mappingKey} to __mappedFields via label match: ${fieldValue}`);
          break;
        }
      }
      
      // Special case for firstName and lastName
      if (labelLower === 'first name' || labelLower === 'firstname') {
        mappedFields['name'] = {
          fieldId,
          value: fieldValue,
          label: fieldLabel,
          stableId: field.stableId || fieldId,
          displayKey: 'firstName' // Add a display key for UI purposes
        };
        console.log(`[LEAD SUBMISSION] Added firstName (as name) to __mappedFields via exact label match: ${fieldValue}`);
      } else if (labelLower === 'last name' || labelLower === 'lastname') {
        mappedFields['custom'] = {
          fieldId,
          value: fieldValue,
          label: fieldLabel,
          stableId: field.stableId || fieldId,
          displayKey: 'lastName' // Add a display key for UI purposes
        };
        console.log(`[LEAD SUBMISSION] Added lastName (as custom) to __mappedFields via exact label match: ${fieldValue}`);
      }
    }
    
    // Check field ID for standard mappings
    const idLower = fieldId.toLowerCase();
    for (const [mappingKey, possibleNames] of Object.entries(standardFieldMappings)) {
      if (possibleNames.some(name => idLower.includes(name.toLowerCase()))) {
        // Only add if not already added via label
        if (!mappedFields[mappingKey]) {
          mappedFields[mappingKey] = {
            fieldId,
            value: fieldValue,
            label: fieldLabel,
            stableId: field.stableId || fieldId
          };
          console.log(`[LEAD SUBMISSION] Added ${mappingKey} to __mappedFields via id match: ${fieldValue}`);
        }
        break;
      }
    }
  }
  
  // Second pass: Look for values that match patterns (email, phone, etc.)
  for (const field of allFields) {
    if (!field.id) continue;
    
    // Skip if no value in form data
    if (formData[field.id] === undefined || formData[field.id] === null || formData[field.id] === '') continue;
    
    const fieldId = field.id;
    const fieldValue = formData[fieldId];
    const fieldLabel = field.label || '';
    
    // Skip if this field is already mapped
    if (Object.values(mappedFields).some(m => m.fieldId === fieldId)) continue;
    
    // Check for email pattern
    if (typeof fieldValue === 'string' && fieldValue.includes('@') && !mappedFields['email']) {
      mappedFields['email'] = {
        fieldId,
        value: fieldValue,
        label: fieldLabel,
        stableId: field.stableId || fieldId
      };
      console.log(`[LEAD SUBMISSION] Added email to __mappedFields via pattern match: ${fieldValue}`);
    }
  }
  
  return mappedFields;
}

/**
 * Creates section information metadata for form submissions
 * 
 * @param formSections Array of form sections
 * @returns The __sectionInfo metadata array
 */
export function createSectionInfoMetadata(formSections: any[]): any[] {
  return formSections.map(section => ({
    id: section.id,
    fieldIds: typeof section.fields === 'string' 
      ? JSON.parse(section.fields).map((f: any) => f.id)
      : (Array.isArray(section.fields) ? section.fields.map((f: any) => f.id) : [])
  }));
}

/**
 * Creates the final submission data structure with all required metadata
 * 
 * @param formData The raw form data
 * @param processedData The processed data with name, email, phone, etc.
 * @param mappedFields The __mappedFields metadata
 * @param sectionInfo The __sectionInfo metadata
 * @returns The final submission data structure
 */
export function createFinalSubmissionData(
  formData: Record<string, any>,
  processedData: Record<string, any>,
  mappedFields: Record<string, any>,
  sectionInfo: any[]
): Record<string, any> {
  // Create the final metadata structure
  const finalData: Record<string, any> = {};
  
  // Add the original form data
  Object.entries(formData).forEach(([key, value]) => {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      finalData[key] = value;
    }
  });
  
  // Add the __mappedFields structure
  finalData.__mappedFields = mappedFields;
  
  // Add section information
  finalData.__sectionInfo = sectionInfo;
  
  // Add the processed name, email, phone fields at the root level
  finalData.firstName = processedData.firstName;
  finalData.name = processedData.name || 
    (processedData.firstName && processedData.lastName ? 
      `${processedData.firstName} ${processedData.lastName}` : 
      (processedData.firstName || processedData.lastName || ''));
  finalData.lastName = processedData.lastName;
  finalData.phone = processedData.phone;
  finalData.email = processedData.email;
  
  return finalData;
}
