/**
 * Form Field Mapper
 * 
 * This file contains the core mapping logic for form fields.
 */

import * as logger from '@/util/logger';
import { FieldConfig, FormConfig } from '@/lib/forms2/core/types';
import { StandardMappedFields, MappingOptions } from './types';
import { 
  explicitMappingStrategy, 
  fieldTypeStrategy, 
  fieldLabelStrategy, 
  fieldIdStrategy, 
  valuePatternStrategy 
} from './strategies';
import { extractContactInfo } from './contactInfoExtractor';

/**
 * Maps form data to standardized field names based on field configuration
 * 
 * @param formConfig The form configuration with sections and fields
 * @param formData The submitted form data
 * @param options Mapping options
 * @returns Mapped data with standardized field names
 */
export const mapFormFields = (
  formConfig: FormConfig,
  formData: Record<string, any>,
  options: MappingOptions = {}
): StandardMappedFields => {
  // Initialize mapped data with common fields
  const mappedData: StandardMappedFields = {
    email: null,
    name: null,
    first_name: null,
    last_name: null,
    phone: null,
    date: null,
    time: null,
    location: null,
    location_office: null,
    datetime: null,
  };
  
  // Track which fields have been successfully mapped
  const mappedFields = new Set<string>();
  
  // Log the raw form data for debugging
  if (options.logMappingProcess) {
    logger.info(`Raw form data: ${JSON.stringify(formData)}`, 'forms');
  }
  
  // Create a lookup table for fields by ID
  const fieldsById: Record<string, FieldConfig> = {};
  
  // Populate the fields lookup table
  if (formConfig.sections && Array.isArray(formConfig.sections)) {
    for (const section of formConfig.sections) {
      if (!section.fields || !Array.isArray(section.fields)) continue;
      
      for (const field of section.fields) {
        fieldsById[field.id] = field;
      }
    }
  }
  
  // Apply mapping strategies in order of priority
  Object.keys(formData).forEach(fieldId => {
    const value = formData[fieldId];
    if (value === null || value === undefined) return;
    
    const field = fieldsById[fieldId];
    if (!field) {
      if (options.logMappingProcess) {
        logger.warn(`Field ${fieldId} not found in form configuration`, 'forms');
      }
      return;
    }
    
    // Apply mapping strategies in order of priority
    const strategies = [
      // 1. Explicit mapping has highest priority
      () => explicitMappingStrategy(field, fieldId, value),
      
      // 2. Field type-based mapping
      () => fieldTypeStrategy(field, fieldId, value),
      
      // 3. Field label-based mapping
      () => fieldLabelStrategy(field, fieldId, value),
      
      // 4. Field ID-based mapping
      () => fieldIdStrategy(field, fieldId, value),
      
      // 5. Value pattern-based mapping (lowest priority)
      () => valuePatternStrategy(field, fieldId, value)
    ];
    
    // Try each strategy until one succeeds
    for (const strategy of strategies) {
      const result = strategy();
      if (result) {
        mappedData[result.mappedKey] = result.value;
        mappedFields.add(fieldId);
        
        if (options.logMappingProcess) {
          logger.info(`Mapped field ${fieldId} to ${result.mappedKey} using ${result.strategy} strategy`, 'forms');
        }
        
        // Special handling for first_name and last_name to update name
        if (result.mappedKey === 'first_name' && !mappedData.name) {
          if (mappedData.last_name) {
            mappedData.name = `${result.value} ${mappedData.last_name}`;
          } else {
            mappedData.name = result.value;
          }
        } else if (result.mappedKey === 'last_name' && !mappedData.name) {
          if (mappedData.first_name) {
            mappedData.name = `${mappedData.first_name} ${result.value}`;
          } else {
            mappedData.name = result.value;
          }
        }
        
        break;
      }
    }
  });
  
  // For fields that couldn't be mapped using the standard strategies,
  // try to extract contact information directly from the form data
  if (!mappedData.email || !mappedData.name || !mappedData.phone) {
    const contactInfo = extractContactInfo(formData);
    
    if (!mappedData.email && contactInfo.email) {
      mappedData.email = contactInfo.email;
      if (options.logMappingProcess) {
        logger.info(`Extracted email from raw data: ${contactInfo.email}`, 'forms');
      }
    }
    
    if (!mappedData.name && contactInfo.name) {
      mappedData.name = contactInfo.name;
      if (options.logMappingProcess) {
        logger.info(`Extracted name from raw data: ${contactInfo.name}`, 'forms');
      }
    }
    
    if (!mappedData.phone && contactInfo.phone) {
      mappedData.phone = contactInfo.phone;
      if (options.logMappingProcess) {
        logger.info(`Extracted phone from raw data: ${contactInfo.phone}`, 'forms');
      }
    }
  }
  
  // Include raw data if requested
  if (options.includeRawData) {
    Object.keys(formData).forEach(fieldId => {
      const key = `raw_${fieldId}`;
      mappedData[key] = formData[fieldId];
    });
  }
  
  if (options.logMappingProcess) {
    logger.info(`Final mapped data: ${JSON.stringify(mappedData)}`, 'forms');
  }
  
  return mappedData;
};
