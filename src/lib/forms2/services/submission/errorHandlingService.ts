import { NextApiResponse } from 'next';
import * as logger from '@/util/logger';

/**
 * Error types for form submission
 */
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  PERMISSION = 'PERMISSION_ERROR',
  DATABASE = 'DATABASE_ERROR',
  SERVER = 'SERVER_ERROR',
}

/**
 * Error response structure
 */
export interface ErrorResponse {
  success: false;
  error: {
    type: ErrorType;
    message: string;
    details?: Record<string, string> | null;
  };
}

/**
 * Handles API errors and sends appropriate responses
 * @param res The Next.js API response object
 * @param error The error that occurred
 * @param statusCode Optional HTTP status code (defaults to 500)
 */
export const handleApiError = (
  res: NextApiResponse,
  error: unknown,
  statusCode = 500
): void => {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  
  // Determine error type based on message or instance
  let errorType = ErrorType.SERVER;
  let responseStatusCode = statusCode;
  let errorDetails: Record<string, string> | null = null;
  
  // Check for validation errors with field IDs
  const validationErrorMatch = errorMessage.match(/Validation failed: (.*)/i);
  if (validationErrorMatch) {
    errorType = ErrorType.VALIDATION;
    responseStatusCode = 400;
    
    // Try to extract field-specific validation errors
    // Format could be: "Validation failed: field1: error1, field2: error2"
    // or "Validation failed: This field is required"
    try {
      // Check if the error message contains a JSON string with validation errors
      if (error instanceof Error && (error as any).errors) {
        // Use the errors object directly if available
        errorDetails = (error as any).errors;
      } else {
        // Try to parse validation errors from the message
        const fieldErrors = errorMessage.split('Validation failed:')[1].trim();
        
        // Check if we have field IDs in the error message
        if (fieldErrors.includes(':')) {
          // Parse field-specific errors
          errorDetails = {};
          const errorParts = fieldErrors.split(',').map(part => part.trim());
          
          errorParts.forEach(part => {
            const [fieldId, message] = part.split(':').map(p => p.trim());
            if (fieldId && message) {
              errorDetails![fieldId] = message;
            }
          });
        } else {
          // Generic validation error without field IDs
          errorDetails = { '_form': fieldErrors };
        }
      }
    } catch (parseError) {
      logger.warn(`Could not parse validation error details: ${errorMessage}`, 'forms');
      // If parsing fails, just use the full error message
      errorDetails = { '_form': validationErrorMatch[1].trim() };
    }
  } else if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
    errorType = ErrorType.NOT_FOUND;
    responseStatusCode = 404;
  } else if (errorMessage.includes('permission') || errorMessage.includes('unauthorized') || errorMessage.includes('not allowed')) {
    errorType = ErrorType.PERMISSION;
    responseStatusCode = 403;
  } else if (errorMessage.includes('constraint') || errorMessage.includes('duplicate')) {
    errorType = ErrorType.DATABASE;
    responseStatusCode = 409;
  }
  
  // Log the error
  logger.error(`API Error (${errorType}): ${errorMessage}`, 'forms');
  if (errorDetails) {
    logger.error(`Error details: ${JSON.stringify(errorDetails)}`, 'forms');
  }
  
  // Prepare the response object
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      type: errorType,
      message: errorMessage,
      details: errorDetails,
    },
  };
  
  // Send the error response
  res.status(responseStatusCode).json(errorResponse);
};
