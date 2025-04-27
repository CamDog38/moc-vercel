/**
 * Utility functions for formatting form field IDs and values
 */
import { formatFieldId as formatFieldIdUtil } from "@/lib/bookings/utils/fieldMapping";

/**
 * Format a field ID into a readable label
 * @param id The field ID to format
 * @param formType The type of form (booking, lead, etc.)
 * @returns A formatted label for the field
 */
export function formatFieldId(id: string, formType: 'booking' | 'lead' = 'booking'): string {
  // First use the utility function from fieldMapping
  let formatted = formatFieldIdUtil(id);
  
  // Remove cryptic IDs
  formatted = formatted.replace(/Cm9[a-z0-9]+/g, '');
  
  // Extract section prefix if present (specific to booking forms)
  if (formType === 'booking') {
    const sectionPrefixes = [
      'partner_1_details_',
      'partner_2_details_',
      'wedding_details_',
      'witness_1_details_',
      'witness_2_details_',
      'how_did_you_hear_about_us_'
    ];
    
    // Remove section prefix if present
    for (const prefix of sectionPrefixes) {
      if (id.includes(prefix)) {
        formatted = id.replace(prefix, '');
        break;
      }
    }
  }
  
  // Remove common prefixes (applicable to all form types)
  formatted = formatted.replace(/^(inquiry_form_|form_|field_|input_|select_|checkbox_|radio_|textarea_|file_|date_|time_|email_|phone_|tel_|url_|name_)/i, '');
  
  // Replace underscores and hyphens with spaces
  formatted = formatted.replace(/[_-]/g, ' ');
  
  // Handle common field names with special formatting
  const commonSpecialCases: Record<string, string> = {
    'first name': 'First Name',
    'last name': 'Last Name',
    'email': 'Email',
    'email address': 'Email Address',
    'phone': 'Phone',
    'phone number': 'Phone Number',
    'address': 'Address',
    'city': 'City',
    'state': 'State',
    'zip': 'ZIP',
    'zip code': 'ZIP Code',
    'country': 'Country',
    'message': 'Message',
    'comments': 'Comments',
    'notes': 'Notes'
  };
  
  // Booking-specific special cases
  const bookingSpecialCases: Record<string, string> = {
    'id number south african citizens only': 'ID Number (SA Citizens)',
    'if not a south african citizen passport number country': 'Passport Number (Non-SA)',
    'date of birth': 'Date of Birth',
    'country of birth': 'Country of Birth',
    'choice of surname': 'Choice of Surname',
    'current residential address': 'Residential Address',
    'date time of wedding': 'Date & Time of Wedding',
    'if you are getting married at a specific venue please include the name below': 'Venue Name',
    'venue contact person': 'Venue Contact Person',
    'venue contact person s phone number': 'Venue Contact Phone',
    'if you are being registered at our offices which office would you like to attend': 'Office Location',
    'how did you hear about us': 'How did you hear about us?',
    'id passport number': 'ID/Passport Number',
    'middle name': 'Middle Name',
    'maiden name': 'Maiden Name',
    'marital status': 'Marital Status',
    'gender': 'Gender',
    'occupation': 'Occupation'
  };
  
  // Combine special cases based on form type
  const specialCases = {
    ...commonSpecialCases,
    ...(formType === 'booking' ? bookingSpecialCases : {})
  };
  
  // Check if we have a special case for this field
  const lowerFormatted = formatted.toLowerCase();
  if (specialCases[lowerFormatted]) {
    return specialCases[lowerFormatted];
  }
  
  // Title case the result
  formatted = formatted.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  return formatted.trim() || 'Unnamed Field';
}

/**
 * Determine the type of a field based on its ID and value
 * @param key The field ID
 * @param value The field value
 * @returns The field type or undefined
 */
export function getFieldType(key: string, value: any): string | undefined {
  // Check for email fields
  if (
    key.includes('email') || 
    (typeof value === 'string' && value.includes('@') && value.includes('.'))
  ) {
    return 'email';
  }
  
  // Check for phone fields
  if (
    key.includes('phone') || 
    key.includes('tel') || 
    (typeof value === 'string' && /^[+\d\s()-]{7,}$/.test(value))
  ) {
    return 'tel';
  }
  
  // Check for date fields
  if (
    key.includes('date') || 
    key.includes('dob') || 
    key.includes('birth') ||
    (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value))
  ) {
    return 'date';
  }
  
  // Check for URL fields
  if (
    key.includes('url') || 
    key.includes('website') || 
    (typeof value === 'string' && /^https?:\/\//.test(value))
  ) {
    return 'url';
  }
  
  // Check for boolean fields
  if (typeof value === 'boolean') {
    return 'boolean';
  }
  
  // Check for number fields
  if (typeof value === 'number') {
    return 'number';
  }
  
  return undefined;
}

/**
 * Format a field value based on its type
 * @param value The field value
 * @param type The field type
 * @returns The formatted value
 */
export function formatFieldValue(value: any, type?: string): any {
  if (value === null || value === undefined) {
    return '';
  }
  
  // Handle objects with a value property
  if (typeof value === 'object' && value !== null && 'value' in value) {
    return formatFieldValue(value.value, type);
  }
  
  // Format based on type
  switch (type) {
    case 'date':
      // Format date strings
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
        try {
          const date = new Date(value);
          return date.toLocaleDateString();
        } catch (e) {
          return value;
        }
      }
      return value;
      
    case 'boolean':
      return value ? 'Yes' : 'No';
      
    case 'option':
      // Clean up option values
      if (typeof value === 'string') {
        // Remove any leading/trailing quotes
        value = value.replace(/^["']|["']$/g, '');
        
        // Replace underscores and hyphens with spaces
        value = value.replace(/[_-]/g, ' ');
        
        // Title case the result
        value = value.split(' ')
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      }
      return value;
      
    default:
      return value;
  }
}
