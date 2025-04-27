/**
 * Form System 2.0 API - Form Submissions Endpoint
 * 
 * GET: List submissions for a form
 * POST: Create a new submission for a form
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { FormRepository } from '@/lib/forms2/repositories/form/formRepository';
import { SubmissionRepository } from '@/lib/forms2/repositories/submissionRepository';
import axios from 'axios';
import path from 'path';
import { addApiLog } from '@/pages/api/debug/logs';

const formRepository = new FormRepository();
const submissionRepository = new SubmissionRepository();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Standard logging header
  const fileName = path.basename(__filename);
  const filePath = __filename;
  const fileVersion = '2.0';
  const apiSource = req.headers['referer'] || 'Unknown';
  
  console.log(`[FILE NAME] ${fileName}`);
  console.log(`[FILE PATH] ${filePath}`);
  console.log(`[${fileVersion} FILE]`);
  console.log(`[API RECEIVED FROM] ${apiSource}`);
  console.log(`[PROCESSING] Form submission handler starting`);
  
  const { id } = req.query;

  console.log(`[PROCESSING] Handling request for form ID: ${id}`);
  
  if (!id || typeof id !== 'string') {
    console.log(`[ERROR] Form ID is required but was not provided or invalid`);
    return res.status(400).json({ error: 'Form ID is required' });
  }

  try {
    // Check if the form exists
    console.log(`[DATABASE] Fetching form with ID: ${id}`);
    const form = await formRepository.getFormById(id);
    
    console.log(`[DATABASE] Form found: ${!!form}`);
    if (form) {
      console.log(`[FORM INFO] Name: ${form.name}`);
      console.log(`[FORM INFO] Type: ${form.type}`);
      // Use a type check to safely log whether the form is public
      console.log(`[FORM INFO] Public: ${(form as any).isPublic || (form as any).public ? 'Yes' : 'No'}`);
    }
    
    if (!form) {
      console.log(`[ERROR] Form not found with ID: ${id}`);
      return res.status(404).json({ error: 'Form not found' });
    }

    // GET - List submissions for a form (requires authentication)
    if (req.method === 'GET') {
      console.log(`[AUTHENTICATION] Checking user session`);
      const session = await getSession({ req });

      if (!session || !session.user) {
        console.log(`[ERROR] Unauthorized access attempt - no valid session`);
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Safely access the user ID from the session
      const userId = (session.user as any).id as string;
      console.log(`[AUTHENTICATION] User ID: ${userId}`);
      
      // Check if the user has access to this form
      if (form.userId !== userId) {
        console.log(`[ERROR] Forbidden access attempt - form belongs to user ${form.userId} but request from ${userId}`);
        return res.status(403).json({ error: 'Forbidden' });
      }
      
      console.log(`[DATABASE] Fetching submissions for form ID: ${id}`);
      const submissions = await submissionRepository.getSubmissionsByFormId(id);
      console.log(`[DATABASE] Found ${submissions.length} submissions`);
      
      console.log(`[RESPONSE] Sending ${submissions.length} submissions`);
      return res.status(200).json(submissions);
    }
    
    // POST - Create a new submission for a form (public access if form is public)
    if (req.method === 'POST') {
      console.log(`[PROCESSING] Creating new submission for form ID: ${id}`);
      
      // If the form is not public, require authentication
      // Use a type check to safely check if the form is public
      if (!((form as any).isPublic || (form as any).public)) {
        console.log(`[AUTHENTICATION] Form is not public, checking user session`);
        const session = await getSession({ req });

        if (!session || !session.user) {
          console.log(`[ERROR] Unauthorized access attempt to non-public form`);
          return res.status(401).json({ error: 'Unauthorized' });
        }
        console.log(`[AUTHENTICATION] Authorized user: ${(session.user as any).id}`);
      } else {
        console.log(`[AUTHENTICATION] Form is public, no authentication required`);
      }
      
      const { data, metadata } = req.body;
      console.log(`[FORM DATA] Keys received: ${data ? Object.keys(data).join(', ') : 'None'}`);
      console.log(`[FORM DATA] Email field value: ${data?.email || 'Not provided'}`);
      console.log(`[FORM DATA] Name field value: ${data?.name || 'Not provided'}`);
      
      if (!data) {
        console.log(`[ERROR] Submission data is required but was not provided`);
        return res.status(400).json({ error: 'Submission data is required' });
      }
      
      // Create the submission
      console.log(`[DATABASE] Creating submission record for form ID: ${id}`);
      const submission = await submissionRepository.createSubmission({
        formId: id,
        data: typeof data === 'string' ? JSON.parse(data) : data,
        ...(metadata ? { metadata: typeof metadata === 'string' ? JSON.parse(metadata) : metadata } : {}),
      });
      console.log(`[DATABASE] Created submission with ID: ${submission.id}`);
      addApiLog(`Created form submission with ID: ${submission.id}`, 'success', 'forms');

      // Process email rules for this submission using Form System 2.0 endpoint
      try {
        console.log(`[API TO TRIGGER NEXT STEP] Calling Form System 2.0 email processing API for submission ID: ${submission.id}`);
        console.log(`[EMAIL RULES] Triggering email processing at /api/emails2/process-rules2`);
        console.log(`[FORM SYSTEM] Using Form System 2.0 email processing with detailed logging`);
        
        // Using axios for server-side HTTP request to the new Form System 2.0 email processing API
        const emailResponse = await axios.post(`${process.env.NEXTAUTH_URL}/api/emails2/process-rules2`, {
          submissionId: submission.id,
          formId: id,
          data: typeof data === 'object' ? data : JSON.parse(data),
          source: 'form_submission',
        });
        
        // Log detailed information about the email processing results
        const emailResult = emailResponse.data;
        console.log(`[EMAIL RULES] Email processing completed with ${emailResult.processedRules || 0} rules processed`);
        console.log(`[EMAIL RULES] Queued ${emailResult.queuedEmails || 0} emails for sending`);
        console.log(`[EMAIL RULES] Correlation ID: ${emailResult.correlationId || 'None'}`);
        console.log(`[EMAIL RULES] Email processing triggered successfully for submission ${submission.id}`);
        
        addApiLog(`Email processing completed for submission ${submission.id}: processed ${emailResult.processedRules || 0} rules, queued ${emailResult.queuedEmails || 0} emails`, 'success', 'emails');
      } catch (emailError) {
        console.error(`[EMAIL RULES] Error processing email rules:`, emailError);
        addApiLog(`Error processing email rules for submission ${submission.id}: ${emailError instanceof Error ? emailError.message : 'Unknown error'}`, 'error', 'emails');
        // We don't want to fail the submission if email processing fails
      }
      
      console.log(`[RESPONSE] Sending successful response with submission ID: ${submission.id}`);
      return res.status(201).json(submission);
    }
    
    // Method not allowed
    console.log(`[ERROR] Method not allowed: ${req.method}`);
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error(`[ERROR] Error in form2 submissions API:`, error);
    addApiLog(`Error in form2 submissions API: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error', 'forms');
    return res.status(500).json({ error: 'Internal server error' });
  }
}
