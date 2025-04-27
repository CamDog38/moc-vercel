/**
 * DEPRECATED: Legacy Email Template Helpers (Forms 1.0)
 * 
 * This file is deprecated and will be removed in a future version.
 * Please use the Form System 2.0 variable replacement services instead:
 * - src/lib/forms2/services/email-processing/variableService2.ts
 */

import prisma from '@/lib/prisma';
import { EmailTemplateType, FormSubmission } from '@prisma/client';
import { addApiLog } from '../pages/api/debug/logs/index';
import path from 'path';
import { replaceVariables2 } from '@/lib/forms2/services/email-processing/variableService2';

// Standard logging header for file
const fileName = path.basename(__filename);
const fileVersion = '1.0 (DEPRECATED)';
console.log(`[FILE NAME] ${fileName}`);
console.log(`[${fileVersion} FILE]`);
console.log(`[DEPRECATED] This file is deprecated and will be removed in a future version.`);
console.log(`[DEPRECATED] Please use the Form System 2.0 variable replacement services instead.`);

/**
 * Checks if a word is likely to be a person's name
 */
function isLikelyName(word: string): boolean {
  if (!word || typeof word !== 'string') return false;
  const lowerWord = word.toLowerCase();
  const commonWords = [
    'at','in','on','the','a','an','and','or','but','for','with','about','from','to','by','yes','no','maybe','please','thank','thanks','hello','hi','hey','dear','sincerely','regards','best','office','location','address','phone','email','contact','website','our','your','my','their','his','her','its','we','they','i','you','he','she','it','this','that','these','those','here','there'
  ];
  if (commonWords.includes(lowerWord)) return false;
  if (word[0] !== word[0].toUpperCase()) return false;
  if (word.length < 2) return false;
  if (/[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(word)) return false;
  return true;
}

declare global {
  var __defaultBookingFormId: string | undefined;
}

let defaultBookingFormIdCache: string | null = null;
let defaultBookingFormLastFetch = 0;
const CACHE_TTL = 5 * 60 * 1000;

/**
 * DEPRECATED: Gets an email template by type for a specific user
 */
export async function getEmailTemplateByType(userId: string, type: EmailTemplateType) {
  console.log(`[DEPRECATED] Using legacy getEmailTemplateByType. Please migrate to Form System 2.0.`);
  console.log(`[EMAIL TEMPLATE] Fetching template of type: ${type} for user: ${userId}`);
  console.log(`[DATABASE] Querying EmailTemplate table for userId: ${userId}, type: ${type}`);
  
  try {
    const template = await prisma.emailTemplate.findFirst({ where: { userId, type } });
    
    if (template) {
      console.log(`[EMAIL TEMPLATE] Found template with ID: ${template.id}`);
      return template;
    }
    
    console.log(`[EMAIL TEMPLATE] No template found for type: ${type}`);
    return null;
  } catch (error) {
    console.error(`[ERROR] Error finding ${type} template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw new Error(`Error finding ${type} template: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * DEPRECATED: Gets any email template by type (not user-specific)
 */
export async function getAnyEmailTemplateByType(type: EmailTemplateType) {
  console.log(`[DEPRECATED] Using legacy getAnyEmailTemplateByType. Please migrate to Form System 2.0.`);
  console.log(`[EMAIL TEMPLATE] Fetching any template of type: ${type}`);
  console.log(`[DATABASE] Querying EmailTemplate table for type: ${type}`);
  
  try {
    const template = await prisma.emailTemplate.findFirst({ where: { type } });
    
    if (template) {
      console.log(`[EMAIL TEMPLATE] Found template with ID: ${template.id} for user: ${template.userId}`);
      return template;
    }
    
    console.log(`[EMAIL TEMPLATE] No template found for type: ${type}`);
    return null;
  } catch (error) {
    console.error(`[ERROR] Error finding any ${type} template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw new Error(`Error finding any ${type} template: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * DEPRECATED: Ensures an email template exists for a user, creating a default if needed
 */
export async function ensureEmailTemplate(userId: string, type: EmailTemplateType) {
  console.log(`[DEPRECATED] Using legacy ensureEmailTemplate. Please migrate to Form System 2.0.`);
  console.log(`[EMAIL TEMPLATE] Ensuring template of type: ${type} exists for user: ${userId}`);
  
  try {
    let template = await getEmailTemplateByType(userId, type);
    
    if (!template) {
      console.log(`[EMAIL TEMPLATE] Template not found, attempting to create default template`);
      
      if (type === 'INVOICE') {
        console.log(`[EMAIL TEMPLATE] Creating default INVOICE template for user: ${userId}`);
        const { ensureInvoiceTemplate } = require('../pages/api/emails/templates/ensure-invoice-template');
        await ensureInvoiceTemplate(userId);
      }
      
      console.log(`[EMAIL TEMPLATE] Checking if template was created successfully`);
      template = await getEmailTemplateByType(userId, type);
      
      if (template) {
        console.log(`[EMAIL TEMPLATE] Template created successfully with ID: ${template.id}`);
      } else {
        console.log(`[EMAIL TEMPLATE] Failed to create template`);
      }
    }
    
    return template;
  } catch (error) {
    console.error(`[ERROR] Error ensuring ${type} template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw new Error(`Error ensuring ${type} template: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * DEPRECATED: Gets the default booking form ID for a user
 */
export function getDefaultBookingFormId(userId: string): string {
  console.log(`[DEPRECATED] Using legacy getDefaultBookingFormId. Please migrate to Form System 2.0.`);
  
  // Check global cache first (for server-side)
  if (global.__defaultBookingFormId) {
    console.log(`[BOOKING FORM] Using global default booking form ID: ${global.__defaultBookingFormId}`);
    return global.__defaultBookingFormId;
  }
  
  // Check memory cache
  const now = Date.now();
  if (defaultBookingFormIdCache && (now - defaultBookingFormLastFetch < CACHE_TTL)) {
    console.log(`[BOOKING FORM] Using cached default booking form ID: ${defaultBookingFormIdCache}`);
    return defaultBookingFormIdCache;
  }
  
  // Trigger a refresh of the cache
  updateDefaultBookingFormIdCache(userId).catch(error => {
    console.error(`[ERROR] Failed to update default booking form ID cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
  });
  
  // Return the cached value (even if expired) or a fallback
  if (defaultBookingFormIdCache) {
    console.log(`[BOOKING FORM] Using expired cached default booking form ID: ${defaultBookingFormIdCache}`);
    return defaultBookingFormIdCache;
  }
  
  // Hard-coded fallback
  const fallbackId = '6442a7f9a5c3e0b1d8f9e8d7';
  console.log(`[BOOKING FORM] No default booking form ID found, using fallback: ${fallbackId}`);
  return fallbackId;
}

/**
 * DEPRECATED: Updates the default booking form ID cache
 */
export async function updateDefaultBookingFormIdCache(userId?: string): Promise<void> {
  console.log(`[DEPRECATED] Using legacy updateDefaultBookingFormIdCache. Please migrate to Form System 2.0.`);
  console.log(`[BOOKING FORM] Updating default booking form ID cache`);
  
  try {
    // Find the default booking form
    const defaultForm = await prisma.form.findFirst({
      where: {
        isDefaultBookingForm: true,
        ...(userId ? { userId } : {})
      }
    });
    
    if (defaultForm) {
      console.log(`[BOOKING FORM] Found default booking form with ID: ${defaultForm.id}`);
      
      // Update both caches
      defaultBookingFormIdCache = defaultForm.id;
      defaultBookingFormLastFetch = Date.now();
      global.__defaultBookingFormId = defaultForm.id;
      
      console.log(`[BOOKING FORM] Updated default booking form ID cache: ${defaultForm.id}`);
    } else {
      console.log(`[BOOKING FORM] No default booking form found`);
      
      // If no default form is found, don't update the cache
      // This way we keep using the previous value or fallback
    }
  } catch (error) {
    console.error(`[ERROR] Error updating default booking form ID cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
    // Don't throw, just log the error
  }
}

/**
 * Interface for normalized email data
 */
export interface NormalizedEmailData {
  timeStamp: string;
  trackingToken?: string;
  leadId?: string;
  formData: Record<string, any>;
  bookingLink?: string;
  bookingFormId?: string;
  userId?: string;
}

/**
 * DEPRECATED: Replaces variables in a text with values from data
 */
export function replaceVariables(text: string, data: Record<string, any>): string {
  console.log(`[DEPRECATED] Using legacy replaceVariables. Please migrate to Form System 2.0.`);
  
  // Use the new Form System 2.0 variable replacement service
  return replaceVariables2(text, data);
}
