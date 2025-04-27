/**
 * Options Helper Functions
 * 
 * Helper functions for handling field options in different formats.
 * Provides robust parsing and normalization for various option input formats.
 * Handles edge cases gracefully to prevent runtime errors.
 * 
 * Key features:
 * - Supports multiple input formats (arrays, objects, strings, JSON)
 * - Normalizes all options to a consistent structure
 * - Handles edge cases like null values, empty arrays, and malformed data
 * - Provides sensible defaults when input data is missing or invalid
 * - Preserves option IDs when available for stable selection state
 * - Comprehensive error handling to prevent UI crashes
 */

import { FieldOption } from '@/lib/forms2/core/types';

/**
 * Parse options from different formats
 */
export function parseOptions(options: any, fieldId: string, fieldLabel?: string): FieldOption[] {
  // Default options to use when needed
  const defaultOptions: FieldOption[] = [
    { id: 'option1', value: 'option1', label: 'Option 1' },
    { id: 'option2', value: 'option2', label: 'Option 2' },
    { id: 'option3', value: 'option3', label: 'Option 3' }
  ];
  
  // Handle null or undefined options
  if (!options) {
    console.log(`No options provided for field ${fieldId}, using defaults`);
    return defaultOptions;
  }
  
  // Log the options structure for debugging
  console.log(`[DEBUG] Raw options for field ${fieldId}:`, options);
  
  try {
    // Handle string format (JSON string)
    if (typeof options === 'string') {
      try {
        // Try to parse as JSON
        const parsedOptions = JSON.parse(options);
        
        // Handle array format after parsing
        if (Array.isArray(parsedOptions)) {
          return parsedOptions.map(opt => normalizeOption(opt));
        }
        
        // Handle object format after parsing
        if (typeof parsedOptions === 'object' && parsedOptions !== null) {
          return Object.entries(parsedOptions).map(([key, value]) => ({
            id: key,
            value: key,
            label: typeof value === 'string' ? value : key
          }));
        }
      } catch (e) {
        // Not valid JSON, try as comma-separated list
        if (options.includes(',')) {
          return options.split(',').map(opt => ({
            id: opt.trim(),
            value: opt.trim(),
            label: opt.trim()
          }));
        }
        // Single option
        return [{
          id: options,
          value: options,
          label: options
        }];
      }
    }
    
    // Handle array format (already parsed)
    if (Array.isArray(options)) {
      // If array is empty, return default options
      if (options.length === 0) {
        return defaultOptions;
      }
      
      // Process each option in the array
      return options.map((opt: any) => {
        // If the option is just a string, use it as is
        if (typeof opt === 'string') {
          return {
            id: opt,
            value: opt,
            label: opt
          };
        }
        
        // If the option is an object but doesn't have proper structure
        // This is likely the case with [object Object] showing up
        if (typeof opt === 'object' && opt !== null) {
          // If it has a label property, use that
          if ('label' in opt && typeof opt.label === 'string') {
            return {
              id: opt.id || opt.value || opt.label,
              value: opt.value || opt.id || opt.label,
              label: opt.label
            };
          }
          
          // If it has a value property, use that
          if ('value' in opt && (typeof opt.value === 'string' || typeof opt.value === 'number')) {
            const valueStr = String(opt.value);
            return {
              id: opt.id || valueStr,
              value: valueStr,
              label: opt.label || valueStr
            };
          }
          
          // Last resort: stringify the object but make it readable
          try {
            const stringValue = JSON.stringify(opt)
              .replace(/[{}"'\[\]]/g, '')
              .replace(/,/g, ' ');
            return {
              id: stringValue,
              value: stringValue,
              label: stringValue
            };
          } catch (e) {
            // If all else fails, use a placeholder
            return {
              id: `option-${Math.random().toString(36).substring(2, 9)}`,
              value: `option-${Math.random().toString(36).substring(2, 9)}`,
              label: 'Option'
            };
          }
        }
        
        // Fallback for any other type
        return normalizeOption(opt);
      });
    }
    
    // Handle object format (key-value pairs)
    if (options && typeof options === 'object' && !Array.isArray(options)) {
      // Check for the nested structure: { name: "field_name", options: [...] }
      if (options.options && Array.isArray(options.options)) {
        console.log(`Found nested options structure for field ${fieldId}:`, options);
        // Use the nested options array
        return options.options.map((opt: any) => normalizeOption(opt));
      }
      
      // Special case for dropdown fields in the database
      if (Array.isArray(options.options)) {
        return options.options.map((opt: any) => normalizeOption(opt));
      }
      
      // Make sure we're not just converting the field object itself
      if ('type' in options && 'id' in options) {
        return defaultOptions;
      }
      
      // Convert object to key-value pairs
      return Object.entries(options).map(([key, value]) => ({
        id: key,
        value: key,
        label: typeof value === 'string' ? value : key
      }));
    }
  } catch (e) {
    // If any error occurs during processing, return default options
    return defaultOptions;
  }
  
  // If we get here, return default options
  return defaultOptions;
}

/**
 * Normalize option to ensure consistent format
 */
export function normalizeOption(option: any): FieldOption {
  // Handle null or undefined
  if (option === null || option === undefined) {
    return { id: '', value: '', label: 'Select an option' };
  }
  
  // Handle string format (simple value)
  if (typeof option === 'string') {
    return { id: option, value: option, label: option };
  }
  
  // Handle number format
  if (typeof option === 'number') {
    const strValue = String(option);
    return { id: strValue, value: strValue, label: strValue };
  }
  
  // Handle boolean format
  if (typeof option === 'boolean') {
    const strValue = String(option);
    return { id: strValue, value: strValue, label: strValue };
  }
  
  // Handle object format
  if (typeof option === 'object') {
    // First, check for the most common and expected format
    if ('label' in option && typeof option.label === 'string') {
      // Make sure we have a string value
      const value = option.value !== undefined ? String(option.value) : option.label;
      const id = option.id !== undefined ? String(option.id) : value;
      return { id, value, label: option.label };
    }
    
    // Check for objects with just a value property
    if ('value' in option) {
      const valueStr = String(option.value);
      // Use the value as the label if no label is provided
      const label = option.label ? String(option.label) : valueStr;
      return { id: valueStr, value: valueStr, label };
    }
    
    // Check for objects with a name property (common in some APIs)
    if ('name' in option && typeof option.name === 'string') {
      return { 
        id: String(option.id || option.name), 
        value: String(option.id || option.name), 
        label: option.name 
      };
    }
    
    // Check for objects with a text property (common in some UIs)
    if ('text' in option && typeof option.text === 'string') {
      return { 
        id: String(option.id || option.value || option.text), 
        value: String(option.value || option.id || option.text), 
        label: option.text 
      };
    }
    
    // If it's an array, use the first element as a string
    if (Array.isArray(option)) {
      if (option.length === 0) {
        return { id: '', value: '', label: 'Empty option' };
      }
      const firstItem = option[0];
      if (typeof firstItem === 'string' || typeof firstItem === 'number') {
        const strValue = String(firstItem);
        return { id: strValue, value: strValue, label: strValue };
      }
    }
    
    // Last resort: try to create a meaningful string representation
    try {
      // First check if the object has any string properties we can use
      const stringProps = Object.entries(option)
        .filter(([_, v]) => typeof v === 'string' || typeof v === 'number')
        .map(([k, v]) => `${k}: ${v}`);
      
      if (stringProps.length > 0) {
        const stringValue = stringProps.join(', ');
        return { id: stringValue, value: stringValue, label: stringValue };
      }
      
      // If no string properties, use JSON stringify but clean it up
      const stringValue = JSON.stringify(option)
        .replace(/[{}"'\[\]]/g, '')
        .replace(/,/g, ', ')
        .trim();
      
      // If the string is empty after cleaning, use a fallback
      if (!stringValue || stringValue === '') {
        return { 
          id: `option-${Math.random().toString(36).substring(2, 9)}`, 
          value: `option-${Math.random().toString(36).substring(2, 9)}`, 
          label: 'Option' 
        };
      }
      
      return { id: stringValue, value: stringValue, label: stringValue };
    } catch (e) {
      // If JSON stringify fails, use a fallback
      return { 
        id: `option-${Math.random().toString(36).substring(2, 9)}`, 
        value: `option-${Math.random().toString(36).substring(2, 9)}`, 
        label: 'Option' 
      };
    }
  }
  
  // Fallback for any other type
  return { id: String(option), value: String(option), label: String(option) };
}
