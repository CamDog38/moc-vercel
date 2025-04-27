/**
 * Form System 2.0 Variable Replacement Service
 * 
 * This service handles replacing variables in email templates with data from form submissions.
 */

import { EnhancedData } from './types';

/**
 * Replace variables in a text with values from the data object
 * 
 * @param text The text containing variables to replace
 * @param data The data object containing values for the variables
 * @returns The text with variables replaced
 */
export function replaceVariables2(text: string, data: Record<string, any>): string {
  if (!text) return '';
  
  console.log(`[EMAIL PROCESSING2] Replacing variables in text`);
  
  // Create an enhanced data object with common variable mappings
  const enhancedData: EnhancedData = { ...data };
  
  // Log available keys for debugging
  console.log(`[EMAIL PROCESSING2] Enhanced data keys for replacement: ${Object.keys(enhancedData).join(', ')}`);
  
  // Find all variables in the text using regex
  const variableRegex = /{{([^{}]+)}}/g;
  const matches = text.match(variableRegex);
  
  if (matches) {
    console.log(`[EMAIL PROCESSING2] Found variables in text: ${matches.join(', ')}`);
    
    // Replace each variable with its value
    matches.forEach(match => {
      // Extract variable name without the curly braces
      const variableName = match.substring(2, match.length - 2);
      console.log(`[EMAIL PROCESSING2] Replacing variable: ${match}`);
      
      // Find the value for the variable
      let value = findVariableValue(variableName, enhancedData);
      
      // Replace the variable with its value
      if (value !== undefined) {
        console.log(`[EMAIL PROCESSING2] Found value for variable ${match}: ${value}`);
        text = text.replace(match, value);
      } else {
        console.log(`[EMAIL PROCESSING2] No value found for variable ${match}, leaving as is`);
      }
    });
  }
  
  return text;
}

/**
 * Find the value for a variable in the data object
 * 
 * @param variableName The name of the variable
 * @param data The data object containing values for the variables
 * @returns The value for the variable, or undefined if not found
 */
function findVariableValue(variableName: string, data: EnhancedData): string | undefined {
  // Check if the variable exists directly in the data
  if (data[variableName] !== undefined) {
    return String(data[variableName] || '');
  }
  
  // Handle special case for firstName
  if (variableName === 'firstName') {
    // First check if firstName is already in the data
    if (data.firstName) {
      return String(data.firstName);
    }
    
    // Try to extract first name from name field
    if (data.name) {
      const firstName = data.name.split(' ')[0];
      return firstName;
    }
    
    // Try to extract username from email as a last resort
    if (data.email) {
      const username = data.email.split('@')[0];
      return username;
    }
    
    // Default fallback
    return 'Customer';
  }
  
  // Handle other common variables
  if (variableName === 'email' && data.email) {
    return String(data.email);
  }
  
  if (variableName === 'name' && data.name) {
    return String(data.name);
  }
  
  if (variableName === 'phone' && data.phone) {
    return String(data.phone);
  }
  
  // Return undefined if no value is found
  return undefined;
}
