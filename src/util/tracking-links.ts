/**
 * Utility functions for generating and validating tracking links
 * that connect leads to bookings to invoices
 */

/**
 * Generate a tracking token for a lead
 * @param leadId The ID of the lead
 * @returns A tracking token that can be used in URLs
 */
export function generateTrackingToken(leadId: string): string {
  // Create a token that includes the lead ID and a timestamp
  // Format: leadId-timestamp
  const timestamp = Date.now();
  return `${leadId}-${timestamp}`;
}

/**
 * Extract the lead ID from a tracking token
 * @param token The tracking token
 * @returns The lead ID or null if invalid
 */
export function extractLeadIdFromToken(token: string): string | null {
  if (!token) return null;
  
  if (process.env.NODE_ENV !== 'production') {
    console.log('DEBUG - Extracting lead ID from token:', token);
  }
  
  // Token format: leadId-timestamp
  const parts = token.split('-');
  if (parts.length < 2) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('DEBUG - Invalid token format (needs at least one dash):', token);
    }
    return null;
  }
  
  // The lead ID is everything before the last dash
  const leadId = parts.slice(0, -1).join('-');
  if (process.env.NODE_ENV !== 'production') {
    console.log('DEBUG - Extracted lead ID:', leadId);
  }
  
  return leadId;
}

/**
 * Generate a booking link with tracking token
 * @param baseUrl The base URL of the application
 * @param formId The ID of the booking form
 * @param leadId The ID of the lead
 * @returns A complete booking URL with tracking token
 */
export function generateBookingLink(baseUrl: string, formId: string, leadId: string): string {
  const token = generateTrackingToken(leadId);
  return `${baseUrl}/forms/${formId}/view?tracking=${encodeURIComponent(token)}`;
}

/**
 * Parse tracking token from URL query parameters
 * @param query The URL query parameters
 * @returns The tracking token or null if not found
 */
export function parseTrackingTokenFromQuery(query: Record<string, string | string[] | undefined>): string | null {
  if (process.env.NODE_ENV !== 'production') {
    console.log('DEBUG - Parsing tracking token from query:', JSON.stringify(query));
  }
  
  const tracking = query.tracking;
  if (!tracking) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('DEBUG - No tracking parameter found in query');
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log('DEBUG - Available query parameters:', Object.keys(query));
    }
    return null;
  }
  
  const token = typeof tracking === 'string' ? tracking : tracking[0] || null;
  if (process.env.NODE_ENV !== 'production') {
    console.log('DEBUG - Found tracking token:', token);
  }
  
  return token;
}