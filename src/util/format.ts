/**
 * Format a number as currency (ZAR)
 * @param amount The amount to format
 * @param currencySymbol The currency symbol to use (defaults to R)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number | string | null | undefined, currencySymbol = 'R'): string {
  if (amount === null || amount === undefined) return `${currencySymbol}0.00`;
  
  // Convert to number if it's a string
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Handle NaN
  if (isNaN(numericAmount)) return `${currencySymbol}0.00`;
  
  // Format with 2 decimal places
  return `${currencySymbol}${numericAmount.toFixed(2)}`;
}

/**
 * Format a date string to a localized date string
 * @param dateString The date string to format
 * @returns Formatted date string
 */
export function formatDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return 'N/A';
  
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString();
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
}

/**
 * Format a date string to a localized date and time string
 * @param dateString The date string to format
 * @returns Formatted date and time string
 */
export function formatDateTime(dateString: string | Date | null | undefined): string {
  if (!dateString) return 'N/A';
  
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString() + ' ' + 
      date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  } catch (error) {
    console.error('Error formatting date and time:', error);
    return 'Invalid date';
  }
}

/**
 * Format a service type string to be more readable
 * @param serviceType The service type string to format
 * @returns Formatted service type string
 */
export function formatServiceType(serviceType: string | null | undefined): string {
  if (!serviceType) return '';
  
  // Check if it's a known service type with a display name from DEFAULT_SERVICE_TYPES
  // This would need to be imported from wherever DEFAULT_SERVICE_TYPES is defined
  // For now, we'll just format it nicely
  
  return serviceType
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}