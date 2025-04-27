/**
 * Form System 2.0 Mapping Utilities
 * 
 * This file contains utility functions for handling field mappings.
 */

import { FieldMapping, FieldConfig } from '../core/types';

/**
 * Gets the mapped value from a field configuration
 */
export function getMappedValue(fieldConfig: FieldConfig): string | null {
  if (!fieldConfig.mapping) {
    return null;
  }

  if (fieldConfig.mapping.type === 'custom' && fieldConfig.mapping.customKey) {
    return fieldConfig.mapping.customKey;
  }

  return fieldConfig.mapping.type;
}

/**
 * Creates a field mapping object
 */
export function createFieldMapping(type: FieldMapping['type'], value: string, customKey?: string): FieldMapping {
  return {
    type,
    value,
    customKey: type === 'custom' ? customKey : undefined,
  };
}

/**
 * Gets all mapped fields from a form configuration
 */
export function getMappedFields(fields: FieldConfig[]): Record<string, FieldConfig> {
  const mappedFields: Record<string, FieldConfig> = {};

  fields.forEach(field => {
    const mappedValue = getMappedValue(field);
    if (mappedValue) {
      mappedFields[mappedValue] = field;
    }
  });

  return mappedFields;
}

/**
 * Applies mapped values to a template string
 * 
 * Example: "Hello {{name}}, your email is {{email}}"
 */
export function applyMappedValues(template: string, values: Record<string, any>, mappedFields: Record<string, FieldConfig>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const field = mappedFields[key];
    if (field && values[field.id] !== undefined) {
      return values[field.id];
    }
    return match;
  });
}

/**
 * Extracts mapped values from form submission data
 */
export function extractMappedValues(data: Record<string, any>, fields: FieldConfig[]): Record<string, any> {
  const result: Record<string, any> = {};
  const mappedFields = getMappedFields(fields);

  Object.entries(mappedFields).forEach(([mappedKey, field]) => {
    if (data[field.id] !== undefined) {
      result[mappedKey] = data[field.id];
    }
  });

  return result;
}
