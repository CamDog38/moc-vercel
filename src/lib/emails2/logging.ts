/**
 * Email System 2.0 Logging
 * 
 * This file contains functions for logging email processing events.
 */

import { PrismaClient } from '@prisma/client';
import { LogProcessingParams } from './types';

const prisma = new PrismaClient();

/**
 * Log processing events
 * 
 * @param params Log parameters
 */
export async function logProcessing(params: LogProcessingParams): Promise<void> {
  try {
    // Log to console first for immediate visibility
    console.log(`[Forms2] ${params.level.toUpperCase()}: ${params.message}`, {
      correlationId: params.correlationId,
      source: params.source,
      formId: params.formId,
      submissionId: params.submissionId,
      ruleId: params.ruleId,
      templateId: params.templateId
    });
    
    // Then log to database
    await prisma.emailProcessingLog2.create({
      data: {
        level: params.level,
        message: params.message,
        correlationId: params.correlationId,
        source: params.source,
        formId: params.formId,
        submissionId: params.submissionId,
        ruleId: params.ruleId,
        templateId: params.templateId,
        timestamp: new Date(),
        details: params.details,
        error: params.error,
        stackTrace: params.stackTrace,
      },
    });
  } catch (error) {
    // If database logging fails, at least log to console
    console.error('Error creating processing log:', error);
  }
}

/**
 * Create an in-memory log entry
 * 
 * @param level Log level
 * @param message Log message
 * @returns Log entry object
 */
export function createLogEntry(level: 'info' | 'warning' | 'error', message: string): any {
  return {
    level,
    message,
    timestamp: new Date(),
  };
}
