/**
 * Helper functions for formatting values in templates
 */

/**
 * Formats a number or string as currency with $ symbol and 2 decimal places
 * @param value The value to format as currency
 * @returns Formatted currency string (e.g., "$123.45")
 */
export function formatCurrency(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '$0.00';
  }
  
  try {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return `$${numValue.toFixed(2)}`;
  } catch (error) {
    console.error('Error formatting currency value:', error);
    return '$0.00';
  }
}

/**
 * Formats a date string or Date object to a localized date string
 * @param date The date to format
 * @param format The format to use (default: 'DD/MM/YYYY')
 * @returns Formatted date string
 */
export function formatDate(date: string | Date | null | undefined, format: string = 'DD/MM/YYYY'): string {
  if (!date) {
    return '';
  }
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return '';
    }
    
    if (format === 'DD/MM/YYYY') {
      const day = dateObj.getDate().toString().padStart(2, '0');
      const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
      const year = dateObj.getFullYear();
      return `${day}/${month}/${year}`;
    }
    
    // Default to locale string if format not recognized
    return dateObj.toLocaleDateString();
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}