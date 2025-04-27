/**
 * Forms2 Module Index
 * 
 * This file exports the main API for the Forms2 module.
 */

export * from './core/types';
export * from './formService';
export * from './utils/idUtils';

// Create and export a singleton instance of the FormService
import { FormService } from './formService';
export const formService = new FormService();
