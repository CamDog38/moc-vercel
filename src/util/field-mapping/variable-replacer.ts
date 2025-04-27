/**
 * Variable replacement functionality for email templates
 * This provides robust variable replacement for email templates using field mappings
 *
*/

import { logMessage } from './core-mapper';
import { findFieldValueByStableId } from './field-utilities';
import { replaceVariablesAsync } from './async-variable-replacer2';

/**
 * Replaces variables in a template with values from form data
 * @param template The template containing variables in the format {{variableName}}
 * @param formId The ID of the form
 * @param formData The form data containing field values
 * @returns The template with variables replaced
 */
/**
 * Legacy synchronous variable replacement function
 * @deprecated Use replaceVariablesAsync instead for better performance
 */
export async function replaceVariablesSync(template: string, formId: string, formData: Record<string, any>): Promise<string> {
  try {
    const startTime = Date.now();
    logMessage(`Replacing variables in template for form ${formId}`, 'info', 'forms');
    
    // If template is empty, return it as is
    if (!template) {
      return template;
    }
    
    // Find all variables in the template
    const variableRegex = /{{\s*([^{}]+?)\s*}}/g;
    let result = template;
    let match;
    
    // Extract all variables from the template
    const variables = [];
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
    
    // Replace each variable with its value
    for (const variable of variables) {
      const variableLookupStartTime = Date.now();
      let value;
      
      // Special case for timeStamp variable - use numeric timestamp
      if (variable.toLowerCase() === 'timestamp' || variable.toLowerCase() === 'time_stamp') {
        const timestamp = Date.now().toString();
        const regex = new RegExp(`{{\s*${variable}\s*}}`, 'g');
        result = result.replace(regex, timestamp);
        logMessage(`Replaced variable {{${variable}}} with numeric timestamp: ${timestamp}`, 'info', 'forms');
        continue;
      }
      
      // Special case for leadId variable
      if (variable.toLowerCase() === 'leadid') {
        // Try to find leadId in formData
        let leadId = formData.id || formData.leadId || formData.lead_id || formData.submissionId;
        
        // If no leadId found and trackingToken exists, extract leadId from trackingToken
        if (!leadId && formData.trackingToken) {
          // Token format: leadId-timestamp
          const parts = formData.trackingToken.split('-');
          if (parts.length >= 2) {
            // The lead ID is everything before the last dash
            leadId = parts.slice(0, -1).join('-');
            logMessage(`Extracted leadId from trackingToken: ${leadId}`, 'info', 'forms');
          }
        }
        
        // Fallback to a distinct value if still no leadId
        if (!leadId) {
          // Use a prefix to distinguish from timestamp
          leadId = `lead-${formId.substring(0, 8)}-${Math.floor(Math.random() * 10000)}`;
          logMessage(`Generated fallback leadId: ${leadId}`, 'info', 'forms');
        }
        
        const regex = new RegExp(`{{\s*${variable}\s*}}`, 'g');
        result = result.replace(regex, leadId);
        logMessage(`Replaced variable {{${variable}}} with lead ID: ${leadId}`, 'info', 'forms');
        continue;
      }
      
      // Special case for trackingToken variable
      if (variable.toLowerCase() === 'trackingtoken') {
        // Use existing trackingToken or generate one with leadId-timestamp format
        let trackingToken = formData.trackingToken;
        
        if (!trackingToken) {
          // Get or generate a leadId that's different from the timestamp
          let leadId = formData.id || formData.leadId || formData.lead_id || formData.submissionId;
          
          // If no leadId found, generate a distinct one
          if (!leadId) {
            leadId = `lead-${formId.substring(0, 8)}-${Math.floor(Math.random() * 10000)}`;
            logMessage(`Generated distinct leadId for trackingToken: ${leadId}`, 'info', 'forms');
          }
          
          const timestamp = Date.now().toString();
          trackingToken = `${leadId}-${timestamp}`;
          logMessage(`Generated new trackingToken: ${trackingToken}`, 'info', 'forms');
        }
        
        const regex = new RegExp(`{{\s*${variable}\s*}}`, 'g');
        result = result.replace(regex, trackingToken);
        logMessage(`Replaced variable {{${variable}}} with tracking token: ${trackingToken}`, 'info', 'forms');
        continue;
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
      
      // Replace the variable with its value if found
      if (value !== undefined && value !== null) {
        const regex = new RegExp(`{{\s*${variable}\s*}}`, 'g');
        result = result.replace(regex, String(value));
        logMessage(`Replaced variable {{${variable}}} with value: ${value} (lookup took ${variableLookupTime}ms)`, 'info', 'forms');
      } else {
        // If no value found, replace with empty string
        const regex = new RegExp(`{{\s*${variable}\s*}}`, 'g');
        result = result.replace(regex, '');
        logMessage(`No value found for variable {{${variable}}}, replaced with empty string (lookup took ${variableLookupTime}ms)`, 'info', 'forms');
      }
    }
    
    const endTime = Date.now();
    logMessage(`Variable replacement completed in ${endTime - startTime}ms`, 'info', 'forms');
    
    return result;
  } catch (error) {
    logMessage(`Error replacing variables: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'forms');
    return template; // Return original template if replacement fails
  }
}

/**
 * Replaces variables in a template with values from form data
 * This function uses the optimized asynchronous implementation
 * 
 * @param template The template containing variables in the format {{variableName}}
 * @param formId The ID of the form
 * @param formData The form data containing field values
 * @returns The template with variables replaced
 */
export async function replaceVariables(template: string, formId: string, formData: Record<string, any>): Promise<string> {
  // Use the new asynchronous implementation
  return replaceVariablesAsync(template, formId, formData);
}
