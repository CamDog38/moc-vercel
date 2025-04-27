/**
 * Types for the Email Rule Service
 */

import { EmailProcessingParams, EmailProcessingResult, EnhancedData } from '../types';
import { EmailRule } from '@prisma/client';

/**
 * Result of rule evaluation
 */
export interface RuleEvaluationResult {
  isMatch: boolean;
  logs: any[];
}

/**
 * Parameters for rule processing
 */
export interface RuleProcessingParams {
  rule: EmailRule & { 
    template: { 
      id: string; 
      name: string; 
      ccEmails?: string | null; 
      bccEmails?: string | null; 
    } 
  };
  enhancedData: EnhancedData;
  formId: string;
  submissionId: string;
  correlationId: string;
  logs: any[];
}

/**
 * Result of rule processing
 */
export interface RuleProcessingResult {
  success: boolean;
  emailSent: boolean;
  logs: any[];
  error?: string;
}

export type { EmailProcessingParams, EmailProcessingResult, EnhancedData };
