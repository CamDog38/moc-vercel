/**
 * Email Rule Service for Form System 2.0
 * 
 * This file is a facade that re-exports the functionality from the rule-service directory.
 * The implementation has been refactored into smaller, more maintainable modules.
 */

// Re-export everything from the rule-service directory
export * from './rule-service';

// For backward compatibility, ensure the main function is exported directly
import { processEmailRules2 as processEmailRules2Impl } from './rule-service';
export const processEmailRules2 = processEmailRules2Impl;
