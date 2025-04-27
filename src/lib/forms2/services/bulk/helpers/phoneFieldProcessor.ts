/**
 * Phone Field Processor
 * 
 * Helper functions for processing and validating phone fields in form submissions
 */

import * as logger from '@/util/logger';

/**
 * Validates and processes a phone field to ensure it's not a date
 * and finds a better match if needed
 * 
 * @param phone The potential phone number to validate
 * @param formData The complete form data to search for alternatives
 * @returns A validated phone number or null
 */
export function processPhoneField(phone: string | null | undefined, formData: Record<string, any>): string | null {
  // Always start by looking for a phone field in the form data
  // This is more reliable than using the mapped phone field
  const bestPhoneMatch = findPhoneInFormData(formData);
  if (bestPhoneMatch) {
    console.log(`[LEAD SERVICE] Found best phone match: "${bestPhoneMatch}"`);
    return bestPhoneMatch;
  }
  
  // If we couldn't find a better match, check if the provided phone is valid
  if (!phone) {
    return null;
  }

  // Check if the phone field looks like a date
  if (phone && typeof phone === 'string') {
    const isLikelyDate = 
      // Common date formats
      /^\d{4}-\d{1,2}-\d{1,2}/.test(phone) || // ISO date format (YYYY-MM-DD)
      /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(phone) || // MM/DD/YYYY or DD/MM/YYYY
      /^\d{4}$/.test(phone) || // Just a year
      /^\d{1,2}-[A-Za-z]{3}-\d{4}$/.test(phone) || // DD-MMM-YYYY format (01-Jan-2025)
      /^[A-Za-z]{3} \d{1,2}, \d{4}$/.test(phone) || // MMM DD, YYYY format (Jan 01, 2025)
      /^\d{1,2} [A-Za-z]{3} \d{4}$/.test(phone) || // DD MMM YYYY format (01 Jan 2025)
      /^\d{1,2}\s?[A-Za-z]+\s?\d{4}$/.test(phone) || // 1Jan2025 or 1 Jan 2025
      /^\d{1,2}\.\d{1,2}\.\d{2,4}$/.test(phone) || // DD.MM.YYYY format
      /^\d{8}$/.test(phone) && (phone.startsWith('20') || phone.startsWith('19')); // YYYYMMDD format
    
    // Additional checks for dates that might look like phone numbers
    const hasDateIndicators = 
      phone.includes('202') || // Years 2020-2029
      phone.includes('203') || // Years 2030-2039
      phone.includes('jan') || phone.includes('feb') || 
      phone.includes('mar') || phone.includes('apr') || 
      phone.includes('may') || phone.includes('jun') || 
      phone.includes('jul') || phone.includes('aug') || 
      phone.includes('sep') || phone.includes('oct') || 
      phone.includes('nov') || phone.includes('dec');
    
    if (isLikelyDate || hasDateIndicators) {
      console.log(`[LEAD SERVICE] Phone field appears to be a date: "${phone}". Rejecting this value.`);
      logger.info(`Phone field appears to be a date: "${phone}". Rejecting this value.`, 'forms');
      return null;
    }
    
    // Check if it actually looks like a phone number
    const hasPhoneIndicators = 
      phone.includes('(') || 
      phone.includes(')') || 
      phone.includes('+') || 
      /\d{3}[\s\-]?\d{3}[\s\-]?\d{4}/.test(phone); // Common US format
    
    if (!hasPhoneIndicators && phone.length < 10) {
      console.log(`[LEAD SERVICE] Value doesn't look like a valid phone number: "${phone}". Rejecting this value.`);
      return null;
    }
  }
  
  return phone;
}

/**
 * Searches through form data to find a field that looks like a phone number
 * 
 * @param formData The form data to search through
 * @returns A phone number or null if none found
 */
export function findPhoneInFormData(formData: Record<string, any>): string | null {
  // Create a scoring system for phone number candidates
  const candidates: Array<{key: string, value: string, score: number}> = [];
  
  // First pass: look for fields with explicit phone-related names
  for (const [key, value] of Object.entries(formData)) {
    if (!value || typeof value !== 'string') continue;
    
    const lowerKey = key.toLowerCase();
    let score = 0;
    
    // Skip fields with date-related names
    if (lowerKey.includes('date') || lowerKey.includes('time') || lowerKey.includes('year') || 
        lowerKey.includes('month') || lowerKey.includes('day')) {
      continue;
    }
    
    // Prioritize fields with explicit phone indicators
    if (lowerKey.includes('phone')) score += 50;
    if (lowerKey.includes('mobile')) score += 40;
    if (lowerKey.includes('cell')) score += 40;
    if (lowerKey.includes('tel')) score += 30;
    if (lowerKey.includes('contact')) score += 20;
    
    // Check value format
    const valueStr = value.toString();
    
    // Reject date formats immediately
    const isLikelyDate = 
      /^\d{4}-\d{1,2}-\d{1,2}/.test(valueStr) || // ISO date format
      /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(valueStr) || // MM/DD/YYYY
      /^\d{4}$/.test(valueStr) || // Just a year
      valueStr.includes('202') || // Years 2020-2029
      valueStr.includes('203'); // Years 2030-2039
    
    if (isLikelyDate) {
      continue; // Skip date-like values
    }
    
    // Check for phone number patterns
    if (valueStr.includes('(') && valueStr.includes(')')) score += 30; // Parentheses
    if (valueStr.includes('+')) score += 25; // International format
    if (/\d{3}[\s\-]?\d{3}[\s\-]?\d{4}/.test(valueStr)) score += 35; // Common format
    if (/^[\d\s\+\-\(\)]{7,}$/.test(valueStr)) score += 20; // Contains only phone chars
    
    // Length checks
    if (valueStr.replace(/[^\d]/g, '').length >= 10) score += 15; // Has enough digits
    if (valueStr.replace(/[^\d]/g, '').length <= 15) score += 10; // Not too many digits
    
    // Add to candidates if it has a minimum score
    if (score > 0) {
      candidates.push({ key, value: valueStr, score });
    }
  }
  
  // Sort candidates by score (highest first)
  candidates.sort((a, b) => b.score - a.score);
  
  // Return the highest scoring candidate if available
  if (candidates.length > 0) {
    const bestMatch = candidates[0];
    console.log(`[LEAD SERVICE] Found best phone match in ${bestMatch.key}: "${bestMatch.value}" (score: ${bestMatch.score})`);
    logger.info(`Found best phone match in ${bestMatch.key}: "${bestMatch.value}" (score: ${bestMatch.score})`, 'forms');
    return bestMatch.value;
  }
  
  return null;
}
