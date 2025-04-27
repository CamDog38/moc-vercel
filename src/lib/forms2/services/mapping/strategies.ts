/**
 * Mapping Strategies
 * 
 * This file contains different strategies for mapping form fields to standardized fields.
 */

import * as logger from '@/util/logger';
import { isValidEmail } from '@/util/validation';
import { FieldConfig } from '@/lib/forms2/core/types';
import { MappingStrategyResult, FieldMapping } from './types';

/**
 * Maps a field based on its explicit mapping configuration
 */
export const explicitMappingStrategy = (
  field: FieldConfig,
  fieldId: string,
  value: any
): MappingStrategyResult | null => {
  if (!field.mapping) return null;
  
  try {
    // Handle string mapping that might be JSON
    if (typeof field.mapping === 'string') {
      // Try to parse JSON mapping
      if (field.mapping.startsWith('{') && field.mapping.endsWith('}')) {
        try {
          // Parse the JSON string into an object
          const parsedMapping = JSON.parse(field.mapping);
          
          // Check if the parsed object has a value property
          if (parsedMapping && typeof parsedMapping === 'object' && parsedMapping.value) {
            logger.debug(`Mapped field ${fieldId} using JSON mapping: ${parsedMapping.value}`, 'forms');
            return {
              fieldId,
              mappedKey: parsedMapping.value,
              value,
              strategy: 'explicit-json'
            };
          }
        } catch (parseError) {
          logger.error(`Error parsing JSON mapping: ${parseError}`, 'forms');
          // Fall through to direct mapping
        }
      }
      
      // Direct string mapping
      logger.debug(`Mapped field ${fieldId} using direct mapping: ${field.mapping}`, 'forms');
      return {
        fieldId,
        mappedKey: field.mapping,
        value,
        strategy: 'explicit-string'
      };
    }
    
    // Handle object mapping
    if (typeof field.mapping === 'object' && field.mapping !== null) {
      // Check if the object has a value property
      if ('value' in field.mapping && typeof field.mapping.value === 'string') {
        logger.debug(`Mapped field ${fieldId} using object mapping: ${field.mapping.value}`, 'forms');
        return {
          fieldId,
          mappedKey: field.mapping.value,
          value,
          strategy: 'explicit-object'
        };
      }
    }
  } catch (error) {
    logger.error(`Error in explicit mapping strategy: ${error}`, 'forms');
  }
  
  return null;
};

/**
 * Maps a field based on its field type
 */
export const fieldTypeStrategy = (
  field: FieldConfig,
  fieldId: string,
  value: any
): MappingStrategyResult | null => {
  if (!field.type) return null;
  
  const fieldType = field.type.toLowerCase();
  
  // Map based on field type
  if (['email', 'mail', 'e-mail'].includes(fieldType)) {
    logger.debug(`Mapped field ${fieldId} using type strategy: email`, 'forms');
    return {
      fieldId,
      mappedKey: 'email',
      value,
      strategy: 'field-type'
    };
  }
  
  if (['name', 'fullname', 'full_name', 'full-name'].includes(fieldType)) {
    logger.debug(`Mapped field ${fieldId} using type strategy: name`, 'forms');
    return {
      fieldId,
      mappedKey: 'name',
      value,
      strategy: 'field-type'
    };
  }
  
  if (['firstname', 'first_name', 'first-name'].includes(fieldType)) {
    logger.debug(`Mapped field ${fieldId} using type strategy: first_name`, 'forms');
    return {
      fieldId,
      mappedKey: 'first_name',
      value,
      strategy: 'field-type'
    };
  }
  
  if (['lastname', 'last_name', 'last-name'].includes(fieldType)) {
    logger.debug(`Mapped field ${fieldId} using type strategy: last_name`, 'forms');
    return {
      fieldId,
      mappedKey: 'last_name',
      value,
      strategy: 'field-type'
    };
  }
  
  if (['phone', 'tel', 'telephone', 'mobile'].includes(fieldType)) {
    logger.debug(`Mapped field ${fieldId} using type strategy: phone`, 'forms');
    return {
      fieldId,
      mappedKey: 'phone',
      value,
      strategy: 'field-type'
    };
  }
  
  if (['date', 'booking_date', 'appointment_date'].includes(fieldType)) {
    logger.debug(`Mapped field ${fieldId} using type strategy: date`, 'forms');
    return {
      fieldId,
      mappedKey: 'date',
      value,
      strategy: 'field-type'
    };
  }
  
  if (['time', 'booking_time', 'appointment_time'].includes(fieldType)) {
    logger.debug(`Mapped field ${fieldId} using type strategy: time`, 'forms');
    return {
      fieldId,
      mappedKey: 'time',
      value,
      strategy: 'field-type'
    };
  }
  
  if (['datetime', 'datetime-local', 'booking_datetime'].includes(fieldType)) {
    logger.debug(`Mapped field ${fieldId} using type strategy: datetime`, 'forms');
    return {
      fieldId,
      mappedKey: 'datetime',
      value,
      strategy: 'field-type'
    };
  }
  
  return null;
};

/**
 * Maps a field based on its label
 */
export const fieldLabelStrategy = (
  field: FieldConfig,
  fieldId: string,
  value: any
): MappingStrategyResult | null => {
  if (!field.label) return null;
  
  const fieldLabel = field.label.toLowerCase();
  
  // Email field detection
  if (fieldLabel.includes('email') || fieldLabel.includes('e-mail')) {
    logger.debug(`Mapped field ${fieldId} using label strategy: email`, 'forms');
    return {
      fieldId,
      mappedKey: 'email',
      value,
      strategy: 'field-label'
    };
  }
  
  // Name field detection (full name)
  if (fieldLabel.includes('name') && 
      !fieldLabel.includes('first') && 
      !fieldLabel.includes('last')) {
    logger.debug(`Mapped field ${fieldId} using label strategy: name`, 'forms');
    return {
      fieldId,
      mappedKey: 'name',
      value,
      strategy: 'field-label'
    };
  }
  
  // First name detection
  if (fieldLabel.includes('first') && fieldLabel.includes('name')) {
    logger.debug(`Mapped field ${fieldId} using label strategy: first_name`, 'forms');
    return {
      fieldId,
      mappedKey: 'first_name',
      value,
      strategy: 'field-label'
    };
  }
  
  // Last name detection
  if (fieldLabel.includes('last') && fieldLabel.includes('name')) {
    logger.debug(`Mapped field ${fieldId} using label strategy: last_name`, 'forms');
    return {
      fieldId,
      mappedKey: 'last_name',
      value,
      strategy: 'field-label'
    };
  }
  
  // Phone detection
  if (fieldLabel.includes('phone') || 
      fieldLabel.includes('tel') || 
      fieldLabel.includes('mobile')) {
    logger.debug(`Mapped field ${fieldId} using label strategy: phone`, 'forms');
    return {
      fieldId,
      mappedKey: 'phone',
      value,
      strategy: 'field-label'
    };
  }
  
  // Date detection
  if ((fieldLabel.includes('date') || fieldLabel.includes('day')) && 
      !fieldLabel.includes('time') && 
      !fieldLabel.includes('birth')) {
    logger.debug(`Mapped field ${fieldId} using label strategy: date`, 'forms');
    return {
      fieldId,
      mappedKey: 'date',
      value,
      strategy: 'field-label'
    };
  }
  
  // Time detection
  if (fieldLabel.includes('time') && !fieldLabel.includes('date')) {
    logger.debug(`Mapped field ${fieldId} using label strategy: time`, 'forms');
    return {
      fieldId,
      mappedKey: 'time',
      value,
      strategy: 'field-label'
    };
  }
  
  // Date and time detection
  if ((fieldLabel.includes('date') && fieldLabel.includes('time')) || 
      fieldLabel.includes('datetime')) {
    logger.debug(`Mapped field ${fieldId} using label strategy: datetime`, 'forms');
    return {
      fieldId,
      mappedKey: 'datetime',
      value,
      strategy: 'field-label'
    };
  }
  
  // Location detection
  if (fieldLabel.includes('location') || 
      fieldLabel.includes('office') || 
      fieldLabel.includes('branch')) {
    logger.debug(`Mapped field ${fieldId} using label strategy: location`, 'forms');
    return {
      fieldId,
      mappedKey: 'location',
      value,
      strategy: 'field-label'
    };
  }
  
  return null;
};

/**
 * Maps a field based on its field ID
 */
export const fieldIdStrategy = (
  field: FieldConfig,
  fieldId: string,
  value: any
): MappingStrategyResult | null => {
  const lowerFieldId = fieldId.toLowerCase();
  
  // Email detection
  if (lowerFieldId.includes('email')) {
    logger.debug(`Mapped field ${fieldId} using ID strategy: email`, 'forms');
    return {
      fieldId,
      mappedKey: 'email',
      value,
      strategy: 'field-id'
    };
  }
  
  // Name detection
  if (lowerFieldId.includes('name') && 
      !lowerFieldId.includes('first') && 
      !lowerFieldId.includes('last')) {
    logger.debug(`Mapped field ${fieldId} using ID strategy: name`, 'forms');
    return {
      fieldId,
      mappedKey: 'name',
      value,
      strategy: 'field-id'
    };
  }
  
  // First name detection
  if (lowerFieldId.includes('firstname') || 
      lowerFieldId.includes('first_name') || 
      (lowerFieldId.includes('first') && lowerFieldId.includes('name'))) {
    logger.debug(`Mapped field ${fieldId} using ID strategy: first_name`, 'forms');
    return {
      fieldId,
      mappedKey: 'first_name',
      value,
      strategy: 'field-id'
    };
  }
  
  // Last name detection
  if (lowerFieldId.includes('lastname') || 
      lowerFieldId.includes('last_name') || 
      (lowerFieldId.includes('last') && lowerFieldId.includes('name'))) {
    logger.debug(`Mapped field ${fieldId} using ID strategy: last_name`, 'forms');
    return {
      fieldId,
      mappedKey: 'last_name',
      value,
      strategy: 'field-id'
    };
  }
  
  // Phone detection
  if (lowerFieldId.includes('phone') || 
      lowerFieldId.includes('tel') || 
      lowerFieldId.includes('mobile')) {
    logger.debug(`Mapped field ${fieldId} using ID strategy: phone`, 'forms');
    return {
      fieldId,
      mappedKey: 'phone',
      value,
      strategy: 'field-id'
    };
  }
  
  // Date detection
  if (lowerFieldId.includes('date') && 
      !lowerFieldId.includes('time') && 
      !lowerFieldId.includes('birth')) {
    logger.debug(`Mapped field ${fieldId} using ID strategy: date`, 'forms');
    return {
      fieldId,
      mappedKey: 'date',
      value,
      strategy: 'field-id'
    };
  }
  
  // Time detection
  if (lowerFieldId.includes('time') && !lowerFieldId.includes('date')) {
    logger.debug(`Mapped field ${fieldId} using ID strategy: time`, 'forms');
    return {
      fieldId,
      mappedKey: 'time',
      value,
      strategy: 'field-id'
    };
  }
  
  return null;
};

/**
 * Maps a field based on its value pattern
 */
export const valuePatternStrategy = (
  field: FieldConfig,
  fieldId: string,
  value: any
): MappingStrategyResult | null => {
  if (!value || typeof value !== 'string') return null;
  
  // Email pattern detection
  if (isValidEmail(value)) {
    logger.debug(`Mapped field ${fieldId} using value pattern strategy: email`, 'forms');
    return {
      fieldId,
      mappedKey: 'email',
      value,
      strategy: 'value-pattern'
    };
  }
  
  // Phone pattern detection
  if (/^[\d\s\+\-\(\)]{7,}$/.test(value)) {
    logger.debug(`Mapped field ${fieldId} using value pattern strategy: phone`, 'forms');
    return {
      fieldId,
      mappedKey: 'phone',
      value,
      strategy: 'value-pattern'
    };
  }
  
  // Date pattern detection (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    logger.debug(`Mapped field ${fieldId} using value pattern strategy: date`, 'forms');
    return {
      fieldId,
      mappedKey: 'date',
      value,
      strategy: 'value-pattern'
    };
  }
  
  // Time pattern detection (HH:MM)
  if (/^\d{1,2}:\d{2}/.test(value)) {
    logger.debug(`Mapped field ${fieldId} using value pattern strategy: time`, 'forms');
    return {
      fieldId,
      mappedKey: 'time',
      value,
      strategy: 'value-pattern'
    };
  }
  
  // Name pattern detection (typical full name with space)
  if (value.includes(' ') && 
      value.length < 50 && 
      /^[A-Za-z\s\.'\-]+$/.test(value) && 
      !/^[\d\s\+\-\(\)]+$/.test(value) &&
      !value.includes('@')) {
    logger.debug(`Mapped field ${fieldId} using value pattern strategy: name`, 'forms');
    return {
      fieldId,
      mappedKey: 'name',
      value,
      strategy: 'value-pattern'
    };
  }
  
  return null;
};
