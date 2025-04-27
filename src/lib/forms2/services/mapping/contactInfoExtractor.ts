/**
 * Contact Information Extractor
 * 
 * This file contains utilities for extracting contact information from form data.
 */

import * as logger from '@/util/logger';
import { isValidEmail } from '@/util/validation';
import { ContactInfoResult } from './types';

/**
 * Attempts to extract email, name, and phone directly from form data
 * This is a fallback mechanism when explicit mapping fails
 * 
 * @param formData The raw form data
 * @returns Extracted data with email, name, and phone
 */
export const extractContactInfo = (
  formData: Record<string, any>
): ContactInfoResult => {
  let foundEmail: string | null = null;
  let foundName: string | null = null;
  let foundPhone: string | null = null;
  
  // Also track first and last name separately in case we need to combine them
  let foundFirstName: string | null = null;
  let foundLastName: string | null = null;
  
  logger.info(`Attempting to extract contact info from raw form data`, 'forms');
  
  // First pass: look for fields with obvious names
  Object.entries(formData).forEach(([key, value]) => {
    if (!value || typeof value !== 'string') return;
    
    const lowerKey = key.toLowerCase();
    
    // Look for name in key
    if (!foundName && (
        lowerKey === 'name' ||
        lowerKey === 'fullname' ||
        lowerKey === 'full_name' ||
        lowerKey === 'full-name' ||
        (lowerKey.includes('name') && !lowerKey.includes('first') && !lowerKey.includes('last'))
      )) {
      foundName = value;
      logger.info(`Found potential name in field ${key}: ${value}`, 'forms');
    }
    
    // Look for first name in key
    if (!foundFirstName && (
        lowerKey === 'firstname' ||
        lowerKey === 'first_name' ||
        lowerKey === 'first-name' ||
        (lowerKey.includes('first') && lowerKey.includes('name'))
      )) {
      foundFirstName = value;
      logger.info(`Found potential first name in field ${key}: ${value}`, 'forms');
    }
    
    // Look for last name in key
    if (!foundLastName && (
        lowerKey === 'lastname' ||
        lowerKey === 'last_name' ||
        lowerKey === 'last-name' ||
        (lowerKey.includes('last') && lowerKey.includes('name') && !lowerKey.includes('first'))
      )) {
      foundLastName = value;
      logger.info(`Found potential last name in field ${key}: ${value}`, 'forms');
    }
    
    // Combine first and last name if both are found
    if (!foundName && foundFirstName && foundLastName) {
      foundName = `${foundFirstName} ${foundLastName}`;
      logger.info(`Combined first and last name: ${foundName}`, 'forms');
    } else if (!foundName && foundFirstName) {
      foundName = foundFirstName;
      logger.info(`Using first name as full name: ${foundName}`, 'forms');
    } else if (!foundName && foundLastName) {
      foundName = foundLastName;
      logger.info(`Using last name as full name: ${foundName}`, 'forms');
    }
    
    // Check for email pattern in key and value
    if (!foundEmail && (
        lowerKey.includes('email') || 
        lowerKey.includes('mail')
      ) && value.includes('@') && value.includes('.')) {
      foundEmail = value;
      logger.info(`Found potential email in field ${key}: ${value}`, 'forms');
    }
    
    // Look for phone pattern in key and value
    if (!foundPhone && (
        lowerKey.includes('phone') || 
        lowerKey.includes('tel') || 
        lowerKey.includes('mobile')
      ) && /^[\d\s\+\-\(\)]{7,}$/.test(value)) {
      foundPhone = value;
      logger.info(`Found potential phone in field ${key}: ${value}`, 'forms');
    }
  });
  
  // Second pass: look for values that match patterns if we haven't found them yet
  if (!foundEmail || !foundName || !foundPhone) {
    Object.entries(formData).forEach(([key, value]) => {
      if (!value || typeof value !== 'string') return;
      
      // Check for email pattern with better validation
      if (!foundEmail && isValidEmail(value)) {
        foundEmail = value;
        logger.info(`Found potential email in field ${key}: ${value}`, 'forms');
      }
      
      // Look for phone pattern (numbers with some separators)
      if (!foundPhone && /^[\d\s\+\-\(\)]{7,}$/.test(value)) {
        foundPhone = value;
        logger.info(`Found potential phone in field ${key}: ${value}`, 'forms');
      }
      
      // Name detection - more aggressive in second pass
      if (!foundName) {
        // Check if it looks like a name with more sophisticated pattern matching
        // Names typically have spaces between first and last name, contain alphabetic characters,
        // may have apostrophes or hyphens, and are not too long
        if (typeof value === 'string' && value.trim() !== '') {
          // Check for a typical full name pattern (first and last name with space)
          if (value.includes(' ') && value.length < 50 && 
              /^[A-Za-z\s\.'\-]+$/.test(value) && 
              !/^[\d\s\+\-\(\)]+$/.test(value) &&
              !value.includes('@')) {
            foundName = value;
            logger.info(`Found potential full name in field ${key}: ${value}`, 'forms');
          }
          // Check for single name (first name only)
          else if (value.length > 1 && value.length < 30 && 
                  /^[A-Za-z\.'\-]+$/.test(value) &&
                  !value.includes('@') && 
                  !/^[\d\s\+\-\(\)]+$/.test(value)) {
            foundName = value;
            logger.info(`Found potential single name in field ${key}: ${value}`, 'forms');
          }
          // Check for name patterns with titles (Mr., Mrs., Dr., etc.)
          else if (value.length < 50 && 
                  /^(Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.)\s[A-Za-z\s\.'\-]+$/.test(value)) {
            foundName = value;
            logger.info(`Found potential name with title in field ${key}: ${value}`, 'forms');
          }
        }
      }
    });
  }
  
  return { email: foundEmail, name: foundName, phone: foundPhone };
};
