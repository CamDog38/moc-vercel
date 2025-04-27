/**
 * Form System 2.0 ID Utilities
 * 
 * This file contains utility functions for generating IDs for forms, sections, and fields.
 */

/**
 * Generates a unique ID with an optional prefix
 */
export function generateId(prefix: string = 'item'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generates a unique ID for a field
 */
export function generateFieldId(): string {
  return generateId('field');
}

/**
 * Generates a unique ID for a section
 */
export function generateSectionId(): string {
  return generateId('section');
}

/**
 * Generates a unique ID for a form
 */
export function generateFormId(): string {
  return generateId('form');
}

/**
 * Generates a stable ID for a field based on its properties
 */
export function generateStableId(fieldConfig: { type: string; label: string; name?: string }): string {
  const { type, label, name } = fieldConfig;
  
  // Use name if available, otherwise use label
  const baseText = name || label;
  
  // Convert to camelCase
  const camelCase = baseText
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/[^a-zA-Z0-9]+/g, '')
    .replace(/^[A-Z]/, firstChar => firstChar.toLowerCase());
  
  // Add type prefix for clarity
  return `${type}_${camelCase}`;
}
