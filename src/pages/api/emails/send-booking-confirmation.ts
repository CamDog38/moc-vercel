/**
 * DEPRECATED: Legacy Booking Confirmation Email API (Forms 1.0)
 * 
 * This file is deprecated and will be removed in a future version.
 * Please use the Email System 2.0 API instead.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { addApiLog } from '@/pages/api/debug/logs';
import { createClient } from '@/util/supabase/api';
import axios from 'axios';
import * as logger from '@/util/logger';

/**
 * DEPRECATED: API handler for sending booking confirmation emails
 * This API is deprecated and will be removed in a future version.
 * Please use the Email System 2.0 API instead.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Add a clear identifier log
  console.log('==========================================');
  console.log('[EMAILS] DEPRECATED send-booking-confirmation.ts API CALLED - Redirecting to Email System 2.0');
  console.log('==========================================');
  
  // Log the deprecation warning
  logger.info('[DEPRECATED] send-booking-confirmation.ts API called - Redirecting to Email System 2.0', 'emails');
  addApiLog('[DEPRECATED] send-booking-confirmation.ts API called - Redirecting to Email System 2.0', 'info', 'emails');
  
  // Check authentication
  const supabase = createClient(req, res);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    addApiLog('Unauthorized access attempt to send-booking-confirmation', 'error', 'emails');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    addApiLog(`Method not allowed: ${req.method}`, 'error', 'emails');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { bookingId, templateId } = req.body;

    if (!bookingId) {
      addApiLog('Missing booking ID in request body', 'error', 'emails');
      return res.status(400).json({ error: 'Missing booking ID' });
    }

    // Force localhost in development mode, regardless of .env settings
    const baseUrl = process.env.NODE_ENV === 'development' 
      ? `http://localhost:${process.env.PORT || 3000}`
      : process.env.NEXT_PUBLIC_BASE_URL;
    
    addApiLog(`Redirecting booking confirmation request to Email System 2.0 for booking ID: ${bookingId}`, 'info', 'emails');
    
    // Forward the request to the Email System 2.0 API
    const response = await axios.post(
      `${baseUrl}/api/emails2/process-submission`,
      {
        // Pass through the original request body
        ...req.body,
        // Add additional context
        source: 'legacy_booking_confirmation',
        userId: user.id,
        // Flag this as a legacy redirect
        isLegacyRedirect: true,
        legacyEndpoint: 'send-booking-confirmation'
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    addApiLog(`Email System 2.0 processing complete for booking ID: ${bookingId}`, 'success', 'emails');
    
    // Return the response from the Email System 2.0 API
    return res.status(response.status).json(response.data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    addApiLog(`Error redirecting booking confirmation request: ${errorMessage}`, 'error', 'emails');
    
    return res.status(500).json({ 
      error: 'Failed to process booking confirmation email',
      details: errorMessage
    });
  }
}
