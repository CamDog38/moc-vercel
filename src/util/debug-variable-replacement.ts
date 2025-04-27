/**
 * Utility for debugging variable replacement in email templates
 * This helps identify why variables aren't being replaced properly
 */

import { addApiLog } from '@/pages/api/debug/logs';

/**
 * Logs detailed information about variable replacement for debugging
 * @param text The template text containing variables
 * @param data The data object used for replacement
 * @param prefix A prefix for log messages
 */
export function debugVariableReplacement(text: string, data: Record<string, any>, prefix: string = ''): void {
  // Extract all variables from the template
  const variables = text.match(/\{\{([^}]+)\}\}/g) || [];
  
  if (variables.length === 0) {
    addApiLog(`${prefix} No variables found in template`, 'info', 'emails');
    return;
  }
  
  addApiLog(`${prefix} Found ${variables.length} variables in template: ${variables.join(', ')}`, 'info', 'emails');
  
  // Check each variable against the data
  variables.forEach(variable => {
    // Extract variable name without {{ }}
    const variableName = variable.replace(/\{\{|\}\}/g, '').trim();
    
    // Skip conditional variables
    if (variableName.startsWith('#if') || variableName === '/if') {
      addApiLog(`${prefix} Skipping conditional variable: ${variable}`, 'info', 'emails');
      return;
    }
    
    // Check if variable exists directly in data
    if (data[variableName] !== undefined) {
      addApiLog(`${prefix} ✅ Variable ${variable} found directly in data: ${JSON.stringify(data[variableName])}`, 'success', 'emails');
      return;
    }
    
    // Check if it's a nested variable
    if (variableName.includes('.')) {
      const parts = variableName.split('.');
      let value = data;
      let found = true;
      
      for (const part of parts) {
        if (value && typeof value === 'object' && part in value) {
          value = value[part];
        } else {
          found = false;
          break;
        }
      }
      
      if (found) {
        addApiLog(`${prefix} ✅ Nested variable ${variable} found in data: ${JSON.stringify(value)}`, 'success', 'emails');
        return;
      }
      
      addApiLog(`${prefix} ❌ Nested variable ${variable} NOT found in data`, 'error', 'emails');
      
      // Debug the path to see where it breaks
      let partialPath = '';
      let partialValue = data;
      for (const part of parts) {
        partialPath = partialPath ? `${partialPath}.${part}` : part;
        
        if (partialValue && typeof partialValue === 'object' && part in partialValue) {
          partialValue = partialValue[part];
          addApiLog(`${prefix}   - Path ${partialPath} exists: ${JSON.stringify(partialValue)}`, 'info', 'emails');
        } else {
          addApiLog(`${prefix}   - Path ${partialPath} does NOT exist`, 'error', 'emails');
          break;
        }
      }
      
      return;
    }
    
    // Check if it's a field_ prefixed variable
    if (variableName.startsWith('field_')) {
      const fieldName = variableName.substring(6);
      
      if (data.formData && data.formData[fieldName] !== undefined) {
        addApiLog(`${prefix} ✅ Field variable ${variable} found in formData: ${JSON.stringify(data.formData[fieldName])}`, 'success', 'emails');
        return;
      }
      
      addApiLog(`${prefix} ❌ Field variable ${variable} NOT found in formData`, 'error', 'emails');
      return;
    }
    
    // Check if it's in formData
    if (data.formData && data.formData[variableName] !== undefined) {
      addApiLog(`${prefix} ✅ Variable ${variable} found in formData: ${JSON.stringify(data.formData[variableName])}`, 'success', 'emails');
      return;
    }
    
    // Check if it's in submission.data
    if (data.submission && data.submission.data && data.submission.data[variableName] !== undefined) {
      addApiLog(`${prefix} ✅ Variable ${variable} found in submission.data: ${JSON.stringify(data.submission.data[variableName])}`, 'success', 'emails');
      return;
    }
    
    // Check if it's a special variable
    if (variableName === 'timeStamp') {
      addApiLog(`${prefix} ✅ Special variable timeStamp: ${data.timeStamp || 'not found'}`, data.timeStamp ? 'success' : 'error', 'emails');
      return;
    }
    
    if (variableName === 'trackingToken') {
      addApiLog(`${prefix} ✅ Special variable trackingToken: ${data.trackingToken || 'not found'}`, data.trackingToken ? 'success' : 'error', 'emails');
      return;
    }
    
    if (variableName === 'leadId') {
      addApiLog(`${prefix} ✅ Special variable leadId: ${data.leadId || 'not found'}`, data.leadId ? 'success' : 'error', 'emails');
      return;
    }
    
    if (variableName === 'bookingLink') {
      addApiLog(`${prefix} ✅ Special variable bookingLink: ${data.bookingLink || 'not found'}`, data.bookingLink ? 'success' : 'error', 'emails');
      return;
    }
    
    // Check if it's a field ID in submission.data
    if (data.submission && data.submission.data) {
      const fieldIdPattern = /^[a-z0-9]{24,}$/;
      
      for (const [key, fieldValue] of Object.entries(data.submission.data)) {
        if (fieldIdPattern.test(key)) {
          if (typeof fieldValue === 'object' && fieldValue !== null && 'name' in fieldValue && fieldValue.name === variableName) {
            addApiLog(`${prefix} ✅ Variable ${variable} found as field name in submission.data[${key}]: ${JSON.stringify(fieldValue)}`, 'success', 'emails');
            return;
          }
          
          if (key === variableName) {
            addApiLog(`${prefix} ✅ Variable ${variable} found as field ID in submission.data: ${JSON.stringify(fieldValue)}`, 'success', 'emails');
            return;
          }
        }
      }
    }
    
    // If we get here, the variable wasn't found
    addApiLog(`${prefix} ❌ Variable ${variable} NOT found in any data source`, 'error', 'emails');
    
    // Log available data keys for debugging
    addApiLog(`${prefix}   - Available top-level keys: ${Object.keys(data).join(', ')}`, 'info', 'emails');
    
    if (data.formData) {
      addApiLog(`${prefix}   - Available formData keys: ${Object.keys(data.formData).join(', ')}`, 'info', 'emails');
    }
    
    if (data.submission && data.submission.data) {
      addApiLog(`${prefix}   - Available submission.data keys: ${Object.keys(data.submission.data).join(', ')}`, 'info', 'emails');
    }
  });
}