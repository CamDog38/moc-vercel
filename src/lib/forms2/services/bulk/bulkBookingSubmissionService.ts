/**
 * Bulk Booking Submission Service
 * 
 * This service handles booking form submissions, creating bookings and form submissions
 * while being completely detached from email sending.
 */

import { prisma } from '@/lib/prisma';
import * as logger from '@/util/logger';
import { v4 as uuidv4 } from 'uuid';
import { mapFormFields } from '../mapping';
import { StandardMappedFields } from '../mapping/types';
import { extractContactInfo } from '../mapping/contactInfoExtractor';
import { FieldConfig } from '@/lib/forms2/core/types';
import { createBookingFromFormData, processBookingDateTime } from '../submission/bookingService';
import {
  processBookingData,
  createBookingMappedFieldsMetadata,
  createBookingSectionInfoMetadata,
  createBookingFinalSubmissionData
} from './helpers/bookingHelpers';

/**
 * Submission result interface
 */
interface SubmissionResult {
  success: boolean;
  message: string;
  submissionId?: string;
  bookingId?: string;
  leadId?: string;
  error?: string;
}

/**
 * Bulk Booking Submission Service
 * Handles processing of booking form submissions and creation of bookings
 */
export class BulkBookingSubmissionService {
  /**
   * Process a single booking form submission
   * 
   * @param formId The ID of the form
   * @param formData The form data
   * @param sourceUrl Optional source URL for the submission
   * @returns Result of the submission process with booking ID and submission ID
   */
  async processSubmission(formId: string, formData: Record<string, any>, sourceUrl?: string): Promise<SubmissionResult> {
    try {
      logger.info(`Processing booking submission for form ${formId}`, 'forms');
      console.log(`[BOOKING SUBMISSION] Processing submission for form ${formId}`);
      console.log(`[BOOKING SUBMISSION] Raw form data:`, formData);
      
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
      
      console.log(`[BOOKING SUBMISSION] Form type: ${form?.type || 'unknown'}, Form name: ${form?.name || 'unnamed'}`);

      if (!form) {
        const error = `Form not found: ${formId}`;
        logger.error(error, 'forms');
        console.log(`[BOOKING SUBMISSION] Error: ${error}`);
        return {
          success: false,
          message: 'Form not found',
          error
        };
      }

      // Verify this is a booking form
      if (form.type !== 'BOOKING') {
        const error = `Form is not a booking form: ${formId}`;
        logger.error(error, 'forms');
        console.log(`[BOOKING SUBMISSION] Error: ${error}`);
        return {
          success: false,
          message: 'Form is not a booking form',
          error
        };
      }

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

      // Map form fields to standard fields (name, email, phone, date, etc.)
      console.log(`[BOOKING SUBMISSION] Mapping form fields to standard fields`);
      const mappedData: StandardMappedFields = mapFormFields(mappingFormConfig, formData, { logMappingProcess: true });
      
      // Debug log the mapped data before modification
      console.log(`[BOOKING SUBMISSION] [DEBUG] Initial mappedData:`, JSON.stringify(mappedData));
      
      // Process booking data to ensure we have all required fields
      const processedData: Record<string, any> = processBookingData(mappedData, formData);
      
      // Use the processed data as our final data
      const finalData: Record<string, any> = processedData;
      
      // Debug log the final data
      console.log(`[BOOKING SUBMISSION] Processed data:`, finalData);
      
      // Extract field configurations from form sections
      const allFields: FieldConfig[] = [];
      formSections.forEach(section => {
        const sectionFields = typeof section.fields === 'string' 
          ? JSON.parse(section.fields) 
          : (Array.isArray(section.fields) ? section.fields : []);
        allFields.push(...sectionFields);
      });
      
      // Create metadata for mapped fields using booking-specific helper
      const mappedFieldsMetadata = createBookingMappedFieldsMetadata(formData, allFields);
      
      // Create metadata for section info using booking-specific helper
      const sectionInfoMetadata = createBookingSectionInfoMetadata(formSections);
      
      // Create the final submission data using booking-specific helper
      const submissionData = createBookingFinalSubmissionData(formData, finalData, mappedFieldsMetadata, sectionInfoMetadata);
      
      // Generate tracking token and timestamp
      const timestamp = new Date().getTime().toString();
      const trackingToken = `booking-${formId}-${timestamp}`;
      
      // Create form submission record
      console.log(`[BOOKING SUBMISSION] Creating form submission record with __mappedFields metadata`);
      const formSubmission = await prisma.formSubmission.create({
        data: {
          formId,
          data: submissionData,
          trackingToken,
          timeStamp: timestamp
        }
      });
      
      logger.info(`Created form submission: ${formSubmission.id}`, 'forms');
      console.log(`[BOOKING SUBMISSION] Created form submission with ID: ${formSubmission.id}`);
      
      // Extract the form URL (source) for tracking
      const formUrl = sourceUrl || 'direct-api';
      console.log(`[BOOKING SUBMISSION] Form URL (source): ${formUrl}`);
      
      // Extract contact information from the mapped data
      const name = finalData && typeof finalData.name === 'string' ? finalData.name : '';
      const email = finalData && typeof finalData.email === 'string' ? finalData.email : '';
      const phone = finalData && typeof finalData.phone === 'string' ? finalData.phone : '';
      
      // Create booking record using the booking service
      console.log(`[BOOKING SUBMISSION] Creating booking record`);
      const bookingId = await createBookingFromFormData(formId, finalData || {}, formData as Record<string, any>);
      
      // Update the form submission with the booking ID
      if (bookingId) {
        console.log(`[BOOKING SUBMISSION] Updating form submission with booking ID: ${bookingId}`);
        await prisma.formSubmission.update({
          where: { id: formSubmission.id },
          data: { bookingId }
        });
      }

      return {
        success: true,
        message: 'Booking form submission processed successfully',
        submissionId: formSubmission.id,
        bookingId
      };
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      logger.error(`Error processing booking form submission: ${errorMessage}`, 'forms');
      console.log(`[BOOKING SUBMISSION] Error processing form submission:`, error);
      
      return {
        success: false,
        message: 'Error processing booking form submission',
        error: errorMessage
      };
    }
  }
}

// Export a singleton instance of the service
export const bulkBookingSubmissionService = new BulkBookingSubmissionService();
