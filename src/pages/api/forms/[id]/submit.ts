/**
 * DEPRECATED: Legacy Form Submission API (Forms 1.0)
 * 
 * This file is deprecated and will be removed in a future version.
 * Please use the Form System 2.0 submission API instead.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { withCors } from '@/util/cors';
import { addApiLog } from '@/pages/api/debug/logs';
import axios from 'axios';
import * as logger from '@/util/logger';

/**
 * DEPRECATED: API handler for form submissions
 * This API is deprecated and will be removed in a future version.
 * Please use the Form System 2.0 submission API instead.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Add a clear identifier log
  console.log('==========================================');
  console.log('[FORMS] DEPRECATED form submission API CALLED - Redirecting to Form System 2.0');
  console.log('==========================================');
  
  // Log the deprecation warning
  logger.info('[DEPRECATED] form submission API called - Redirecting to Form System 2.0', 'forms');
  addApiLog('[DEPRECATED] form submission API called - Redirecting to Form System 2.0', 'info', 'forms');
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    addApiLog(`Method not allowed: ${req.method}`, 'error', 'forms');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      addApiLog('Missing form ID in request', 'error', 'forms');
      return res.status(400).json({ error: 'Missing form ID' });
    }

    // Check if the form exists
    const form = await prisma.form.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        userId: true,
        type: true
      }
    });

    if (!form) {
      addApiLog(`Form not found with ID: ${id}`, 'error', 'forms');
      return res.status(404).json({ error: 'Form not found' });
    }

    // Force localhost in development mode, regardless of .env settings
    const baseUrl = process.env.NODE_ENV === 'development' 
      ? `http://localhost:${process.env.PORT || 3000}`
      : process.env.NEXT_PUBLIC_BASE_URL;
    
    addApiLog(`Redirecting form submission request to Form System 2.0 for form ID: ${id}`, 'info', 'forms');
    
    // Forward the request to the Form System 2.0 API
    const response = await axios.post(
      `${baseUrl}/api/forms2/${id}/submissions`,
      {
        // Pass through the original request body
        ...req.body,
        formId: id,
        // Add additional context
        source: 'legacy_form_submission',
        // Flag this as a legacy redirect
        isLegacyRedirect: true,
        legacyEndpoint: 'forms/[id]/submit'
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    addApiLog(`Form System 2.0 processing complete for form ID: ${id}`, 'success', 'forms');
    
    // Return the response from the Form System 2.0 API
    return res.status(response.status).json(response.data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    addApiLog(`Error redirecting form submission request: ${errorMessage}`, 'error', 'forms');
    
    return res.status(500).json({ 
      error: 'Failed to process form submission',
      details: errorMessage
    });
  }
}

// Apply CORS middleware
export default withCors(handler);
