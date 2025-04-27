/**
 * Form System 2.0 API - Public Form Submission Endpoint
 * 
 * POST: Submit form data for a public form
 * This endpoint does not require authentication and is used for public form submissions
 * 
 * Routes to the appropriate handler based on form type (INQUIRY or BOOKING)
 */

import { NextApiRequest, NextApiResponse } from 'next';
import * as logger from '@/util/logger';
import { FormRepository } from '@/lib/forms2/repositories/formRepository';
import { bulkLeadSubmissionService } from '@/lib/forms2/services/bulk/bulkLeadSubmissionService2';
import { bulkBookingSubmissionService } from '@/lib/forms2/services/bulk/bulkBookingSubmissionService';
import { handleApiError as handleApiError2 } from '@/lib/forms2/services/submission';
import axios from 'axios';

const formRepository2 = new FormRepository();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
    
    // Check if form exists and is public
    const form = await formRepository2.getFormById(id);
    
    if (!form) {
      logger.warn(`Public form not found: ${id}`, 'forms');
      return res.status(404).json({ error: 'Form not found' });
    }
    
    // All forms are treated as public per requirement
    const formFields = typeof form.fields === 'string' ? JSON.parse(form.fields) : form.fields;
    
    // Log for debugging but don't block submission
    if (formFields?.isPublic !== true) {
      logger.info(`Note: Form ${id} doesn't have isPublic flag set but allowing submission anyway`, 'forms');
    }
    
    // Check if the form is active
    if (!form.isActive) {
      logger.warn(`Attempted to submit to inactive form: ${id}`, 'forms');
      return res.status(403).json({ error: 'This form is currently inactive' });
    }

    const { formData } = req.body;
    
    if (!formData) {
      logger.error('Form data is missing in submission', 'forms');
      return res.status(400).json({ error: 'Form data is required' });
    }
    
    // Generate timestamp in the correct format (milliseconds since epoch as string)
    const timestamp = new Date().getTime();
    const timestampStr = timestamp.toString();
    
    // Generate tracking token if not provided
    const trackingToken = req.headers['x-tracking-token'] ? 
      String(req.headers['x-tracking-token']) : 
      `form-${id}-${timestampStr}`;

    // Get the source URL from headers or use a default
    const sourceUrl = req.headers.referer || 'forms2-api';
    
    // Determine if this is a booking form or inquiry form
    if (form.type === 'BOOKING') {
      console.log(`[FORMS2] Using bulkBookingSubmissionService with source URL: ${sourceUrl}`);
      
      // Process the submission using our booking service
      const result = await bulkBookingSubmissionService.processSubmission(
        id,
        formData,
        sourceUrl
      );
      
      // Process emails for the booking submission
      if (result.submissionId) {
        logger.info(`Booking form submission processed successfully with ID: ${result.submissionId}`, 'forms');
        console.log(`[FORMS2] Processing emails for booking submission: ${result.submissionId}`);
        
        try {
          // Call the email processing API asynchronously
          const emailProcessingUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/emails/process-submission`;
          const emailResponse = await axios.post(emailProcessingUrl, {
            submissionId: result.submissionId,
            formId: id,
            source: 'server-api',
            internalApiKey: 'forms-system-internal'
          });
          
          console.log(`[FORMS2] Email processing response:`, emailResponse.data);
        } catch (emailError: any) {
          console.error(`[FORMS2] Error processing emails:`, emailError.message);
          logger.error(`Error processing emails for booking submission: ${emailError.message}`, 'forms');
          // Don't fail the submission if email processing fails
        }
      }
      
      // Return success response for booking
      return res.status(200).json({
        success: true,
        message: result.message || 'Booking form submitted successfully',
        data: {
          submissionId: result.submissionId,
          bookingId: result.bookingId
        }
      });
    } else {
      // This is an inquiry form
      console.log(`[FORMS2] Using bulkLeadSubmissionService with source URL: ${sourceUrl}`);
      
      // Process the submission using our lead service
      const result = await bulkLeadSubmissionService.processSubmission(
        id,
        formData,
        sourceUrl
      );
      
      // Process emails for the lead submission
      if (result.submissionId) {
        logger.info(`Form submission processed successfully with ID: ${result.submissionId}`, 'forms');
        console.log(`[FORMS2] Processing emails for lead submission: ${result.submissionId}`);
        
        try {
          // Call the email processing API asynchronously
          const emailProcessingUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/emails/process-submission`;
          const emailResponse = await axios.post(emailProcessingUrl, {
            submissionId: result.submissionId,
            formId: id,
            source: 'server-api',
            internalApiKey: 'forms-system-internal'
          });
          
          console.log(`[FORMS2] Email processing response:`, emailResponse.data);
        } catch (emailError: any) {
          console.error(`[FORMS2] Error processing emails:`, emailError.message);
          logger.error(`Error processing emails for lead submission: ${emailError.message}`, 'forms');
          // Don't fail the submission if email processing fails
        }
      }
      
      // Return success response for inquiry
      return res.status(200).json({
        success: true,
        message: result.message || 'Form submitted successfully',
        data: {
          submissionId: result.submissionId,
          leadId: result.leadId
        }
      });
    }
  } catch (error) {
    // Handle the error using our error handling service
    handleApiError2(res, error);
  }
}
