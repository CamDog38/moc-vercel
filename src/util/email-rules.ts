/**
 * [DEPRECATED] Legacy Email Rules Utility
 * 
 * This file is a compatibility layer that redirects to the Forms2 email condition evaluation system.
 * It is kept for backward compatibility but will be removed in a future release.
 * 
 * New code should use the Forms2 condition evaluation system directly:
 * import { evaluateConditions } from '@/lib/emails2/conditions';
 */

import * as logger from '@/util/logger';
import { evaluateConditions as evaluateConditions2 } from '@/lib/emails2/conditions';

// Log deprecation warning
logger.warn('[DEPRECATED] The legacy email rules utility is deprecated. Use the Forms2 condition evaluation system directly.', 'forms');

/**
 * [DEPRECATED] Evaluates a set of conditions against form data
 * This is a compatibility wrapper around the Forms2 condition evaluation system
 */
export function evaluateConditions(conditions: any, data: any, options?: any) {
  // Log deprecation warning on each call
  logger.warn('[DEPRECATED] Using legacy condition evaluation. This will be removed in a future release.', 'forms');
  
  // Simply redirect to the Forms2 condition evaluation system
  return evaluateConditions2(conditions, data);
}

// Export other functions as needed for backward compatibility
export const isConditionMet = (condition: any, data: any) => {
  logger.warn('[DEPRECATED] Using legacy isConditionMet. This will be removed in a future release.', 'forms');
  return evaluateConditions2([condition], data);
};
