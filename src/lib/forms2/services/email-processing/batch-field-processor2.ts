/**
 * Batch Field Processing for Email Rules
 * 
 * This module provides optimized field value lookup for email rule processing,
 * supporting batch operations and caching for better performance.
 */

import prisma from '@/lib/prisma';
import { addApiLog } from '@/pages/api/debug/logs';
import { EMAIL_TIMEOUTS } from './emailConfig2';

// Cache for form field definitions to avoid repeated database queries
const formFieldCache: Record<string, any[]> = {};

// Cache for field ID mappings (stableId -> fieldId)
const fieldIdMappingCache: Record<string, Record<string, string>> = {};

// Global cache for field values to avoid redundant lookups
// Structure: { formId: { stableId: fieldValue } }
const fieldValueCache: Record<string, Record<string, any>> = {};

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

// Cache timestamps to implement TTL
const cacheTimestamps: Record<string, number> = {};

/**
 * Find a field value in form data based on a stable identifier with batch optimization
 * 
 * @param formId The ID of the form
 * @param stableId The stable identifier to look for
 * @param formData The form submission data
 * @returns The field value if found, or undefined if not found
 */
export async function findFieldValueByStableIdBatch(
  formId: string, 
  stableId: string, 
  formData: Record<string, any>
): Promise<any> {
  try {
    // Check if we have a cached value for this field
    if (fieldValueCache[formId] && fieldValueCache[formId][stableId]) {
      const cacheKey = `${formId}_${stableId}`;
      const cacheTime = cacheTimestamps[cacheKey] || 0;
      
      // Check if the cache is still valid (within TTL)
      if (Date.now() - cacheTime < CACHE_TTL) {
        addApiLog(`Using cached value for field ${stableId} in form ${formId}`, 'info', 'emails');
        return fieldValueCache[formId][stableId];
      }
    }
    
    addApiLog(`Looking for field value with stable ID: ${stableId} in form ${formId}`, 'info', 'emails');
    
    // Special case for timestamp variable - use numeric timestamp
    if (stableId.toLowerCase() === 'timestamp' || stableId.toLowerCase() === 'time_stamp') {
      const value = Date.now().toString();
      cacheFieldValue(formId, stableId, value);
      return value;
    }
    
    // Special case for leadId variable
    if (stableId.toLowerCase() === 'leadid') {
      // Try to find leadId in formData
      let leadId = formData.id || formData.leadId || formData.lead_id || formData.submissionId;
      
      // If no leadId found and trackingToken exists, extract leadId from trackingToken
      if (!leadId && formData.trackingToken) {
        // Token format: leadId-timestamp
        const parts = formData.trackingToken.split('-');
        if (parts.length >= 2) {
          // The lead ID is everything before the last dash
          leadId = parts.slice(0, -1).join('-');
        }
      }
      
      if (leadId) {
        addApiLog(`Found leadId: ${leadId}`, 'info', 'emails');
        cacheFieldValue(formId, stableId, leadId);
        return leadId;
      }
    }
    
    // Special case for trackingToken variable
    if (stableId.toLowerCase() === 'trackingtoken') {
      // Use existing trackingToken or generate one with leadId-timestamp format
      let trackingToken = formData.trackingToken;
      
      if (!trackingToken) {
        // Get or generate a leadId that's different from the timestamp
        let leadId = formData.id || formData.leadId || formData.lead_id || formData.submissionId;
        
        // If no leadId found, generate a distinct one
        if (!leadId) {
          leadId = `lead-${formId.substring(0, 8)}-${Math.floor(Math.random() * 10000)}`;
        }
        
        const timestamp = Date.now().toString();
        trackingToken = `${leadId}-${timestamp}`;
      }
      
      return trackingToken;
    }
    
    // Check if there's a __mappedFields structure which contains properly mapped values
    if (formData.__mappedFields) {
      // Look for a field with a matching displayKey
      const mappedFields = Object.values(formData.__mappedFields);
      
      for (const field of mappedFields) {
        // Safely check if the field has a displayKey property and if it matches
        if (field && typeof field === 'object' && 'displayKey' in field && 'value' in field) {
          const displayKey = field.displayKey;
          if (typeof displayKey === 'string' && displayKey.toLowerCase() === stableId.toLowerCase()) {
            addApiLog(`Found field in __mappedFields with displayKey ${stableId}`, 'info', 'emails');
            return field.value;
          }
        }
      }
    }
    
    // First check if the stable ID exists directly in the form data
    if (formData[stableId] !== undefined) {
      addApiLog(`Found direct match for stable ID ${stableId} in form data`, 'info', 'emails');
      return formData[stableId];
    }
    
    // Get form fields from cache or database
    let allFields = formFieldCache[formId];
    let fieldIdMapping = fieldIdMappingCache[formId];
    
    if (!allFields || !fieldIdMapping) {
      // Fetch form fields from database
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
        addApiLog(`Form not found with ID: ${formId}`, 'error', 'emails');
        return undefined;
      }
      
      // Extract fields from form
      allFields = extractFieldsFromForm(form);
      
      // Create mapping between stableId and fieldId
      fieldIdMapping = {};
      allFields.forEach(field => {
        if (field.stableId) {
          fieldIdMapping[field.stableId] = field.id;
          addApiLog(`Mapped stableId ${field.stableId} to fieldId ${field.id}`, 'info', 'emails');
        }
      });
      
      // Cache the fields and mapping for future lookups
      formFieldCache[formId] = allFields;
      fieldIdMappingCache[formId] = fieldIdMapping;
      
      addApiLog(`Cached ${allFields.length} fields for form ${formId}`, 'info', 'emails');
    }
    
    // Check if the stableId exists in the mapping
    if (fieldIdMapping[stableId]) {
      const fieldId = fieldIdMapping[stableId];
      addApiLog(`Found field ID ${fieldId} for stable ID ${stableId}`, 'info', 'emails');
      
      // Check if the field ID exists in the form data
      if (formData[fieldId] !== undefined) {
        addApiLog(`Found value for field ID ${fieldId} with stable ID ${stableId}: ${formData[fieldId]}`, 'info', 'emails');
        return formData[fieldId];
      }
    }
    
    // Find a field with a matching stableId
    const fieldWithStableId = allFields.find(field => field.stableId === stableId);
    if (fieldWithStableId) {
      // Check if the field ID exists in the form data
      if (formData[fieldWithStableId.id] !== undefined) {
        return formData[fieldWithStableId.id];
      }
    }
    
    // Find a field with a matching mapping
    const fieldWithMapping = allFields.find(field => field.mapping === stableId);
    if (fieldWithMapping && formData[fieldWithMapping.id] !== undefined) {
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
      const camelCaseLabel = convertToCamelCase(field.label);
      return camelCaseLabel === stableId;
    });
    
    if (fieldWithMatchingLabel && formData[fieldWithMatchingLabel.id] !== undefined) {
      return formData[fieldWithMatchingLabel.id];
    }
    
    // Check for common field name patterns
    if (stableId.toLowerCase() === 'firstname' || stableId.toLowerCase() === 'first_name' || stableId.toLowerCase() === 'fname') {
      // Check for common first name field patterns
      const firstNameKeys = ['first_name', 'firstname', 'fname', 'first-name', 'givenName'];
      for (const key of firstNameKeys) {
        if (formData[key] !== undefined) {
          return formData[key];
        }
      }
    }
    
    if (stableId.toLowerCase() === 'lastname' || stableId.toLowerCase() === 'last_name' || stableId.toLowerCase() === 'lname') {
      // Check for common last name field patterns
      const lastNameKeys = ['last_name', 'lastname', 'lname', 'last-name', 'familyName', 'surname'];
      for (const key of lastNameKeys) {
        if (formData[key] !== undefined) {
          return formData[key];
        }
      }
    }
    
    if (stableId.toLowerCase() === 'email' || stableId.toLowerCase() === 'emailaddress' || stableId.toLowerCase() === 'email_address') {
      // Check for common email field patterns
      const emailKeys = ['email', 'emailAddress', 'email_address', 'email-address'];
      for (const key of emailKeys) {
        if (formData[key] !== undefined) {
          return formData[key];
        }
      }
    }
    
    // If all else fails, look for any field that contains the stableId in its ID or name
    for (const key in formData) {
      if (key.toLowerCase().includes(stableId.toLowerCase())) {
        return formData[key];
      }
    }
    
    // No match found
    addApiLog(`No value found for stable ID ${stableId} in form ${formId}`, 'info', 'emails');
    
    // Cache the null result to avoid repeated lookups
    if (!fieldValueCache[formId]) {
      fieldValueCache[formId] = {};
    }
    fieldValueCache[formId][stableId] = undefined;
    cacheTimestamps[`${formId}_${stableId}`] = Date.now();
    
    return undefined;
  } catch (error) {
    addApiLog(`Error finding field value: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'emails');
    return undefined;
  }
}

/**
 * Extract fields from a form definition
 * 
 * @param form The form object from the database
 * @returns Array of field objects
 */
function extractFieldsFromForm(form: any): any[] {
  const allFields: any[] = [];
  
  // Add fields from the top level
  if (form.fields && Array.isArray(form.fields)) {
    allFields.push(...form.fields);
  }
  
  // Add fields from sections
  if (form.sections && Array.isArray(form.sections)) {
    form.sections.forEach((section: any) => {
      if (section.fields && Array.isArray(section.fields)) {
        allFields.push(...section.fields);
      }
    });
  }
  
  return allFields;
}

/**
 * Convert a string to camelCase
 * 
 * @param str The string to convert
 * @returns The camelCase version of the string
 */
function convertToCamelCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+(.)/g, (_, char) => char.toUpperCase());
}

/**
 * Store a field value in the cache
 * 
 * @param formId The form ID
 * @param stableId The stable ID of the field
 * @param value The field value to cache
 */
function cacheFieldValue(formId: string, stableId: string, value: any): void {
  if (!fieldValueCache[formId]) {
    fieldValueCache[formId] = {};
  }
  fieldValueCache[formId][stableId] = value;
  cacheTimestamps[`${formId}_${stableId}`] = Date.now();
}

/**
 * Batch process multiple field values at once
 * 
 * @param formId The ID of the form
 * @param stableIds Array of stable identifiers to look for
 * @param formData The form submission data
 * @returns Map of stable IDs to their values
 */
export async function batchProcessFieldValues(
  formId: string,
  stableIds: string[],
  formData: Record<string, any>
): Promise<Record<string, any>> {
  // Pre-fetch form fields to populate cache (only done once)
  if (!formFieldCache[formId] || !fieldIdMappingCache[formId]) {
    try {
      const form = await prisma.form.findUnique({
        where: { id: formId },
        select: {
          id: true,
          name: true,
          fields: true,
          sections: true
        }
      });
      
      if (form) {
        // Extract fields from form
        const allFields = extractFieldsFromForm(form);
        formFieldCache[formId] = allFields;
        
        // Create mapping between stableId and fieldId
        const fieldIdMapping: Record<string, string> = {};
        allFields.forEach(field => {
          if (field.stableId) {
            fieldIdMapping[field.stableId] = field.id;
            addApiLog(`Pre-cached mapping: stableId ${field.stableId} -> fieldId ${field.id}`, 'info', 'emails');
          }
        });
        
        fieldIdMappingCache[formId] = fieldIdMapping;
        addApiLog(`Pre-cached ${allFields.length} fields for form ${formId}`, 'info', 'emails');
      }
    } catch (error) {
      addApiLog(`Error pre-caching form fields: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'emails');
    }
  }
  
  // Process all stable IDs in parallel
  const results: Record<string, any> = {};
  const promises = stableIds.map(async (stableId) => {
    const value = await findFieldValueByStableIdBatch(formId, stableId, formData);
    return { stableId, value };
  });
  
  // Wait for all lookups to complete
  const fieldValues = await Promise.all(promises);
  
  // Convert array of results to a map
  fieldValues.forEach(({ stableId, value }) => {
    results[stableId] = value;
  });
  
  return results;
}

/**
 * Clear the form field cache for a specific form or all forms
 * 
 * @param formId Optional form ID to clear cache for
 */
export function clearFieldCache(formId?: string): void {
  if (formId) {
    delete formFieldCache[formId];
    addApiLog(`Cleared field cache for form ${formId}`, 'info', 'emails');
  } else {
    Object.keys(formFieldCache).forEach(key => {
      delete formFieldCache[key];
    });
    addApiLog('Cleared all form field caches', 'info', 'emails');
  }
}
