/**
 * Booking Helpers
 * 
 * Helper functions for booking form submissions
 */

import * as logger from '@/util/logger';
import { FieldConfig } from '@/lib/forms2/core/types';
import { StandardMappedFields } from '../../mapping/types';

/**
 * Process booking data from StandardMappedFields to Record<string, any>
 * This is a wrapper to safely convert StandardMappedFields to Record<string, any>
 * 
 * @param mappedData The mapped form data
 * @param formData The raw form data
 * @returns Processed booking data as Record<string, any>
 */
export function processBookingData(
  mappedData: StandardMappedFields,
  formData: Record<string, any>
): Record<string, any> {
  // Create a new object to hold the processed data
  const result: Record<string, any> = {};
  
  // Copy all properties from mappedData
  Object.entries(mappedData).forEach(([key, value]) => {
    result[key] = value;
  });
  
  // Process name fields to ensure we have a valid full name
  processNameFields(result, formData);
  
  // Process date and time fields
  processDateTimeFields(result, formData);
  
  return result;
}

/**
 * Process name fields to ensure we have a valid full name for booking
 * 
 * @param processedData The processed data object
 * @param formData The raw form data
 */
function processNameFields(processedData: Record<string, any>, formData: Record<string, any>): void {
  console.log(`[BOOKING SUBMISSION] [NAME PROCESSING] Processing name fields`);
  
  // Extract name fields
  let firstName = processedData.first_name || processedData.firstName || null;
  let lastName = processedData.last_name || processedData.lastName || null;
  let fullName = processedData.name || null;
  
  // Check for explicit first_name and last_name fields in the form data
  for (const key of Object.keys(formData)) {
    const keyLower = key.toLowerCase();
    const fieldValue = formData[key];
    
    // Skip empty values
    if (!fieldValue || typeof fieldValue !== 'string') continue;
    
    // Look for first name fields
    if (keyLower.includes('first_name') || keyLower.includes('firstname')) {
      firstName = fieldValue;
      console.log(`[BOOKING SUBMISSION] [NAME PROCESSING] Found firstName in field ${key}: "${firstName}"`);
    }
    
    // Look for last name fields
    if (keyLower.includes('last_name') || keyLower.includes('lastname')) {
      lastName = fieldValue;
      console.log(`[BOOKING SUBMISSION] [NAME PROCESSING] Found lastName in field ${key}: "${lastName}"`);
    }
  }
  
  console.log(`[BOOKING SUBMISSION] [NAME PROCESSING] Initial values: name="${fullName || 'undefined'}", firstName="${firstName || 'undefined'}", lastName="${lastName || 'undefined'}"`); 
  
  // If we have first and last name, combine them into a full name
  if (firstName && lastName) {
    fullName = `${firstName} ${lastName}`;
    console.log(`[BOOKING SUBMISSION] [NAME PROCESSING] Combined firstName and lastName into name: "${fullName}"`);
  }
  
  // If we have a fullName but it doesn't contain a space, try to extract first/last name
  if (fullName && !fullName.includes(' ')) {
    // If we have a first name but no last name, use the fullName as the last name
    if (firstName && !lastName) {
      lastName = fullName;
      fullName = `${firstName} ${lastName}`;
      console.log(`[BOOKING SUBMISSION] [NAME PROCESSING] Combined existing firstName with fullName as lastName: "${fullName}"`);
    }
    // If we have a last name but no first name, use the fullName as the first name
    else if (!firstName && lastName) {
      firstName = fullName;
      fullName = `${firstName} ${lastName}`;
      console.log(`[BOOKING SUBMISSION] [NAME PROCESSING] Combined fullName as firstName with existing lastName: "${fullName}"`);
    }
    // If we have neither first nor last name, try to find another field to use as the last name
    else if (!firstName && !lastName) {
      // Look for any other name-like field
      for (const key of Object.keys(formData)) {
        if (key !== fullName && formData[key] && typeof formData[key] === 'string' && 
            (key.toLowerCase().includes('name') || formData[key].length > 2)) {
          lastName = formData[key];
          firstName = fullName;
          fullName = `${firstName} ${lastName}`;
          console.log(`[BOOKING SUBMISSION] [NAME PROCESSING] Created full name using another field: "${fullName}"`);
          break;
        }
      }
      
      // If we still don't have a valid full name, use a placeholder
      if (!fullName.includes(' ')) {
        fullName = `${fullName} Booking`;
        console.log(`[BOOKING SUBMISSION] [NAME PROCESSING] Added placeholder last name: "${fullName}"`);
      }
    }
  }
  
  // Update the processed data with our name fields
  processedData.name = fullName;
  processedData.first_name = firstName;
  processedData.last_name = lastName;
  
  console.log(`[BOOKING SUBMISSION] [NAME PROCESSING] Final name: "${processedData.name}"`);
}

/**
 * Process date and time fields for booking
 * 
 * @param processedData The processed data object
 * @param formData The raw form data
 */
function processDateTimeFields(processedData: Record<string, any>, formData: Record<string, any>): void {
  console.log(`[BOOKING SUBMISSION] [DATETIME PROCESSING] Processing date and time fields`);
  
  // If we have a datetime field but no date field, extract the date
  if (processedData.datetime && !processedData.date) {
    try {
      const dateObj = new Date(processedData.datetime);
      processedData.date = dateObj.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      console.log(`[BOOKING SUBMISSION] [DATETIME PROCESSING] Extracted date from datetime: ${processedData.date}`);
      
      // Extract time if not already set
      if (!processedData.time) {
        const hours = dateObj.getHours();
        const minutes = dateObj.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const formattedHours = hours % 12 || 12;
        const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
        processedData.time = `${formattedHours}:${formattedMinutes} ${ampm}`;
        console.log(`[BOOKING SUBMISSION] [DATETIME PROCESSING] Extracted time from datetime: ${processedData.time}`);
      }
    } catch (error) {
      console.error(`[BOOKING SUBMISSION] [DATETIME PROCESSING] Error extracting date from datetime:`, error);
    }
  }
  
  // If we still don't have a date, look for date-like fields in the form data
  if (!processedData.date) {
    for (const key of Object.keys(formData)) {
      const value = formData[key];
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
        processedData.date = value;
        console.log(`[BOOKING SUBMISSION] [DATETIME PROCESSING] Found date in field ${key}: ${processedData.date}`);
        break;
      }
    }
  }
  
  // If we still don't have a date, use today's date
  if (!processedData.date) {
    const today = new Date();
    processedData.date = today.toISOString().split('T')[0];
    console.log(`[BOOKING SUBMISSION] [DATETIME PROCESSING] Using today's date as fallback: ${processedData.date}`);
  }
}

/**
 * Creates the __mappedFields metadata structure for booking form submissions
 * 
 * @param formData The raw form data
 * @param allFields Array of field configurations from the form
 * @returns The __mappedFields metadata object
 */
export function createBookingMappedFieldsMetadata(
  formData: Record<string, any>,
  allFields: FieldConfig[]
): Record<string, any> {
  console.log(`[BOOKING SUBMISSION] Creating __mappedFields metadata structure`);
  
  // Create an empty __mappedFields object to store the metadata
  const mappedFields: Record<string, any> = {};
  
  // Process standard fields (firstName, lastName, email, phone, date, time, location, etc.)
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
  
  // Process fields
  for (const field of allFields) {
    if (!field.id) continue;
    
    // Skip if no value in form data
    if (formData[field.id] === undefined || formData[field.id] === null || formData[field.id] === '') continue;
    
    const fieldId = field.id;
    const fieldValue = formData[fieldId];
    const fieldLabel = field.label || '';
    
    // Check field label for standard mappings
    if (fieldLabel) {
      const labelLower = fieldLabel.toLowerCase();
      
      // Check each standard mapping
      for (const [mappingKey, possibleNames] of Object.entries(standardFieldMappings)) {
        if (possibleNames.some(name => labelLower.includes(name.toLowerCase()))) {
          mappedFields[mappingKey] = {
            fieldId,
            value: fieldValue,
            label: fieldLabel,
            stableId: field.stableId || fieldId
          };
          console.log(`[BOOKING SUBMISSION] Added ${mappingKey} to __mappedFields via label match: ${fieldValue}`);
          break;
        }
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
          console.log(`[BOOKING SUBMISSION] Added ${mappingKey} to __mappedFields via id match: ${fieldValue}`);
        }
        break;
      }
    }
  }
  
  return mappedFields;
}

/**
 * Creates section information metadata for booking form submissions
 * 
 * @param formSections Array of form sections
 * @returns The __sectionInfo metadata object
 */
export function createBookingSectionInfoMetadata(formSections: any[]): Record<string, any> {
  // Create a section info object where keys are section IDs
  const sectionInfo: Record<string, any> = {};
  
  formSections.forEach(section => {
    // Get fields array
    const fields = typeof section.fields === 'string' 
      ? JSON.parse(section.fields)
      : (Array.isArray(section.fields) ? section.fields : []);
    
    // Get field IDs and metadata
    const fieldIds = fields.map((f: any) => f.id);
    
    // Create field metadata for easier display
    const fieldMetadata: Record<string, any> = {};
    fields.forEach((field: any) => {
      // Store field metadata
      fieldMetadata[field.id] = {
        label: field.label || field.placeholder || field.name || field.id,
        type: field.type || 'text',
        required: field.required || false
      };
    });
    
    // Create section info entry
    sectionInfo[section.id] = {
      title: section.title || 'Section',
      order: section.order || 0,
      fields: fieldIds,
      fieldMetadata: fieldMetadata
    };
    
    console.log(`[BOOKING SUBMISSION] Added section to __sectionInfo: ${section.title || 'Section'} with ${fieldIds.length} fields`);
  });
  
  return sectionInfo;
}

/**
 * Creates the final submission data structure with all required metadata for booking forms
 * 
 * @param formData The raw form data
 * @param processedData The processed data with name, email, phone, etc.
 * @param mappedFields The __mappedFields metadata
 * @param sectionInfo The __sectionInfo metadata
 * @returns The final submission data structure
 */
export function createBookingFinalSubmissionData(
  formData: Record<string, any>,
  processedData: Record<string, any>,
  mappedFields: Record<string, any>,
  sectionInfo: Record<string, any>
): Record<string, any> {
  // Create the final metadata structure
  const finalData: Record<string, any> = {};
  
  // Add the original form data
  Object.entries(formData).forEach(([key, value]) => {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      finalData[key] = value;
    }
  });
  
  // Add field metadata for each field
  Object.entries(formData).forEach(([key, value]) => {
    // Skip empty values and metadata fields
    if (value === null || value === undefined || value === '' || key.startsWith('_')) {
      return;
    }
    
    // Find the field label in the section info
    let fieldLabel = key;
    let fieldType = 'text';
    
    // Look through all sections for field metadata
    Object.values(sectionInfo).forEach((section: any) => {
      if (section.fieldMetadata && section.fieldMetadata[key]) {
        fieldLabel = section.fieldMetadata[key].label;
        fieldType = section.fieldMetadata[key].type;
      }
    });
    
    // Add field metadata
    finalData[`_meta_${key}`] = {
      label: fieldLabel,
      type: fieldType
    };
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
  
  // Add booking-specific fields
  finalData.date = processedData.date;
  finalData.time = processedData.time;
  finalData.location = processedData.location;
  finalData.location_office = processedData.location_office;
  
  return finalData;
}
