/**
 * Mapping Service Types
 * 
 * This file contains type definitions for the mapping service.
 */

/**
 * Standard field names used across the system
 */
export interface StandardMappedFields {
  // Contact information
  email: string | null;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  
  // Booking information
  date: string | null;
  time: string | null;
  datetime: string | null;
  location: string | null;
  location_office: string | null;
  
  // Additional fields can be added as needed
  [key: string]: any;
}

/**
 * Field mapping configuration
 */
export interface FieldMapping {
  type?: string;
  value?: string;
}

/**
 * Result of contact information extraction
 */
export interface ContactInfoResult {
  email: string | null;
  name: string | null;
  phone: string | null;
}

/**
 * Field mapping strategy result
 */
export interface MappingStrategyResult {
  fieldId: string;
  mappedKey: string;
  value: any;
  strategy: string;
}

/**
 * Mapping options
 */
export interface MappingOptions {
  includeRawData?: boolean;
  strictMapping?: boolean;
  logMappingProcess?: boolean;
}
