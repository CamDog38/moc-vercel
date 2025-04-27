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

// Using explicit type declarations to avoid Next.js import issues
type NextApiRequest = {
  method?: string;
  query: Record<string, string | string[]>;
  body: any;
  headers: {
    [key: string]: string | string[] | undefined;
  };
};

type NextApiResponse = {
  status: (code: number) => NextApiResponse;
  json: (data: any) => void;
};

// Define FormSubmission type to fix TypeScript errors
type FormSubmission = {
  id: string;
  formId: string;
  data: Record<string, any>;
  createdAt: Date;
  leadId?: string;
  bookingId?: string;
  sourceLeadId?: string;
  trackingToken?: string;
  timeStamp?: number;
};

// Helper function to ensure string type
function ensureString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] || '';
  }
  return value || '';
}
import * as logger from '@/util/logger';
import { FormRepository } from '@/lib/forms2/repositories/form/formRepository';
import { bulkLeadSubmissionService } from '@/lib/forms2/services/bulk/bulkLeadSubmissionService';
import { bulkBookingSubmissionService } from '@/lib/forms2/services/bulk/bulkBookingSubmissionService';
import { handleApiError } from '@/lib/forms2/services/submission';
import { processEmailRulesDirect } from '@/lib/forms2/services/email-processing/directEmailProcessor';
import { initializeDirectEmailService } from '@/lib/forms2/services/email-processing/directEmailService';
import prisma from '@/lib/prisma';

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
  const id = ensureString(req.query.id);

  if (!id) {
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
    const sourceUrl = ensureString(req.headers.referer) || 'forms2-api';
    
    // Prepare for submission processing
    const submissionStart = Date.now();
    let result: ExtendedSubmissionResult;
    
    // Process the submission based on form type
    // Use type assertion to help TypeScript understand the form type
    const formType = form.type as string;
    if (formType === 'BOOKING') {
      console.log(`[FORMS2] Processing booking form submission with source URL: ${sourceUrl}`);
      
      // Process the submission using our booking service
      result = await bulkBookingSubmissionService.processSubmission(
        id, // id is already a string thanks to ensureString
        formData,
        sourceUrl as string
      ) as ExtendedSubmissionResult;
      
      // Add the form type to the result
      result.type = 'BOOKING';
      
      console.log(`[FORMS2] Booking submission processing took ${Date.now() - submissionStart}ms`);
      
      // Process emails for the booking submission
      if (result.submissionId) {
        logger.info(`Booking form submission processed successfully with ID: ${result.submissionId}`, 'forms');
        
        // Process emails directly without API calls
        console.log(`[FORMS2] Starting direct email processing for booking submission: ${result.submissionId}`);
        // Pre-connect to SMTP server to speed up email sending
        initializeDirectEmailService().catch(error => {
          console.error(`[FORMS2] SMTP pre-connection error:`, error);
        });
        
        // Process emails asynchronously but without setTimeout or API calls
        Promise.resolve().then(async () => {
          try {
            // First, get the submission data from the database
            const submission = await prisma.formSubmission.findUnique({
              where: { id: result.submissionId }
            }) as FormSubmission | null;
            
            if (!submission) {
              console.error(`[FORMS2] Submission not found: ${result.submissionId}`);
              return;
            }
            
            // Process email rules with the submission data
            const emailResult = await processEmailRulesDirect(id, submission.data, result.submissionId);
            console.log(`[FORMS2] Email processing completed successfully for booking submission: ${result.submissionId}`);
            console.log(`[FORMS2] Email processing result:`, emailResult);
          } catch (error) {
            console.error(`[FORMS2] Error processing email rules: ${error}`);
            logger.error(`Error processing email rules: ${error}`, 'emails');
          }
        });
      }
    } else {
      // This is an inquiry form
      console.log(`[FORMS2] Processing inquiry form submission with source URL: ${sourceUrl}`);
      
      // Process the submission using our lead service
      result = await bulkLeadSubmissionService.processSubmission(
        id, // id is already a string thanks to ensureString
        formData,
        sourceUrl as string
      ) as ExtendedSubmissionResult;
      
      // Add the form type to the result
      result.type = 'INQUIRY';
      
      console.log(`[FORMS2] Lead submission processing took ${Date.now() - submissionStart}ms`);
      
      // Process emails for the lead submission directly
      if (result.submissionId) {
        logger.info(`Form submission processed successfully with ID: ${result.submissionId}`, 'forms');
        
        // Process emails directly without API calls
        console.log(`[FORMS2] Starting direct email processing for lead submission: ${result.submissionId}`);
        // Pre-connect to SMTP server to speed up email sending
        initializeDirectEmailService().catch(error => {
          console.error(`[FORMS2] SMTP pre-connection error:`, error);
        });
        
        // Process emails asynchronously but without setTimeout or API calls
        Promise.resolve().then(async () => {
          try {
            // First, get the submission data from the database
            const submission = await prisma.formSubmission.findUnique({
              where: { id: result.submissionId }
            }) as FormSubmission | null;
            
            if (!submission) {
              console.error(`[FORMS2] Submission not found: ${result.submissionId}`);
              return;
            }
            
            // Process email rules with the submission data
            const emailResult = await processEmailRulesDirect(id, submission.data, result.submissionId);
            console.log(`[FORMS2] Email processing completed successfully for lead submission: ${result.submissionId}`);
            console.log(`[FORMS2] Email processing result:`, emailResult);
          } catch (error) {
            console.error(`[FORMS2] Error processing email rules: ${error}`);
            logger.error(`Error processing email rules: ${error}`, 'emails');
          }
        });
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

// The old triggerAsyncEmailProcessing function has been replaced with direct email processing
// using processEmailRulesDirect from directEmailProcessor.ts
