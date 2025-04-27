/**
 * Field Mapping Utilities
 * 
 * This file provides utilities for mapping form field IDs to human-readable labels
 * and organizing them into logical sections.
 */

import { formatDate } from "@/util/date-format";

// Define the field mapping structure
export interface FieldMapping {
  id: string;
  label: string;
  section: string;
  type?: string;
}

// Define known field mappings
// This can be expanded as new forms are created
export const knownFieldMappings: Record<string, FieldMapping> = {
  // Common form fields with their cryptic IDs
  "cm9ts792f003wlfmddfvml5ix": { 
    id: "cm9ts792f003wlfmddfvml5ix", 
    label: "Appointment Date", 
    section: "Booking Details",
    type: "date"
  },
  "cm9ts76v4003qlfmd6yiweaij": { 
    id: "cm9ts76v4003qlfmd6yiweaij", 
    label: "Email Address", 
    section: "Contact Information",
    type: "email"
  },
  "cm9ts77kx003slfmd30ngpk7m": { 
    id: "cm9ts77kx003slfmd30ngpk7m", 
    label: "Phone Number", 
    section: "Contact Information",
    type: "tel"
  },
  "cm9ts79qr003ylfmd4fk2dgk2": { 
    id: "cm9ts79qr003ylfmd4fk2dgk2", 
    label: "Full Name", 
    section: "Contact Information",
    type: "text"
  },
  "cm9ts7bfk0042lfmd6834g4q6": { 
    id: "cm9ts7bfk0042lfmd6834g4q6", 
    label: "Preferred Name", 
    section: "Contact Information",
    type: "text"
  },
  "cm9ts7c820044lfmdpl9iijws": { 
    id: "cm9ts7c820044lfmdpl9iijws", 
    label: "Alternative Phone", 
    section: "Contact Information",
    type: "tel"
  }
};

// Define section order for display
export const sectionOrder = [
  "Contact Information",
  "Booking Details",
  "Service Information",
  "Additional Information"
];

/**
 * Gets field mapping for a given field ID
 * @param fieldId The field ID to get mapping for
 * @returns The field mapping or a generated one if not found
 */
export function getFieldMapping(fieldId: string): FieldMapping {
  // Return known mapping if available
  if (knownFieldMappings[fieldId]) {
    return knownFieldMappings[fieldId];
  }
  
  // Generate a mapping for unknown fields
  return {
    id: fieldId,
    label: formatFieldId(fieldId),
    section: categorizeField(fieldId)
  };
}

/**
 * Formats a field ID into a readable label
 * @param id The field ID to format
 * @returns A human-readable label
 */
export function formatFieldId(id: string): string {
  return id
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/_/g, ' ') // Replace underscores with spaces
    .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
    .replace(/Cm9ts\w+/g, '') // Remove cryptic IDs like Cm9ts...
    .trim();
}

/**
 * Categorizes a field ID into a section
 * @param id The field ID to categorize
 * @returns The section name
 */
export function categorizeField(id: string): string {
  const lowerCaseId = id.toLowerCase();
  
  // Contact information fields
  if (
    lowerCaseId.includes('name') || 
    lowerCaseId.includes('email') || 
    lowerCaseId.includes('phone') || 
    lowerCaseId.includes('contact') ||
    lowerCaseId.includes('address')
  ) {
    return "Contact Information";
  }
  
  // Booking details fields
  if (
    lowerCaseId.includes('date') || 
    lowerCaseId.includes('time') || 
    lowerCaseId.includes('location') || 
    lowerCaseId.includes('appointment')
  ) {
    return "Booking Details";
  }
  
  // Service information fields
  if (
    lowerCaseId.includes('service') || 
    lowerCaseId.includes('package') || 
    lowerCaseId.includes('product') ||
    lowerCaseId.includes('option')
  ) {
    return "Service Information";
  }
  
  return "Additional Information";
}

/**
 * Organizes form data into sections
 * @param formData The flat form data object
 * @returns An object with data organized by sections
 */
export function organizeFormDataBySections(formData: Record<string, any>): Record<string, any[]> {
  const organizedData: Record<string, any[]> = {};
  
  // Initialize sections
  sectionOrder.forEach(section => {
    organizedData[section] = [];
  });
  
  // Organize fields into sections
  Object.entries(formData).forEach(([fieldId, value]) => {
    // Skip empty values
    if (value === null || value === undefined || value === '') {
      return;
    }
    
    // Get mapping for this field
    const mapping = getFieldMapping(fieldId);
    
    // Add to the appropriate section
    if (!organizedData[mapping.section]) {
      organizedData[mapping.section] = [];
    }
    
    organizedData[mapping.section].push({
      id: fieldId,
      label: mapping.label,
      value,
      type: mapping.type
    });
  });
  
  // Remove empty sections
  Object.keys(organizedData).forEach(section => {
    if (organizedData[section].length === 0) {
      delete organizedData[section];
    }
  });
  
  return organizedData;
}

/**
 * Formats a field value based on its type
 * @param value The value to format
 * @param type Optional field type for specialized formatting
 * @returns The formatted value
 */
export function formatFieldValue(value: any, type?: string): any {
  if (value === null || value === undefined) {
    return 'Not provided';
  }
  
  // Format dates
  if (
    (type === 'date' || type === 'datetime') ||
    (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value))
  ) {
    try {
      return formatDate(value);
    } catch (e) {
      // If date parsing fails, keep the original value
    }
  }
  
  // Format arrays
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : '(Empty array)';
  }
  
  // Format objects
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    try {
      return JSON.stringify(value, null, 2);
    } catch (e) {
      return 'Complex object';
    }
  }
  
  // Format booleans
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  
  return value;
}
