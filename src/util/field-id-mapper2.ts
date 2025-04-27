/**
 * Utility for mapping Form System 2.0 field IDs to stable identifiers
 * This helps with email rules that need to reference fields even when IDs change
 * and provides robust variable replacement for email templates
 * 
 * NOTE: This file is a wrapper that imports from the modular structure in the field-mapping directory
 * for better organization and maintainability while maintaining backward compatibility.
 * 
*/

// Import and re-export all functions from the new modular structure
import {
  mapFieldIds,
  mapSingleFieldId,
  findFieldValueByStableId,
  replaceVariables,
  extractFieldsFromForm,
  convertToCamelCase,
  mapSpecialFieldsByType,
  mapSpecialFieldsByLabel,
  processArrayFormData,
  findEmailInFormData,
  findSpecialFieldValue,
  logMessage,
  LogCategory,
  SpecialFieldType
} from './field-mapping';

// Re-export all functions to maintain backward compatibility
export {
  mapFieldIds,
  mapSingleFieldId,
  findFieldValueByStableId,
  replaceVariables,
  extractFieldsFromForm,
  convertToCamelCase,
  mapSpecialFieldsByType,
  mapSpecialFieldsByLabel,
  processArrayFormData,
  findEmailInFormData,
  findSpecialFieldValue,
  logMessage
};

// Re-export types
export type { LogCategory, SpecialFieldType };
