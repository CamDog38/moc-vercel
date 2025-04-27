import { format as formatFns, parseISO, isValid } from 'date-fns';

/**
 * Formats a date string into a readable format
 * @param dateString The date string to format
 * @param formatString Optional format string (defaults to 'PPP' - long date without time)
 * @returns Formatted date string or original string if invalid
 */
export const formatDate = (dateString: string, formatString = 'PPP'): string => {
  if (!dateString) return '';
  
  try {
    // Try to parse the date string
    const date = parseISO(dateString);
    
    // Check if the date is valid
    if (!isValid(date)) {
      return dateString;
    }
    
    // Format the date
    return formatFns(date, formatString);
  } catch (error) {
    // If any error occurs, return the original string
    console.warn('Error formatting date:', error);
    return dateString;
  }
}; 