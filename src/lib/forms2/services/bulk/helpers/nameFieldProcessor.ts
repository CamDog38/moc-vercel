/**
 * Name Field Processor
 * 
 * Helper functions for processing name fields in form submissions
 */

import * as logger from '@/util/logger';

/**
 * Process name fields to ensure proper handling of first name, last name, and full name
 * 
 * @param processedData The mapped form data
 * @param formData The raw form data (for fallback extraction)
 * @returns Processed data with properly handled name fields
 */
export function processNameFields(processedData: Record<string, any>, formData: Record<string, any>): Record<string, any> {
  console.log(`[LEAD SUBMISSION] [NAME PROCESSING] Processing name fields`);
  
  // Make a copy of the processed data to avoid mutation issues
  const result = { ...processedData };
  
  // Extract name fields
  let firstName = result.firstName || result.first_name || null;
  let lastName = result.lastName || result.last_name || null;
  let fullName = result.name || null;
  
  // First check for explicit first_name and last_name fields in the mapped data
  // These often come from fields with explicit mappings in the form
  for (const key of Object.keys(formData)) {
    const keyLower = key.toLowerCase();
    const fieldValue = formData[key];
    
    // Skip empty values
    if (!fieldValue || typeof fieldValue !== 'string') continue;
    
    // Look for inquiry_form_first_name or similar patterns
    if (keyLower.includes('first_name') || keyLower.includes('firstname')) {
      firstName = fieldValue;
      console.log(`[LEAD SUBMISSION] [NAME PROCESSING] Found firstName in mapped field ${key}: "${firstName}"`);
    }
    
    // Look for inquiry_form_last_name or similar patterns
    if (keyLower.includes('last_name') || keyLower.includes('lastname')) {
      lastName = fieldValue;
      console.log(`[LEAD SUBMISSION] [NAME PROCESSING] Found lastName in mapped field ${key}: "${lastName}"`);
    }
  }
  
  console.log(`[LEAD SUBMISSION] [NAME PROCESSING] Initial values: name="${fullName || 'undefined'}", firstName="${firstName || 'undefined'}", lastName="${lastName || 'undefined'}"`);
  
  // Check if we have a name field but no first/last name
  if (fullName && (!firstName || !lastName)) {
    console.log(`[LEAD SUBMISSION] [NAME PROCESSING] Attempting to extract firstName and lastName from name: "${fullName}"`);
    
    // Try to extract first and last name from the full name
    if (typeof fullName === 'string' && fullName.includes(' ')) {
      const nameParts = fullName.split(' ');
      
      if (!firstName) {
        firstName = nameParts[0];
        console.log(`[LEAD SUBMISSION] [NAME PROCESSING] Extracted firstName from name: "${firstName}"`);
      }
      
      if (!lastName) {
        lastName = nameParts.slice(1).join(' ');
        console.log(`[LEAD SUBMISSION] [NAME PROCESSING] Extracted lastName from name: "${lastName}"`);
      }
    }
  }
  
  // Extract raw name field if available in __mappedFields
  if (result.__mappedFields?.name?.value) {
    const rawNameField = result.__mappedFields.name.value;
    console.log(`[LEAD SUBMISSION] [NAME PROCESSING] Found raw name field in __mappedFields: "${rawNameField}"`);
    
    // If we don't have firstName or lastName, try to extract them from the raw name
    if ((!firstName || !lastName) && typeof rawNameField === 'string' && rawNameField.includes(' ')) {
      const nameParts = rawNameField.split(' ');
      if (!firstName) {
        firstName = nameParts[0];
        console.log(`[LEAD SUBMISSION] [NAME PROCESSING] Extracted firstName from raw name: "${firstName}"`);
      }
      if (!lastName) {
        lastName = nameParts.slice(1).join(' ');
        console.log(`[LEAD SUBMISSION] [NAME PROCESSING] Extracted lastName from raw name: "${lastName}"`);
      }
    }
  }
  
  // Look for firstName and lastName in the raw form data
  if (!firstName) {
    // Look for fields with 'first' and 'name' in their key
    for (const key of Object.keys(formData)) {
      if ((key.includes('first') && key.includes('name')) || key === 'firstname') {
        firstName = formData[key];
        console.log(`[LEAD SUBMISSION] [NAME PROCESSING] Found firstName in field ${key}: "${firstName}"`);
        break;
      }
    }
  }
  
  if (!lastName) {
    // Look for fields with 'last' and 'name' in their key
    for (const key of Object.keys(formData)) {
      if ((key.includes('last') && key.includes('name')) || key === 'lastname') {
        lastName = formData[key];
        console.log(`[LEAD SUBMISSION] [NAME PROCESSING] Found lastName in field ${key}: "${lastName}"`);
        break;
      }
    }
  }
  
  // ALWAYS prioritize firstName + lastName combination if available
  if (firstName && lastName) {
    result.name = `${firstName} ${lastName}`;
    console.log(`[LEAD SUBMISSION] [NAME PROCESSING] Combined firstName and lastName into name: "${result.name}"`);
  } else if (firstName) {
    result.name = firstName;
    console.log(`[LEAD SUBMISSION] [NAME PROCESSING] Using firstName as name: "${result.name}"`);
  } else if (lastName) {
    result.name = lastName;
    console.log(`[LEAD SUBMISSION] [NAME PROCESSING] Using lastName as name: "${result.name}"`);
  }
  
  // Special handling for inquiry forms where we have explicit first_name and last_name fields
  // This is a final check to ensure we have the correct name
  if (formData.inquiry_form_first_name && formData.inquiry_form_last_name) {
    const inquiryFirstName = formData.inquiry_form_first_name;
    const inquiryLastName = formData.inquiry_form_last_name;
    
    if (typeof inquiryFirstName === 'string' && typeof inquiryLastName === 'string') {
      result.name = `${inquiryFirstName} ${inquiryLastName}`;
      result.firstName = inquiryFirstName;
      result.lastName = inquiryLastName;
      console.log(`[LEAD SUBMISSION] [NAME PROCESSING] Used inquiry form fields for name: "${result.name}"`);
    }
  }
  
  // One more check - look for first and last name in the form data directly by field label
  if ((!firstName || !lastName) && (!result.name || !result.name.includes(' '))) {
    for (const [key, value] of Object.entries(formData)) {
      if (!value || typeof value !== 'string') continue;
      
      // Look for fields with labels that might indicate first name or last name
      const keyLower = key.toLowerCase();
      if (keyLower.includes('first') && keyLower.includes('name') && !firstName) {
        firstName = value;
        console.log(`[LEAD SUBMISSION] [NAME PROCESSING] Found firstName by label in field ${key}: "${firstName}"`);
      } else if (keyLower.includes('last') && keyLower.includes('name') && !lastName) {
        lastName = value;
        console.log(`[LEAD SUBMISSION] [NAME PROCESSING] Found lastName by label in field ${key}: "${lastName}"`);
      }
    }
    
    // If we found both first and last name, combine them
    if (firstName && lastName && (!result.name || !result.name.includes(' '))) {
      result.name = `${firstName} ${lastName}`;
      console.log(`[LEAD SUBMISSION] [NAME PROCESSING] Updated name with newly found first and last name: "${result.name}"`);
    }
  }
  
  // Make sure firstName and lastName are explicitly set in the processed data
  if (firstName) {
    result.firstName = firstName;
    result.first_name = firstName; // Ensure both formats are set
  }
  if (lastName) {
    result.lastName = lastName;
    result.last_name = lastName; // Ensure both formats are set
  }
  
  // Ensure we have a name field if we have first and last name
  if (!result.name && (result.firstName || result.lastName)) {
    const nameParts = [];
    if (result.firstName) nameParts.push(result.firstName);
    if (result.lastName) nameParts.push(result.lastName);
    result.name = nameParts.join(' ');
    console.log(`[LEAD SUBMISSION] [NAME PROCESSING] Created name from parts: "${result.name}"`);
  }
  
  // Log the final name values
  console.log(`[LEAD SUBMISSION] [NAME PROCESSING] Final values: name="${result.name || 'undefined'}", firstName="${result.firstName || 'undefined'}", lastName="${result.lastName || 'undefined'}"`);
  
  return result;
}
