/**
 * Data Enhancer for Email Rule Service
 * 
 * This module handles enhancing form submission data with additional information
 * from related entities like leads.
 */

import { PrismaClient } from '@prisma/client';
import { EnhancedData } from './types';

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * Enhances form data with submission and lead data
 * 
 * @param formId The ID of the form
 * @param submissionId The ID of the form submission
 * @param initialData The initial form data
 * @param logs Array to store log messages
 * @returns Enhanced data with submission and lead information
 */
export async function enhanceFormData(
  formId: string,
  submissionId: string,
  initialData: Record<string, any>,
  logs: any[]
): Promise<EnhancedData> {
  // Start with the initial data
  let enhancedData: EnhancedData = { ...initialData };
  
  // Add the form ID to the enhanced data
  enhancedData.formId = formId;
  
  // Only try to fetch the submission if a valid submissionId is provided
  if (submissionId) {
    logs.push({
      type: 'info',
      message: `Fetching submission data for ID: ${submissionId}`,
      timestamp: new Date().toISOString()
    });
    
    // Try to fetch the submission to get the mapped data
    const submission = await prisma.formSubmission.findUnique({
      where: { id: submissionId },
      select: {
        id: true,
        formId: true,
        leadId: true,
        data: true,
        timeStamp: true
      }
    });
    
    if (submission) {
      // Add submission data to the enhanced data
      enhancedData.submissionId = submission.id;
      enhancedData.formId = submission.formId;
      
      // Handle timeStamp which could be a Date object or already a string
      if (submission.timeStamp) {
        if (typeof submission.timeStamp === 'object') {
          // It's a Date object
          const dateObj = submission.timeStamp as Date;
          enhancedData.timeStamp = dateObj.toISOString();
        } else {
          // It's already a string or some other format
          enhancedData.timeStamp = String(submission.timeStamp);
        }
      } else {
        enhancedData.timeStamp = new Date().toISOString();
      }
      
      // Parse the submission data if it's a string
      const submissionData = typeof submission.data === 'string' 
        ? JSON.parse(submission.data) 
        : submission.data;
        
      // Merge the submission data with the enhanced data
      enhancedData = { ...enhancedData, ...submissionData };
      
      // If there's a lead ID, try to fetch the lead data
      if (submission.leadId) {
        enhancedData.leadId = submission.leadId;
        
        logs.push({
          type: 'info',
          message: `Fetching lead data for ID: ${submission.leadId}`,
          timestamp: new Date().toISOString()
        });
        
        // Try to fetch the lead data
        const lead = await prisma.lead.findUnique({
          where: { id: submission.leadId }
        });
        
        if (lead) {
          console.log(`[DATABASE] Found lead: ${lead.name || 'Unnamed'}`);
          // Add lead data to the enhanced data object
          enhancedData = {
            ...enhancedData,
            leadId: lead.id,
            name: lead.name || undefined,
            email: lead.email || undefined,
            phone: lead.phone || undefined,
            // Extract first name from full name if available
            firstName: lead.name ? lead.name.split(' ')[0] : undefined
          };
          console.log(`[EMAIL PROCESSING2] Enhanced data with lead information: name=${lead.name}, email=${lead.email}`);
        }
      }
    } else {
      logs.push({
        type: 'warning',
        message: `No submission found with ID: ${submissionId}`,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  return enhancedData;
}
