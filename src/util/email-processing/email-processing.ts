/**
 * [DEPRECATED] Legacy Email Processing Utility
 * 
 * This file is a compatibility layer that redirects to the Forms2 email processing system.
 * It is kept for backward compatibility but will be removed in a future release.
 * 
 * New code should use the Forms2 email processing system directly:
 * import { processEmailRules2, processEmail2, replaceVariables2 } from '@/lib/forms2/services/email-processing';
 */

import * as logger from '@/util/logger';
import { 
  processEmailRules2, 
  processEmail2, 
  replaceVariables2 
} from '@/lib/forms2/services/email-processing';

// Log deprecation warning
logger.warn('[DEPRECATED] The legacy email processing utility is deprecated. Use the Forms2 email processing system directly.', 'forms');

/**
 * [DEPRECATED] Process email rules for a form submission
 * This is a compatibility wrapper around the Forms2 email processing system
 */
export const processEmailRules = async (params: any) => {
  // Log deprecation warning on each call
  logger.warn('[DEPRECATED] Using legacy processEmailRules. This will be removed in a future release.', 'forms');
  
  // Simply redirect to the Forms2 email processing system
  return processEmailRules2(params);
};

/**
 * [DEPRECATED] Process a single email
 * This is a compatibility wrapper around the Forms2 email processing system
 */
export const processEmail = async (params: any) => {
  // Log deprecation warning on each call
  logger.warn('[DEPRECATED] Using legacy processEmail. This will be removed in a future release.', 'forms');
  
  // Simply redirect to the Forms2 email processing system
  return processEmail2(params);
};

/**
 * [DEPRECATED] Replace variables in a template
 * This is a compatibility wrapper around the Forms2 email processing system
 */
export const replaceVariables = (template: string, data: any) => {
  // Log deprecation warning on each call
  logger.warn('[DEPRECATED] Using legacy replaceVariables. This will be removed in a future release.', 'forms');
  
  // Simply redirect to the Forms2 email processing system
  return replaceVariables2(template, data);
};
