/**
 * DEPRECATED: This file is deprecated and will be removed in a future version.
 * Please use process-submission2.ts instead which implements the improved email rule system.
 * 
 * This file now redirects all calls to process-submission2.ts.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { addApiLog } from '@/pages/api/debug/logs';
import * as logger from '@/util/logger';

// Import the handler from the new implementation
import handler2 from './process-submission2';

/**
 * API handler for processing email submissions
 * DEPRECATED: This handler now redirects to process-submission2.ts
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Add a clear identifier log
  console.log('==========================================');
  console.log('[EMAILS] DEPRECATED process-submission.ts API CALLED - Redirecting to process-submission2.ts');
  console.log('==========================================');
  
  // Log the deprecation warning
  logger.warn('[DEPRECATED] process-submission.ts API called - Redirecting to process-submission2.ts', 'forms');
  addApiLog('DEPRECATED: process-submission.ts API called - Redirecting to process-submission2.ts', 'info', 'emails');
  
  // Forward the request to the new implementation
  return handler2(req, res);
}
