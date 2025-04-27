/**
 * Form System 2.0 Email Processing
 * 
 * This module exports the email processing system for Form System 2.0.
 * It handles email automations for form submissions with proper condition evaluation.
 */

// Export the main functions
export { processEmailRules2 } from './ruleService2';
export { processEmail2 } from './emailService2';
export { replaceVariables2 } from './variableService2';

// Export types
export * from './types';

// Standard logging header for file
import path from 'path';
const fileName = path.basename(__filename);
const fileVersion = '2.0';

console.log(`[FILE NAME] ${fileName}`);
console.log(`[${fileVersion} FILE]`);
console.log(`[FORMS2] Email Processing Service with proper condition evaluation`);
console.log(`[FORMS2] Using Forms2 email processing system`);
