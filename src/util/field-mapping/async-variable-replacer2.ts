/**
 * Asynchronous Variable Replacement for Email Templates
 * 
 * This module provides optimized variable replacement for email templates using
 * asynchronous processing and batching to improve performance for complex templates.
 */

import { logMessage } from './core-mapper';
import { findFieldValueByStableId } from './field-utilities';
import { EMAIL_TIMEOUTS } from '@/lib/forms2/services/email-processing/emailConfig2';

/**
 * Variable replacement with timeout and batch processing
 * 
 * @param template The template containing variables in the format {{variableName}}
 * @param formId The ID of the form
 * @param formData The form data containing field values
 * @returns The template with variables replaced
 */
export async function replaceVariablesAsync(
  template: string, 
  formId: string, 
  formData: Record<string, any>
): Promise<string> {
  try {
    const startTime = Date.now();
    logMessage(`Starting asynchronous variable replacement for form ${formId}`, 'info', 'forms');
    
    // If template is empty, return it as is
    if (!template) {
      return template;
    }
    
    // Find all variables in the template
    const variableRegex = /{{\s*([^{}]+?)\s*}}/g;
    let result = template;
    let match;
    
    // Extract all variables from the template
    const variables: string[] = [];
    while ((match = variableRegex.exec(template)) !== null) {
      variables.push(match[1]);
    }
    
    logMessage(`Found ${variables.length} variables in template: ${variables.join(', ')}`, 'info', 'forms');
    
    // Create a map of displayKeys to values from __mappedFields for quick lookup
    const displayKeyMap: Record<string, any> = {};
    if (formData.__mappedFields) {
      Object.values(formData.__mappedFields).forEach((field: any) => {
        if (field.displayKey) {
          displayKeyMap[field.displayKey.toLowerCase()] = field.value;
          logMessage(`Mapped displayKey ${field.displayKey} to value: ${field.value}`, 'info', 'forms');
        }
      });
    }
    
    // Process variables in parallel batches for better performance
    const BATCH_SIZE = 5; // Process 5 variables at a time
    const replacements: Record<string, string> = {};
    
    // Process variables in batches
    for (let i = 0; i < variables.length; i += BATCH_SIZE) {
      const batchVariables = variables.slice(i, i + BATCH_SIZE);
      logMessage(`Processing batch of ${batchVariables.length} variables`, 'info', 'forms');
      
      // Set up a timeout for the entire batch
      const batchTimeout = Math.min(
        EMAIL_TIMEOUTS.VARIABLE_REPLACEMENT * batchVariables.length,
        EMAIL_TIMEOUTS.MAX_VARIABLE_REPLACEMENT
      );
      
      try {
        // Process the batch with a timeout
        const batchResults = await Promise.race([
          processBatch(batchVariables, formId, formData, displayKeyMap),
          createTimeout(batchTimeout, `Variable replacement batch timed out after ${batchTimeout}ms`)
        ]);
        
        // Add batch results to the replacements map
        Object.assign(replacements, batchResults);
      } catch (batchError) {
        logMessage(`Error processing variable batch: ${batchError instanceof Error ? batchError.message : 'Unknown error'}`, 'error', 'forms');
        // Continue with the next batch even if this one failed
      }
    }
    
    // Apply all replacements to the template
    for (const variable of variables) {
      const value = replacements[variable] ?? '';
      const regex = new RegExp(`{{\s*${variable}\s*}}`, 'g');
      result = result.replace(regex, value);
    }
    
    const endTime = Date.now();
    logMessage(`Asynchronous variable replacement completed in ${endTime - startTime}ms`, 'info', 'forms');
    
    return result;
  } catch (error) {
    logMessage(`Error in asynchronous variable replacement: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'forms');
    return template; // Return original template if replacement fails
  }
}

/**
 * Process a batch of variables asynchronously
 * 
 * @param variables Array of variable names to process
 * @param formId The form ID
 * @param formData The form data
 * @param displayKeyMap Map of display keys to values
 * @returns Map of variable names to their replacement values
 */
async function processBatch(
  variables: string[],
  formId: string,
  formData: Record<string, any>,
  displayKeyMap: Record<string, any>
): Promise<Record<string, string>> {
  // Process each variable in the batch concurrently
  const batchPromises = variables.map(variable => 
    processVariable(variable, formId, formData, displayKeyMap)
  );
  
  // Wait for all variables in the batch to be processed
  const batchResults = await Promise.all(batchPromises);
  
  // Convert results to a map of variable names to values
  const replacements: Record<string, string> = {};
  variables.forEach((variable, index) => {
    replacements[variable] = batchResults[index];
  });
  
  return replacements;
}

/**
 * Process a single variable
 * 
 * @param variable The variable name
 * @param formId The form ID
 * @param formData The form data
 * @param displayKeyMap Map of display keys to values
 * @returns The replacement value for the variable
 */
async function processVariable(
  variable: string,
  formId: string,
  formData: Record<string, any>,
  displayKeyMap: Record<string, any>
): Promise<string> {
  try {
    const variableLookupStartTime = Date.now();
    let value;
    
    // Special case for timeStamp variable - use numeric timestamp
    if (variable.toLowerCase() === 'timestamp' || variable.toLowerCase() === 'time_stamp') {
      const timestamp = Date.now().toString();
      logMessage(`Replaced variable {{${variable}}} with numeric timestamp: ${timestamp}`, 'info', 'forms');
      return timestamp;
    }
    
    // Special case for leadId variable
    if (variable.toLowerCase() === 'leadid') {
      // Try to find leadId in formData - first check for actual leadId fields
      let leadId = formData.leadId || formData.lead_id;
      
      // If not found, check submission-related fields
      if (!leadId) {
        leadId = formData.id || formData.submissionId;
      }
      
      // If no leadId found and trackingToken exists, extract leadId from trackingToken
      // This is the most reliable source since it's updated after lead creation
      if (!leadId && formData.trackingToken) {
        // Token format could be either leadId-timestamp or leadId_timestamp
        let parts;
        if (formData.trackingToken.includes('_')) {
          parts = formData.trackingToken.split('_');
          if (parts.length >= 2) {
            // The lead ID is everything before the underscore
            const extractedId = parts[0];
            
            // Only use the extracted ID if it looks like a real ID (not a temporary one)
            if (!extractedId.startsWith('submission-')) {
              leadId = extractedId;
              logMessage(`Using leadId from trackingToken (underscore format): ${leadId}`, 'info', 'forms');
            }
          }
        } else if (formData.trackingToken.includes('-')) {
          parts = formData.trackingToken.split('-');
          if (parts.length >= 2) {
            // The lead ID is everything before the last dash
            const extractedId = parts.slice(0, -1).join('-');
            
            // Only use the extracted ID if it looks like a real ID (not a temporary one)
            if (!extractedId.startsWith('submission-')) {
              leadId = extractedId;
              logMessage(`Using leadId from trackingToken (dash format): ${leadId}`, 'info', 'forms');
            }
          }
        }
      }
      
      // Fallback to a distinct value if still no leadId
      if (!leadId) {
        // Use a prefix to distinguish from timestamp
        leadId = `lead-${formId.substring(0, 8)}-${Math.floor(Math.random() * 10000)}`;
        logMessage(`Generated fallback leadId: ${leadId}`, 'info', 'forms');
      } else {
        logMessage(`Using existing leadId: ${leadId}`, 'info', 'forms');
      }
      
      logMessage(`Replaced variable {{${variable}}} with lead ID: ${leadId}`, 'info', 'forms');
      return leadId;
    }
    
    // Special case for trackingToken variable
    if (variable.toLowerCase() === 'trackingtoken') {
      // Use existing trackingToken if available - this is the most reliable source
      let trackingToken = formData.trackingToken;
      
      if (trackingToken) {
        // If the tracking token uses dashes, keep it as is since we want to maintain the format
        // We're now consistently using the underscore format between ID and timestamp
        // but we don't need to convert existing tokens
      } else {
        // No trackingToken found, need to generate one
        
        // First try to get a leadId from the form data
        let leadId = formData.leadId || formData.lead_id;
        if (!leadId) {
          leadId = formData.id || formData.submissionId;
        }
        
        // If still no leadId, generate a distinct one
        if (!leadId) {
          const formIdPart = formId.substring(0, 8);
          const randomPart = Math.floor(Math.random() * 10000);
          leadId = `lead-${formIdPart}-${randomPart}`;
          logMessage(`Generated distinct leadId for trackingToken: ${leadId}`, 'info', 'forms');
        }
        
        const timestamp = Date.now().toString();
        trackingToken = `${leadId}-${timestamp}`;
        logMessage(`Generated new trackingToken: ${trackingToken}`, 'info', 'forms');
      }
      
      logMessage(`Replaced variable {{${variable}}} with tracking token: ${trackingToken}`, 'info', 'forms');
      return trackingToken;
    }
    
    // First try to get the value from the displayKey map
    if (displayKeyMap[variable.toLowerCase()] !== undefined) {
      value = displayKeyMap[variable.toLowerCase()];
      logMessage(`Found value for variable ${variable} in __mappedFields displayKey map: ${value}`, 'info', 'forms');
    } else {
      // If not found in displayKey map, try the regular field lookup
      value = await findFieldValueByStableId(formId, variable, formData);
    }
    
    const variableLookupTime = Date.now() - variableLookupStartTime;
    
    // Return the value if found, or empty string if not found
    if (value !== undefined && value !== null) {
      logMessage(`Processed variable {{${variable}}} with value: ${value} (lookup took ${variableLookupTime}ms)`, 'info', 'forms');
      return String(value);
    } else {
      logMessage(`No value found for variable {{${variable}}}, using empty string (lookup took ${variableLookupTime}ms)`, 'info', 'forms');
      return '';
    }
  } catch (error) {
    logMessage(`Error processing variable ${variable}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'forms');
    return ''; // Return empty string if variable processing fails
  }
}

/**
 * Create a promise that rejects after a timeout
 * 
 * @param ms Timeout in milliseconds
 * @param message Error message
 * @returns A promise that rejects after the specified timeout
 */
function createTimeout<T>(ms: number, message: string): Promise<T> {
  return new Promise<T>((_, reject) => {
    setTimeout(() => {
      reject(new Error(message));
    }, ms);
  });
}
