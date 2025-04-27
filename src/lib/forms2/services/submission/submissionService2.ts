/**
 * Form System 2.0 Submission Service
 * 
 * This service handles form submissions for Form System 2.0.
 * It processes form data, creates leads and bookings, and handles email automations.
 * This implementation uses only the Forms2 ecosystem with no legacy systems.
 */

import { PrismaClient } from '@prisma/client';
import * as logger from '@/util/logger';
import { v4 as uuidv4 } from 'uuid';
import { validateFormSubmission, ValidationResult } from '../validation';
import { createLeadFromFormData } from './leadService';
import { createBookingFromFormData } from './bookingService';
import { SubmissionRepository } from '../../repositories/submissionRepository';
import { mapFormFields } from '../mapping/index';

// Import only from the Forms2 email processing system
import { processEmailRules2 } from '../email-processing';

const prisma = new PrismaClient();
const submissionRepository = new SubmissionRepository();

/**
 * Submission Service for Form System 2.0
 * 
 * This service handles form submissions, including:
 * - Form validation
 * - Lead creation
 * - Booking creation
 * - Email automations
 */
export class SubmissionService {
  /**
   * Process a form submission
   * 
   * @param formId The ID of the form
   * @param formData The form data
   * @param trackingToken Optional tracking token
   * @param timeStamp Optional timestamp
   * @param source Optional source of the submission
   * @param processEmails Optional flag to process emails synchronously (default: true)
   * @returns The result of the submission processing
   */
  async processSubmission(
    formId: string,
    formData: Record<string, any>,
    trackingToken?: string,
    timeStamp?: string,
    source?: string,
    processEmails: boolean = true
  ) {
    try {
      logger.info(`Processing form submission for form: ${formId}`, 'forms');
      
      // Get the form configuration for validation
      const validationFormConfig: any = {
        id: formId,
        title: 'Form',
        version: 'modern' as const,
        sections: [],
        metadata: { formType: 'INQUIRY' }
      };
      
      // Validate the form data
      const validationResult = validateFormSubmission(validationFormConfig, formData);
      
      if (!validationResult.isValid) {
        const errorMessages = Object.values(validationResult.errors || {}).filter(Boolean);
        logger.warn(`Form validation failed: ${errorMessages.join(', ')}`, 'forms');
        return {
          success: false,
          message: `Form validation failed: ${errorMessages.join(', ')}`
        };
      }
      
      // Get the form to determine its type
      const form = await prisma.form.findUnique({
        where: { id: formId },
        select: {
          id: true,
          type: true,
          name: true,
          fields: true
        }
      });
      
      if (!form) {
        logger.error(`Form not found: ${formId}`, 'forms');
        return {
          success: false,
          message: 'Form not found'
        };
      }
      
      logger.info(`Processing form with type: ${form.type}`, 'forms');
      logger.info(`Raw form data: ${JSON.stringify(formData)}`, 'forms');
      
      // Get form sections for field mapping
      const formSections = await prisma.formSection.findMany({
        where: { formId },
        select: {
          id: true,
          title: true,
          order: true,
          fields: true
        }
      });
      
      // Create a form config object for field mapping
      const mappingFormConfig: any = {
        id: formId,
        title: form.name || 'Form',
        version: 'modern' as const,
        sections: formSections.map(section => {
          // Ensure we have the required fields for a FormSection
          const sectionTitle = section.title || 'Section';
          const sectionOrder = section.order || 0;
          const sectionFields = typeof section.fields === 'string' 
            ? JSON.parse(section.fields) 
            : (Array.isArray(section.fields) ? section.fields : []);
          
          return {
            id: section.id,
            title: sectionTitle,
            order: sectionOrder,
            fields: sectionFields
          };
        })
      };
      
      // Map form fields to standard fields (name, email, phone, etc.)
      const mappedData = mapFormFields(mappingFormConfig, formData, { logMappingProcess: true });
      logger.info(`Final mapped data: ${JSON.stringify(mappedData)}`, 'forms');
      
      // Variables to store IDs for created resources
      let leadId: string | null = null;
      let bookingId: string | null = null;
      
      // Create a lead if this is an inquiry form
      if (form.type === 'INQUIRY') {
        logger.info(`Creating lead for inquiry form: ${formId}`, 'forms');
        
        // Create a lead from the form data
        const leadId2 = await createLeadFromFormData(formId, mappedData, formData);
        
        if (leadId2) {
          leadId = leadId2;
          logger.info(`Lead created: ${leadId}`, 'forms');
        }
      }
      
      // Create a booking if this is a booking form
      if (form.type === 'BOOKING') {
        logger.info(`Creating booking for booking form: ${formId}`, 'forms');
        
        // Create a booking from the form data
        const bookingId2 = await createBookingFromFormData(formId, mappedData, formData);
        
        if (bookingId2) {
          bookingId = bookingId2;
          logger.info(`Booking created: ${bookingId}`, 'forms');
        }
      }
      
      // Enhance formData with section information for better organization in the UI
      const enhancedFormData = this.enhanceFormDataWithSections(formData, formSections);
      
      // Create the submission record
      const submission = await submissionRepository.createSubmission({
        formId,
        data: enhancedFormData,
        ...(leadId ? { leadId } : {}),
        ...(bookingId ? { bookingId } : {}),
        trackingToken,
        timeStamp
      });
      
      // Process email automations using Form System 2.0 (if enabled)
      if (processEmails) {
        logger.info(`Processing email automations synchronously for submission: ${submission.id}`, 'forms');
        await this.processEmailAutomations2(submission.id, formId, source);
      } else {
        logger.info(`Skipping synchronous email processing for submission: ${submission.id}`, 'forms');
      }
      
      return {
        submissionId: submission.id,
        leadId,
        bookingId,
        success: true,
        message: 'Form submitted successfully'
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error processing form submission: ${errorMessage}`, 'forms');
      throw error;
    }
  }
  
  /**
   * Enhance form data with section information
   * 
   * @param formData The form data
   * @param formSections The form sections
   * @returns The enhanced form data
   */
  private enhanceFormDataWithSections(
    formData: Record<string, any>,
    formSections: { id: string; fields: any }[]
  ): Record<string, any> {
    // If there are no form sections, return the original form data
    if (!formSections || formSections.length === 0) {
      return formData;
    }
    
    // Create a copy of the form data
    const enhancedData = { ...formData };
    
    // Add section information to the form data
    enhancedData.__sections = formSections.map(section => {
      const fields = typeof section.fields === 'string' 
        ? JSON.parse(section.fields) 
        : section.fields;
      
      return {
        id: section.id,
        fields
      };
    });
    
    return enhancedData;
  }
  
  /**
   * Public method to process email automations asynchronously
   * 
   * @param submissionId The ID of the form submission
   * @param formId The ID of the form
   * @param source Optional source of the submission
   */
  async processEmailsAsync(submissionId: string, formId: string, source?: string) {
    return this.processEmailAutomations2(submissionId, formId, source);
  }

  /**
   * Process email automations for a form submission using Form System 2.0
   * 
   * @param submissionId The ID of the form submission
   * @param formId The ID of the form
   * @param source Optional source of the submission
   */
  private async processEmailAutomations2(submissionId: string, formId: string, source?: string) {
    try {
      logger.info(`[FORMS2] Processing email automations for submission: ${submissionId}`, 'forms');
      
      // Generate a correlation ID for tracking this processing request
      const correlationId = uuidv4();
      logger.info(`[FORMS2] Generated correlation ID: ${correlationId}`, 'forms');
      
      // Get the submission data
      const submission = await prisma.formSubmission.findUnique({
        where: { id: submissionId },
        select: {
          id: true,
          formId: true,
          data: true,
          leadId: true
        }
      });
      
      if (!submission) {
        logger.error(`[FORMS2] Submission not found: ${submissionId}`, 'forms');
        return;
      }
      
      // Parse the submission data
      const formData = typeof submission.data === 'string' 
        ? JSON.parse(submission.data) 
        : submission.data;
      
      // Enhance the form data with additional context
      let enhancedData = { ...formData };
      
      // Add submission ID to the enhanced data
      enhancedData.submissionId = submission.id;
      
      // If there's a lead ID, try to fetch the lead data
      if (submission.leadId) {
        try {
          const lead = await prisma.lead.findUnique({
            where: { id: submission.leadId }
          });
          
          if (lead) {
            logger.info(`[FORMS2] Found lead: ${lead.name || 'Unnamed'}`, 'forms');
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
          }
        } catch (error) {
          logger.error(`[FORMS2] Error fetching lead data: ${error instanceof Error ? error.message : String(error)}`, 'forms');
        }
      }
      
      logger.info(`[FORMS2] Processing email rules for form: ${submission.formId}, submission: ${submission.id}`, 'forms');
      
      // Process email rules using the Forms2 email processing system
      const result = await processEmailRules2({
        formId: submission.formId,
        submissionId: submission.id,
        data: enhancedData,
        correlationId
      });
      
      // Log the results
      if (result.success) {
        logger.info(`[FORMS2] Email processing successful: processed ${result.processedRules} rules, queued ${result.queuedEmails} emails`, 'forms');
      } else {
        logger.error(`[FORMS2] Email processing failed: ${result.error}`, 'forms');
      }
      
      // Return the result for potential use by the caller
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[FORMS2] Error processing email automations: ${errorMessage}`, 'forms');
      
      // Return an error result
      return {
        success: false,
        processedRules: 0,
        queuedEmails: 0,
        correlationId: uuidv4(),
        logs: [{
          type: 'error',
          message: `Error processing email automations: ${errorMessage}`,
          timestamp: new Date().toISOString()
        }],
        error: errorMessage
      };
    }
  }
}

export const submissionService = new SubmissionService();
