/**
 * Form System 2.0 API - Public Form Submission Endpoint (Optimized Version)
 * 
 * POST: Submit form data for a public form
 * This endpoint does not require authentication and is used for public form submissions
 * Routes to the appropriate handler based on form type (INQUIRY or BOOKING)
 * 
 * Optimized for performance with:
 * - Form caching
 * - Asynchronous email processing
 * - Improved error handling
 * - Performance metrics
 */

import { NextApiRequest, NextApiResponse } from 'next';
import * as logger from '@/util/logger';
import { FormRepository } from '@/lib/forms2/repositories/form/formRepository';
import { bulkLeadSubmissionService } from '@/lib/forms2/services/bulk/bulkLeadSubmissionService';
import { bulkBookingSubmissionService } from '@/lib/forms2/services/bulk/bulkBookingSubmissionService';
import { handleApiError } from '@/lib/forms2/services/submission';
import axios from 'axios';
import { EMAIL_TIMEOUTS } from '@/lib/forms2/services/email-processing/emailConfig2';

// Define the SubmissionResult interface
interface SubmissionResult {
  success: boolean;
  message?: string;
  submissionId?: string;
  leadId?: string;
  bookingId?: string;
  error?: string;
}

// Extended result type that includes form type
interface ExtendedSubmissionResult extends SubmissionResult {
  type?: string;
}

// Initialize the form repository (uses caching)
const formRepository = new FormRepository();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Start timing the request
  const startTime = Date.now();
  
  // Extract form ID from the request
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Form ID is required' });
  }

  try {
    // Only allow POST method for submissions
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    logger.info(`Public form submission for form ID: ${id}`, 'forms');
    
    // Check if form exists and is public - using cached repository
    const formCheckStart = Date.now();
    const form = await formRepository.getFormById(id);
    console.log(`[FORMS2] Form lookup took ${Date.now() - formCheckStart}ms`);
    
    if (!form) {
      logger.warn(`Public form not found: ${id}`, 'forms');
      return res.status(404).json({ error: 'Form not found' });
    }
    
    // Check if the form is active
    if (!form.isActive) {
      logger.warn(`Attempted to submit to inactive form: ${id}`, 'forms');
      return res.status(403).json({ error: 'This form is currently inactive' });
    }

    // Extract form data from request body
    const { formData } = req.body;
    
    if (!formData) {
      logger.error('Form data is missing in submission', 'forms');
      return res.status(400).json({ error: 'Form data is required' });
    }
    
    // Generate timestamp in the correct format (milliseconds since epoch as string)
    const timestamp = Date.now();
    const timestampStr = timestamp.toString();
    
    // If a tracking token is provided in headers, use it
    let trackingToken = req.headers['x-tracking-token'] ? 
      String(req.headers['x-tracking-token']) : null;
    
    // If no tracking token provided, generate one with the format {{leadId}}-{{timeStamp}}
    if (!trackingToken) {
      // For the leadId, use 'submission-' prefix followed by a UUID if available, or generate a unique ID
      const submissionId = formData.submissionId || formData.id || `submission-${id.substring(0, 8)}`;
      trackingToken = `${submissionId}-${timestampStr}`;
      console.log(`[FORMS2] Generated tracking token: ${trackingToken}`);
    }

    // Get the source URL from headers or use a default
    const sourceUrl = req.headers.referer || 'forms2-api';
    
    // Prepare for submission processing
    const submissionStart = Date.now();
    let result: ExtendedSubmissionResult;
    
    // Process the submission based on form type
    if (form.type === 'BOOKING') {
      console.log(`[FORMS2] Processing booking form submission with source URL: ${sourceUrl}`);
      
      // Process the submission using our booking service
      result = await bulkBookingSubmissionService.processSubmission(
        id,
        formData,
        sourceUrl
      ) as ExtendedSubmissionResult;
      
      // Add the form type to the result
      result.type = 'BOOKING';
      
      console.log(`[FORMS2] Booking submission processing took ${Date.now() - submissionStart}ms`);
      
      // Process emails for the booking submission
      if (result.submissionId) {
        logger.info(`Booking form submission processed successfully with ID: ${result.submissionId}`, 'forms');
        
        // Trigger email processing asynchronously
        triggerAsyncEmailProcessing(id, result.submissionId);
      }
    } else {
      // This is an inquiry form
      console.log(`[FORMS2] Processing inquiry form submission with source URL: ${sourceUrl}`);
      
      // Process the submission using our lead service
      result = await bulkLeadSubmissionService.processSubmission(
        id,
        formData,
        sourceUrl
      ) as ExtendedSubmissionResult;
      
      // Add the form type to the result
      result.type = 'INQUIRY';
      
      console.log(`[FORMS2] Lead submission processing took ${Date.now() - submissionStart}ms`);
      
      // Process emails for the lead submission asynchronously
      if (result.submissionId) {
        logger.info(`Form submission processed successfully with ID: ${result.submissionId}`, 'forms');
        
        // Trigger email processing asynchronously
        triggerAsyncEmailProcessing(id, result.submissionId);
      }
    }
    
    // Calculate total processing time
    const totalTime = Date.now() - startTime;
    console.log(`[FORMS2] Total form submission processing time: ${totalTime}ms`);
    
    // Return success response
    return res.status(200).json({
      success: true,
      message: result.message || 'Form submitted successfully',
      data: {
        submissionId: result.submissionId,
        leadId: result.type === 'INQUIRY' ? result.leadId : undefined,
        bookingId: result.type === 'BOOKING' ? result.bookingId : undefined
      },
      processingTime: totalTime
    });
  } catch (error) {
    // Handle the error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Error processing form submission: ${errorMessage}`, 'forms');
    
    return res.status(500).json({
      success: false,
      message: 'Error processing form submission',
      error: errorMessage
    });
  }
}

/**
 * Trigger email processing asynchronously
 * This function uses setTimeout to ensure the email processing happens after the response is sent
 */
function triggerAsyncEmailProcessing(formId: string, submissionId: string): void {
  setTimeout(() => {
    console.log(`[FORMS2] Starting asynchronous email processing for submission: ${submissionId}`);
    
    const emailProcessingUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/emails/process-submission-async2`;
    
    axios.post(emailProcessingUrl, {
      submissionId: submissionId,
      formId: formId,
      source: 'server-api',
      internalApiKey: 'forms-system-internal'
    }, {
      timeout: EMAIL_TIMEOUTS.EMAIL_PROCESSING_API
    })
    .then(emailResponse => {
      console.log(`[FORMS2] Email processing initiated:`, emailResponse.data);
    })
    .catch(emailError => {
      console.error(`[FORMS2] Error initiating email processing:`, emailError.message);
      logger.error(`Error initiating email processing for submission: ${emailError.message}`, 'forms');
    });
  }, 10); // 10ms delay to ensure response is sent first
}
