/**
 * Email System 2.0 Templates
 * 
 * This file contains functions for processing email templates.
 */

/**
 * Replace variables in a template string
 * 
 * @param template Template string with variables in {{variable}} format
 * @param data Form submission data
 * @param mappedValues Mapped values from fields
 * @returns Processed template with variables replaced
 */
export function replaceVariables(
  template: string,
  data: Record<string, any>,
  mappedValues: Record<string, any>
): string {
  // First replace mapped values (e.g., {{name}}, {{email}})
  let result = template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    // Check if the key exists in mappedValues
    if (mappedValues[key] !== undefined) {
      return mappedValues[key];
    }
    
    // If not found in mappedValues, try to find it in data by field ID
    if (data[key] !== undefined) {
      return data[key];
    }
    
    // If not found, return the original match
    return match;
  });

  // Then replace field IDs (e.g., {{field_123}})
  result = result.replace(/\{\{field_([^}]+)\}\}/g, (match, fieldId) => {
    if (data[`field_${fieldId}`] !== undefined) {
      return data[`field_${fieldId}`];
    }
    return match;
  });

  return result;
}

/**
 * Extract mapped values from fields
 * 
 * @param data Form submission data
 * @param fields Form fields with mapping information
 * @returns Record of mapped values
 */
export function extractMappedValuesFromFields(
  data: Record<string, any>,
  fields: any[]
): Record<string, any> {
  const result: Record<string, any> = {};

  fields.forEach(field => {
    try {
      if (field.mapping) {
        const mapping = typeof field.mapping === 'string' 
          ? JSON.parse(field.mapping) 
          : field.mapping;
          
        const mappingType = mapping.type;
        const customKey = mapping.customKey;
        
        const key = mappingType === 'custom' && customKey ? customKey : mappingType;
        
        if (key && data[field.id] !== undefined) {
          result[key] = data[field.id];
        }
      }
    } catch (error) {
      console.error(`Error parsing mapping for field ${field.id}:`, error);
    }
  });

  return result;
}

/**
 * Process CC emails with template
 * 
 * @param rule Email rule with possible CC emails
 * @param template Email template with possible CC emails
 * @returns Processed CC emails
 */
export function processCcEmailsWithTemplate(rule: any, template: any): string {
  // Log template details to verify we have the correct template
  console.log('[Forms2] TEMPLATE DETAILS FOR CC:', {
    templateId: template?.id || 'unknown',
    templateName: template?.name || 'unknown',
    templateExists: template ? 'YES' : 'NO',
    templateHasCcField: template && 'ccEmails' in template ? 'YES' : 'NO',
    templateCcEmails: template?.ccEmails || 'none'
  });
  
  // First check the rule for CC emails
  // If not found in the rule, check the template
  const templateCcEmails = template?.ccEmails;
  const ruleCcEmails = rule?.ccEmails;
  
  const ccEmails = ruleCcEmails || templateCcEmails || '';
  
  console.log('[Forms2] CC EMAIL SOURCE CHECK:', {
    ruleId: rule?.id || 'unknown',
    ruleCc: ruleCcEmails || 'none',
    templateCc: templateCcEmails || 'none',
    finalCc: ccEmails,
    source: ruleCcEmails ? 'rule' : (templateCcEmails ? 'template' : 'none')
  });
  
  return ccEmails;
}

/**
 * Process BCC emails with template
 * 
 * @param rule Email rule with possible BCC emails
 * @param template Email template with possible BCC emails
 * @returns Processed BCC emails
 */
export function processBccEmailsWithTemplate(rule: any, template: any): string {
  // Log template details to verify we have the correct template
  console.log('[Forms2] TEMPLATE DETAILS FOR BCC:', {
    templateId: template?.id || 'unknown',
    templateName: template?.name || 'unknown',
    templateExists: template ? 'YES' : 'NO',
    templateHasBccField: template && 'bccEmails' in template ? 'YES' : 'NO',
    templateBccEmails: template?.bccEmails || 'none'
  });
  
  // First check the rule for BCC emails
  // If not found in the rule, check the template
  const templateBccEmails = template?.bccEmails;
  const ruleBccEmails = rule?.bccEmails;
  
  const bccEmails = ruleBccEmails || templateBccEmails || '';
  
  console.log('[Forms2] BCC EMAIL SOURCE CHECK:', {
    ruleId: rule?.id || 'unknown',
    ruleBcc: ruleBccEmails || 'none',
    templateBcc: templateBccEmails || 'none',
    finalBcc: bccEmails,
    source: ruleBccEmails ? 'rule' : (templateBccEmails ? 'template' : 'none')
  });
  
  return bccEmails;
}
