/**
 * Stable ID Generator for Form System 2.0
 * 
 * This utility generates stable, consistent IDs for form fields that persist
 * even when forms are recreated or modified. These stable IDs are used by
 * email rules to reliably match fields across form versions.
 * 
 * Key features:
 * - Deterministic ID generation based on field properties
 * - Support for different field types with type-specific ID patterns
 * - Fallback mechanisms for edge cases
 * - Compatibility with existing field-id-mapper2.ts utility
 */

import { FieldConfig, FieldType } from '../core/types';

/**
 * Generate a stable ID for a form field
 * 
 * @param field The field configuration object
 * @param sectionTitle Optional section title for context
 * @returns A stable ID string that can be used for reliable field matching
 */
export function generateStableId(field: FieldConfig, sectionTitle?: string): string {
  // If the field already has a stableId, use it
  if (field.stableId) {
    return field.stableId;
  }
  
  // Generate a stable ID based on field properties
  
  // 1. Use the field's mapping if available
  if (field.mapping && typeof field.mapping === 'object' && field.mapping.value) {
    return field.mapping.value;
  }
  
  // 2. Use field type for common field types
  if (field.type === 'email') {
    return 'email';
  }
  if (field.type === 'tel' || field.type === 'phone') {
    return 'phone';
  }
  if (field.type === 'name') {
    return 'name';
  }
  
  // 3. Use label-based identification for common fields
  if (field.label) {
    const label = field.label.toLowerCase();
    
    // Check for common field types by label
    if (label.includes('email')) {
      return 'email';
    }
    if (label.includes('phone') || label.includes('tel')) {
      return 'phone';
    }
    if (label === 'name' || label === 'full name') {
      return 'name';
    }
    if (label.includes('first name')) {
      return 'firstName';
    }
    if (label.includes('last name')) {
      return 'lastName';
    }
    if (label.includes('company') || label.includes('organization')) {
      return 'company';
    }
    if (label.includes('address') && !label.includes('email')) {
      return 'address';
    }
    if (label.includes('city')) {
      return 'city';
    }
    if (label.includes('state') || label.includes('province')) {
      return 'state';
    }
    if (label.includes('zip') || label.includes('postal')) {
      return 'zip';
    }
    if (label.includes('country')) {
      return 'country';
    }
    
    // For other fields, create a stable ID based on the section and field label
    let stableId = convertToCamelCase(field.label);
    
    // If we have a section title, prefix the ID with the section name
    if (sectionTitle) {
      const sectionPrefix = convertToCamelCase(sectionTitle);
      stableId = `${sectionPrefix}_${stableId}`;
    }
    
    return stableId;
  }
  
  // 4. Use the field name if available
  if (field.name) {
    return field.name;
  }
  
  // 5. Fallback to using the field ID with a prefix
  return `field_${field.id}`;
}

/**
 * Convert a string to camelCase
 * 
 * @param str The string to convert
 * @returns The camelCase version of the string
 */
export function convertToCamelCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (_: string, chr: string) => chr.toUpperCase())
    .replace(/[^a-zA-Z0-9]+/g, '')
    .replace(/^[A-Z]/, (firstChar: string) => firstChar.toLowerCase());
}

/**
 * Check if a field has a stable ID
 * 
 * @param field The field to check
 * @returns True if the field has a stable ID
 */
export function hasStableId(field: FieldConfig): boolean {
  return !!field.stableId;
}

/**
 * Update a field with a stable ID
 * 
 * @param field The field to update
 * @param sectionTitle Optional section title for context
 * @returns A new field object with the stable ID added
 */
export function addStableIdToField(field: FieldConfig, sectionTitle?: string): FieldConfig {
  if (hasStableId(field)) {
    return field;
  }
  
  return {
    ...field,
    stableId: generateStableId(field, sectionTitle)
  };
}

/**
 * Update all fields in a form with stable IDs
 * 
 * @param fields Array of fields to update
 * @param sectionTitle Optional section title for context
 * @returns A new array of fields with stable IDs added
 */
export function addStableIdsToFields(fields: FieldConfig[], sectionTitle?: string): FieldConfig[] {
  return fields.map(field => addStableIdToField(field, sectionTitle));
}