import prisma from '@/lib/prisma';
import { EmailTemplateType, FormSubmission } from '@prisma/client';
import { addApiLog } from '../pages/api/debug/logs/index';
import path from 'path';

// Standard logging header for file
const fileName = path.basename(__filename);
const fileVersion = '1.0';
console.log(`[FILE NAME] ${fileName}`);
console.log(`[${fileVersion} FILE]`);

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

export async function getEmailTemplateByType(userId: string, type: EmailTemplateType) {
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

export async function getAnyEmailTemplateByType(type: EmailTemplateType) {
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

export async function ensureEmailTemplate(userId: string, type: EmailTemplateType) {
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
        console.log(`[EMAIL TEMPLATE] Successfully created template with ID: ${template.id}`);
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

export function getDefaultBookingFormId(userId: string): string {
  console.log(`[BOOKING FORM] Getting default booking form ID for user: ${userId}`);
  
  try {
    if (global.__defaultBookingFormId) {
      console.log(`[BOOKING FORM] Using global default booking form ID: ${global.__defaultBookingFormId}`);
      return global.__defaultBookingFormId;
    }
    
    if (defaultBookingFormIdCache) {
      console.log(`[BOOKING FORM] Using cached default booking form ID: ${defaultBookingFormIdCache}`);
      return defaultBookingFormIdCache;
    }
    
    const hardcodedDefaultId = 'cm8smo5r4008ucq3z5uau87d4';
    console.log(`[BOOKING FORM] Using hardcoded default booking form ID: ${hardcodedDefaultId}`);
    
    defaultBookingFormIdCache = hardcodedDefaultId;
    global.__defaultBookingFormId = hardcodedDefaultId;
    
    console.log(`[BOOKING FORM] Updating default booking form ID cache in background`);
    updateDefaultBookingFormIdCache(userId).catch((error) => {
      console.error(`[ERROR] Failed to update default booking form ID cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
    });
    
    return hardcodedDefaultId;
  } catch (error) {
    console.error(`[ERROR] Error getting default booking form ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return 'cm8smo5r4008ucq3z5uau87d4';
  }
}

async function updateDefaultBookingFormIdCache(userId?: string): Promise<void> {
  console.log(`[BOOKING FORM] Updating default booking form ID cache${userId ? ` for user: ${userId}` : ''}`);
  
  try {
    console.log(`[DATABASE] Checking system settings for default booking form ID`);
    const settings = await prisma.systemSettings.findUnique({ where: { key: 'defaultBookingFormId' } });
    
    if (settings?.value) {
      console.log(`[BOOKING FORM] Found default booking form ID in system settings: ${settings.value}`);
      defaultBookingFormIdCache = settings.value;
      defaultBookingFormLastFetch = Date.now();
      global.__defaultBookingFormId = settings.value;
      return;
    }
    
    if (userId) {
      console.log(`[DATABASE] Looking for active booking form for user: ${userId}`);
      const bookingForm = await prisma.form.findFirst({ where: { type: 'BOOKING', isActive: true, userId } });
      
      if (bookingForm) {
        console.log(`[BOOKING FORM] Found active booking form with ID: ${bookingForm.id}`);
        defaultBookingFormIdCache = bookingForm.id;
        defaultBookingFormLastFetch = Date.now();
        global.__defaultBookingFormId = bookingForm.id;
        return;
      } else {
        console.log(`[BOOKING FORM] No active booking form found for user: ${userId}`);
      }
    }
    
    console.log(`[BOOKING FORM] No default booking form ID found, clearing cache`);
    defaultBookingFormIdCache = null;
    defaultBookingFormLastFetch = Date.now();
  } catch (error) {
    console.error(`[ERROR] Error updating default booking form ID cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}


interface NormalizedEmailData {
  timeStamp: string;
  trackingToken?: string;
  leadId?: string;
  formData: Record<string, any>;
  bookingLink?: string;
  bookingFormId?: string;
  userId?: string;
  [key: string]: any;
}

export function replaceVariables(text: string, data: Record<string, any>): string {
  console.log(`[EMAIL TEMPLATE] Replacing variables in template text`);
  if (!text) return '';
  
  try {
    // Import debug utility if needed
    let debugVariableReplacement: any;
    try {
      debugVariableReplacement = require('./debug-variable-replacement').debugVariableReplacement;
    } catch (e) {
      // Debug utility not available, continue without it
    }

    // Log the data structure for debugging
    addApiLog(`Variable replacement data structure: ${JSON.stringify({
      hasName: !!data.name,
      nameType: data.name ? typeof data.name : 'undefined',
      hasSubmission: !!data.submission,
      hasFormSubmission: !!data.formSubmission,
      hasFormData: !!data.formData,
      topLevelKeys: Object.keys(data),
      submissionDataKeys: data.submission?.data ? Object.keys(data.submission.data) : []  
    })}`, 'info', 'emails');

    // Extract timeStamp from various sources
    let timeStampValue = data.timeStamp;
    if (!timeStampValue && data.submission) {
      if (data.submission.timeStamp !== undefined) {
        timeStampValue = data.submission.timeStamp;
        addApiLog(`Using timeStamp from submission: ${timeStampValue}`, 'info', 'emails');
      }
      else if (data.submission.createdAt) {
        if (data.submission.createdAt instanceof Date) {
          timeStampValue = data.submission.createdAt.getTime().toString();
          addApiLog(`Using timeStamp from submission.createdAt Date: ${timeStampValue}`, 'info', 'emails');
        }
        else if (typeof data.submission.createdAt === 'string') {
          try { 
            timeStampValue = new Date(data.submission.createdAt).getTime().toString(); 
            addApiLog(`Using timeStamp from submission.createdAt string: ${timeStampValue}`, 'info', 'emails');
          }
          catch { 
            timeStampValue = data.submission.createdAt; 
            addApiLog(`Using submission.createdAt directly as timeStamp: ${timeStampValue}`, 'info', 'emails');
          }
        }
      }
    }
    if (!timeStampValue && data.formSubmission) {
      if (data.formSubmission.timeStamp !== undefined) {
        timeStampValue = data.formSubmission.timeStamp;
        addApiLog(`Using timeStamp from formSubmission: ${timeStampValue}`, 'info', 'emails');
      }
      else if (data.formSubmission.createdAt) {
        if (data.formSubmission.createdAt instanceof Date) {
          timeStampValue = data.formSubmission.createdAt.getTime().toString();
          addApiLog(`Using timeStamp from formSubmission.createdAt Date: ${timeStampValue}`, 'info', 'emails');
        }
        else if (typeof data.formSubmission.createdAt === 'string') {
          try { 
            timeStampValue = new Date(data.formSubmission.createdAt).getTime().toString(); 
            addApiLog(`Using timeStamp from formSubmission.createdAt string: ${timeStampValue}`, 'info', 'emails');
          }
          catch { 
            timeStampValue = data.formSubmission.createdAt; 
            addApiLog(`Using formSubmission.createdAt directly as timeStamp: ${timeStampValue}`, 'info', 'emails');
          }
        }
      }
    }
    if (!timeStampValue) {
      timeStampValue = Date.now().toString();
      addApiLog(`Generated new timeStamp: ${timeStampValue}`, 'info', 'emails');
    }

    // Create a normalized data object that combines all data sources
    console.log(`[EMAIL TEMPLATE] Normalizing data for variable replacement`);
    const normalizedData: NormalizedEmailData = {
      ...data,
      timeStamp: timeStampValue,
      trackingToken: data.trackingToken || data.submission?.trackingToken || data.formSubmission?.trackingToken,
      leadId: data.leadId || data.submission?.leadId || data.formSubmission?.leadId,
      formData: {
        ...(data.formData || {}),
        ...(data.submission?.data || {}),
        ...(data.formSubmission?.data || {})
      }
    };
    
    console.log(`[EMAIL TEMPLATE] Setting timestamp: ${normalizedData.timeStamp}`);

    // IMPORTANT: Flatten submission data to top level for direct access
    // This is critical for templates that use {{fieldName}} instead of {{submission.data.fieldName}}
    if (data.submission?.data && typeof data.submission.data === 'object') {
      addApiLog(`Flattening submission data to top level, keys: ${Object.keys(data.submission.data).join(', ')}`, 'info', 'emails');
      Object.entries(data.submission.data).forEach(([key, value]) => {
        normalizedData[key] = value;
        // Extract firstName from name fields
        if (key.toLowerCase() === 'name' || key.toLowerCase() === 'fullname') {
          const parts = String(value).split(' ');
          if (parts.length > 0 && isLikelyName(parts[0])) {
            normalizedData.firstName = parts[0];
            addApiLog(`Extracted firstName '${parts[0]}' from submission.data.${key}`, 'info', 'emails');
          }
        }
      });
    }

    // Extract firstName from name field if not already set
    if (!normalizedData.firstName && typeof normalizedData.name === 'string') {
      const parts = normalizedData.name.split(' ');
      if (parts.length > 0 && isLikelyName(parts[0])) {
        normalizedData.firstName = parts[0];
        addApiLog(`Extracted firstName '${parts[0]}' from top-level name field`, 'info', 'emails');
      }
    }

    // Try other common firstName sources
    if (!normalizedData.firstName) {
      if (normalizedData.formData.firstName) {
        normalizedData.firstName = normalizedData.formData.firstName;
        addApiLog(`Using firstName directly from formData: ${normalizedData.firstName}`, 'info', 'emails');
      }
      else if (normalizedData.formData.first_name) {
        normalizedData.firstName = normalizedData.formData.first_name;
        addApiLog(`Using first_name from formData: ${normalizedData.firstName}`, 'info', 'emails');
      }
      else if (normalizedData.formData.name) {
        const parts = String(normalizedData.formData.name).split(' ');
        if (parts.length > 0 && isLikelyName(parts[0])) {
          normalizedData.firstName = parts[0];
          addApiLog(`Extracted firstName from formData.name: ${normalizedData.firstName}`, 'info', 'emails');
        }
      }
    }

    // Default firstName if still not found
    if (!normalizedData.firstName) {
      normalizedData.firstName = 'Customer';
      addApiLog(`Using default firstName: 'Customer'`, 'info', 'emails');
    }

    // Process conditional sections first
    const conditionalRegex = /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
    let processedText = text;
    let match;
    while ((match = conditionalRegex.exec(text)) !== null) {
      const [fullMatch, condition, content] = match;
      let conditionValue;
      
      // Check condition in different data sources
      if (normalizedData[condition] !== undefined) {
        conditionValue = normalizedData[condition];
        addApiLog(`Condition '${condition}' found in top level data: ${conditionValue}`, 'info', 'emails');
      }
      else if (normalizedData.formData[condition] !== undefined) {
        conditionValue = normalizedData.formData[condition];
        addApiLog(`Condition '${condition}' found in formData: ${conditionValue}`, 'info', 'emails');
      }
      else if (condition.includes('.')) {
        // Handle nested conditions
        const parts = condition.split('.');
        let value = normalizedData;
        let found = true;
        for (const part of parts) {
          if (value && typeof value === 'object' && part in value) {
            value = value[part];
          } else { 
            found = false; 
            break; 
          }
        }
        if (found) {
          conditionValue = value;
          addApiLog(`Nested condition '${condition}' found: ${conditionValue}`, 'info', 'emails');
        }
      }
      
      // Replace the conditional section based on condition value
      processedText = processedText.replace(fullMatch, conditionValue ? content : '');
      addApiLog(`Conditional section '${condition}' ${conditionValue ? 'included' : 'excluded'}`, 'info', 'emails');
    }

    // Use debug utility if available
    if (debugVariableReplacement) {
      debugVariableReplacement(processedText, normalizedData, 'Pre-replacement');
    }

    // Replace all variables in the text
    const result = processedText.replace(/\{\{([^}]+)\}\}/g, (match, variableName) => {
      // Skip conditional variables that were already processed
      if (variableName.startsWith('#if') || variableName === '/if') return '';
      
      // Trim the variable name
      variableName = variableName.trim();
      let value;

      // Handle nested variables (e.g., {{submission.data.fieldName}})
      if (variableName.includes('.')) {
        const parts = variableName.split('.');
        value = normalizedData;
        for (const part of parts) {
          if (value && typeof value === 'object' && part in value) {
            value = value[part];
          } else { 
            value = undefined; 
            break; 
          }
        }
        if (value !== undefined && value !== null) {
          addApiLog(`Replaced nested variable {{${variableName}}} with: ${String(value)}`, 'success', 'emails');
          return String(value);
        }
      }

      // Handle field_ prefixed variables
      if (variableName.startsWith('field_')) {
        const fieldName = variableName.substring(6);
        value = normalizedData.formData[fieldName];
        if (value !== undefined) {
          addApiLog(`Replaced field variable {{${variableName}}} with: ${String(value)}`, 'success', 'emails');
          return String(value);
        }
      }

      // Handle special variables
      if (variableName === 'timeStamp') {
        addApiLog(`Replaced {{timeStamp}} with: ${normalizedData.timeStamp}`, 'success', 'emails');
        return normalizedData.timeStamp || '';
      }
      if (variableName === 'trackingToken') {
        addApiLog(`Replaced {{trackingToken}} with: ${normalizedData.trackingToken || ''}`, 'success', 'emails');
        return normalizedData.trackingToken || '';
      }
      if (variableName === 'leadId') {
        addApiLog(`Replaced {{leadId}} with: ${normalizedData.leadId || ''}`, 'success', 'emails');
        return normalizedData.leadId || '';
      }
      if (variableName === 'bookingLink' && normalizedData.leadId) {
        addApiLog(`Replaced {{bookingLink}} with placeholder`, 'success', 'emails');
        return '[Booking Link Generation Disabled in Emails]';
      }

      // Check in formData
      if (normalizedData.formData[variableName] !== undefined) {
        addApiLog(`Replaced {{${variableName}}} from formData with: ${String(normalizedData.formData[variableName])}`, 'success', 'emails');
        return String(normalizedData.formData[variableName]);
      }
      
      // Check in top-level data
      if (normalizedData[variableName] !== undefined) {
        addApiLog(`Replaced {{${variableName}}} from top-level with: ${String(normalizedData[variableName])}`, 'success', 'emails');
        return String(normalizedData[variableName]);
      }
      
      // Check in original submission data
      if (data.submission?.data?.[variableName] !== undefined) {
        addApiLog(`Replaced {{${variableName}}} from original submission.data with: ${String(data.submission.data[variableName])}`, 'success', 'emails');
        return String(data.submission.data[variableName]);
      }

      // Check for field IDs in submission data
      if (data.submission?.data) {
        const fieldIdPattern = /^[a-z0-9]{24,}$/;
        for (const [key, fieldValue] of Object.entries(data.submission.data)) {
          if (fieldIdPattern.test(key)) {
            // Check if this is a field object with a matching name
            if (typeof fieldValue === 'object' && fieldValue !== null && 'name' in fieldValue && fieldValue.name === variableName) {
              if ('value' in fieldValue && fieldValue.value !== undefined && fieldValue.value !== null) {
                addApiLog(`Replaced {{${variableName}}} from field object with: ${String(fieldValue.value)}`, 'success', 'emails');
                return String(fieldValue.value);
              } else {
                addApiLog(`Replaced {{${variableName}}} from field object (no value) with: ${String(fieldValue)}`, 'success', 'emails');
                return String(fieldValue);
              }
            }
            // Check if the key itself matches
            if (key === variableName) {
              addApiLog(`Replaced {{${variableName}}} from field ID with: ${String(fieldValue)}`, 'success', 'emails');
              return String(fieldValue);
            }
          }
        }
      }

      // Variable not found, log and return empty string
      addApiLog(`No value found for variable: {{${variableName}}}, replacing with empty string`, 'error', 'emails');
      return '';
    });

    // Use debug utility for post-replacement if available
    if (debugVariableReplacement) {
      debugVariableReplacement(result, normalizedData, 'Post-replacement');
    }

    console.log(`[EMAIL TEMPLATE] Variable replacement completed successfully`);
    return result;
  } catch (error) {
    // Log the error but don't fail the entire email
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[ERROR] Error in replaceVariables: ${errorMessage}`);
    console.log(`[EMAIL TEMPLATE] Returning original text due to error`);
    addApiLog(`Error in replaceVariables: ${errorMessage}`, 'error', 'emails');
    return text;
  }
}
