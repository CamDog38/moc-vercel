/**
 * Form System 2.0 Email Log Update Service
 * 
 * This service handles updating email logs in the database.
 */

import { PrismaClient } from '@prisma/client';

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * Log a message to the API logs
 * 
 * @param message The message to log
 * @param type The type of log (success, error, info, warning)
 * @param category The category of the log
 */
function addApiLog(message: string, type: 'success' | 'error' | 'info' | 'warning', category: string) {
  console.log(`[API LOG] [${type.toUpperCase()}] [${category}] ${message}`);
}

/**
 * Update an email log record in the database
 * 
 * @param emailLogId The ID of the email log to update
 * @param status The new status of the email
 * @param error Optional error message
 * @returns The updated email log record
 */
export async function updateEmailLog2(
  emailLogId: string,
  status: string,
  error?: string | null
) {
  try {
    console.log(`[DATABASE] Updating email log record with ID: ${emailLogId} to status: ${status}`);
    
    // Update the email log record
    const emailLog = await prisma.emailLog.update({
      where: { id: emailLogId },
      data: {
        status,
        error: error || null
      }
    });
    
    console.log(`[DATABASE] Updated email log record with ID: ${emailLogId} to status: ${status}`);
    addApiLog(`Updated email log record with ID: ${emailLogId} to status: ${status}`, 'success', 'emails');
    
    return emailLog;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[DATABASE] Error updating email log record: ${errorMessage}`);
    console.error(`[DATABASE] Full error details:`, error);
    addApiLog(`Error updating email log record: ${errorMessage}`, 'error', 'emails');
    
    // Return a dummy email log instead of throwing
    return {
      id: emailLogId,
      status: 'ERROR',
      error: errorMessage
    } as any;
  }
}
