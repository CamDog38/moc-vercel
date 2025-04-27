/**
 * Bulk Lead Submission Service
 * 
 * This service handles form submissions with proper name field handling,
 * creating leads and form submissions while being completely detached from email sending.
 */

import { prisma } from '@/lib/prisma';
import * as logger from '@/util/logger';
import { v4 as uuidv4 } from 'uuid';
import { mapFormFields } from '../mapping';
import { extractContactInfo } from '../mapping/contactInfoExtractor';
import { FieldConfig } from '@/lib/forms2/core/types';
import {
  processNameFields,
  processPhoneField,
  createMappedFieldsMetadata,
  createSectionInfoMetadata,
  createFinalSubmissionData
} from './helpers';

/**
 * Submission result interface
 */
interface SubmissionResult {
  success: boolean;
  message: string;
  submissionId?: string;
  leadId?: string;
  error?: string;
}

/**
 * Bulk Lead Submission Service
 * Handles processing of form submissions and creation of leads
 */
export class BulkLeadSubmissionService {
  /**
   * Process a single form submission with proper name handling
   * 
   * @param formId The ID of the form
   * @param formData The form data
   * @param sourceUrl Optional source URL for the submission
   * @returns Result of the submission process with lead ID and submission ID
   */
  async processSubmission(formId: string, formData: Record<string, any>, sourceUrl?: string): Promise<SubmissionResult> {
    try {
      logger.info(`Processing submission for form ${formId}`, 'forms');
      console.log(`[LEAD SUBMISSION] Processing submission for form ${formId}`);
      console.log(`[LEAD SUBMISSION] Raw form data:`, formData);
      
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
      
      console.log(`[LEAD SUBMISSION] Form type: ${form?.type || 'unknown'}, Form name: ${form?.name || 'unnamed'}`);

      if (!form) {
        const error = `Form not found: ${formId}`;
        logger.error(error, 'forms');
        console.log(`[LEAD SUBMISSION] Error: ${error}`);
        return {
          success: false,
          message: 'Form not found',
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

      // Map form fields to standard fields (name, email, phone, etc.)
      console.log(`[LEAD SUBMISSION] Mapping form fields to standard fields`);
      const mappedData = mapFormFields(mappingFormConfig, formData, { logMappingProcess: true });
      
      // Debug log the mapped data before modification
      console.log(`[LEAD SUBMISSION] [DEBUG] Initial mappedData:`, JSON.stringify(mappedData));
      
      // CRITICAL: Direct access to inquiry form fields
      // This is the most reliable way to get first and last name
      const hasFirstName = !!formData.inquiry_form_first_name;
      const hasLastName = !!formData.inquiry_form_last_name;
      
      console.log(`[LEAD SUBMISSION] [DEBUG] Direct form fields: firstName=${hasFirstName ? formData.inquiry_form_first_name : 'undefined'}, lastName=${hasLastName ? formData.inquiry_form_last_name : 'undefined'}`);
      
      // Ensure we have first_name and last_name from inquiry form fields if available
      if (hasFirstName) {
        mappedData.firstName = formData.inquiry_form_first_name;
        mappedData.first_name = formData.inquiry_form_first_name;
        console.log(`[LEAD SUBMISSION] Added firstName from inquiry_form_first_name: ${mappedData.firstName}`);
      }
      
      if (hasLastName) {
        mappedData.lastName = formData.inquiry_form_last_name;
        mappedData.last_name = formData.inquiry_form_last_name;
        console.log(`[LEAD SUBMISSION] Added lastName from inquiry_form_last_name: ${mappedData.lastName}`);
      }
      
      // If we have both first and last name from inquiry form fields, combine them for the name field
      if (hasFirstName && hasLastName) {
        mappedData.name = `${formData.inquiry_form_first_name} ${formData.inquiry_form_last_name}`;
        console.log(`[LEAD SUBMISSION] Combined inquiry form first and last name into name: "${mappedData.name}"`);
      }
      
      // Debug log the mapped data after modification
      console.log(`[LEAD SUBMISSION] [DEBUG] Modified mappedData:`, JSON.stringify(mappedData));
      
      // Get all fields from the form configuration
      const allFields: FieldConfig[] = [];
      if (formSections && Array.isArray(formSections)) {
        formSections.forEach(section => {
          const sectionFields = typeof section.fields === 'string' 
            ? JSON.parse(section.fields) 
            : (Array.isArray(section.fields) ? section.fields : []);
          allFields.push(...sectionFields);
        });
      }
      
      // Create the __mappedFields metadata structure
      const mappedFields = createMappedFieldsMetadata(formData, allFields);
      
      // Create the __sectionInfo metadata structure
      const sectionInfo = createSectionInfoMetadata(formSections);
      
      // Process name fields to ensure proper handling
      console.log(`[LEAD SUBMISSION] Processing name fields for proper handling`);
      let processedData = processNameFields(mappedData, formData);
      
      // Extra check to ensure name is combined from first and last name
      if (processedData.firstName && processedData.lastName && (!processedData.name || processedData.name === processedData.firstName)) {
        processedData.name = `${processedData.firstName} ${processedData.lastName}`;
        console.log(`[LEAD SUBMISSION] Combined firstName and lastName into name: "${processedData.name}"`);
      }
      
      // Final check for inquiry form fields - this is a critical step to ensure name combination
      if (formData.inquiry_form_first_name && formData.inquiry_form_last_name) {
        const firstName = formData.inquiry_form_first_name;
        const lastName = formData.inquiry_form_last_name;
        
        if (typeof firstName === 'string' && typeof lastName === 'string') {
          processedData.firstName = firstName;
          processedData.lastName = lastName;
          processedData.name = `${firstName} ${lastName}`;
          processedData.first_name = firstName;
          processedData.last_name = lastName;
          console.log(`[LEAD SUBMISSION] Final name combination from inquiry form fields: "${processedData.name}"`);
        }
      }
      
      // Process phone field to ensure it's not a date
      console.log(`[LEAD SUBMISSION] Processing phone field to ensure it's not a date`);
      processedData.phone = processPhoneField(processedData.phone, formData);
      
      // Create the final submission data with all metadata
      let submissionData = createFinalSubmissionData(
        formData,
        processedData,
        mappedFields,
        sectionInfo
      );
      
      // Ensure processed data is in the submission data
      submissionData = { 
        ...submissionData,
        ...processedData 
      };
      
      // CRITICAL: Final check for name combination
      // If we have inquiry form fields for first and last name, make sure they're used
      if (formData.inquiry_form_first_name && formData.inquiry_form_last_name) {
        // Force the name to be the combination of first and last name
        const originalName = submissionData.name;
        submissionData.name = `${formData.inquiry_form_first_name} ${formData.inquiry_form_last_name}`;
        // Also set firstName and lastName explicitly
        submissionData.firstName = formData.inquiry_form_first_name;
        submissionData.lastName = formData.inquiry_form_last_name;
        console.log(`[LEAD SUBMISSION] [FINAL CHECK] Changed name from "${originalName}" to "${submissionData.name}"`);
      }
      
      // CRITICAL: Direct check for mapped data fields
      if (submissionData.inquiry_form_first_name && submissionData.inquiry_form_last_name) {
        const originalName = submissionData.name;
        submissionData.name = `${submissionData.inquiry_form_first_name} ${submissionData.inquiry_form_last_name}`;
        console.log(`[LEAD SUBMISSION] [DIRECT CHECK] Changed name from "${originalName}" to "${submissionData.name}"`);
      }
      
      console.log(`[LEAD SUBMISSION] Processed data:`, {
        name: submissionData.name,
        firstName: submissionData.firstName,
        lastName: submissionData.lastName,
        email: submissionData.email,
        phone: submissionData.phone,
        __mappedFields: Object.keys(submissionData.__mappedFields || {})
      });

      // Create the submission record first with proper metadata
      console.log(`[LEAD SUBMISSION] Creating form submission record with __mappedFields metadata`);
      
      // Generate timestamp for both submission and tracking token
      const timestamp = new Date().getTime().toString();
      
      // Generate a temporary lead ID for the tracking token
      // This will be updated later when the actual lead is created
      const tempLeadId = `submission-${formId.substring(0, 8)}`;
      
      // Create the tracking token with the format {{leadId}}-{{timeStamp}}
      const trackingToken = `${tempLeadId}-${timestamp}`;
      console.log(`[LEAD SUBMISSION] Generated tracking token: ${trackingToken}`);
      
      const formSubmission = await prisma.formSubmission.create({
        data: {
          formId,
          data: submissionData,
          trackingToken: trackingToken,
          timeStamp: timestamp
        }
      });
      
      console.log(`[LEAD SUBMISSION] Form submission created with metadata structure:`, {
        submissionId: formSubmission.id,
        hasMappedFields: submissionData.__mappedFields ? 'yes' : 'no',
        mappedFieldsCount: submissionData.__mappedFields ? Object.keys(submissionData.__mappedFields).length : 0
      });

      logger.info(`Created form submission: ${formSubmission.id}`, 'forms');
      console.log(`[LEAD SUBMISSION] Created form submission with ID: ${formSubmission.id}`);

      // Create a lead if this is an inquiry form
      let leadId: string | undefined;
      
      // Use the provided source URL or default to 'public_form'
      const formUrl = sourceUrl || 'public_form';
      console.log(`[LEAD SUBMISSION] Form URL (source): ${formUrl}`);
      
      // Fallback to raw form data if mapping didn't work
      let email = submissionData.email;
      let name = submissionData.name;
      let phone = submissionData.phone;
      
      if (!email && !name && !phone) {
        console.log(`[LEAD SUBMISSION] No mapped data found, attempting to extract directly from form data`);
        logger.info(`No mapped data found, attempting to extract directly from form data`, 'forms');
        
        // Try to find email, name, and phone in the raw form data
        const extractedData = extractContactInfo(formData);
        
        // Use found values if available
        if (extractedData.email || extractedData.name || extractedData.phone) {
          email = extractedData.email;
          name = extractedData.name;
          phone = extractedData.phone;
          
          console.log(`[LEAD SUBMISSION] Using extracted values: email=${email}, name=${name}, phone=${phone}`);
          logger.info(`Using extracted values: email=${email}, name=${name}, phone=${phone}`, 'forms');
        }
      }
      
      // Check if we have the __mappedFields structure
      if (submissionData.__mappedFields) {
        console.log(`[LEAD SUBMISSION] Found __mappedFields in submissionData:`, submissionData.__mappedFields);
        const mappedFields = submissionData.__mappedFields;
        
        // Extract first name and last name from mapped fields if available
        let firstName = '';
        let lastName = '';
        let rawNameField = '';
        
        // Store the raw name field, but don't use it yet - we'll prioritize firstName + lastName
        if (mappedFields.name && mappedFields.name.value) {
          rawNameField = mappedFields.name.value;
          console.log(`[LEAD SUBMISSION] Found raw name field in __mappedFields: ${rawNameField}`);
        }
        
        // Check for firstName in mappedFields
        if (mappedFields.firstName && mappedFields.firstName.value) {
          firstName = mappedFields.firstName.value;
          console.log(`[LEAD SUBMISSION] Found firstName in __mappedFields: ${firstName}`);
        }
        
        // Check for lastName in mappedFields
        if (mappedFields.lastName && mappedFields.lastName.value) {
          lastName = mappedFields.lastName.value;
          console.log(`[LEAD SUBMISSION] Found lastName in __mappedFields: ${lastName}`);
        }
        
        // ALWAYS prioritize firstName + lastName combination if available
        if (firstName && lastName) {
          const originalName = submissionData.name;
          submissionData.name = `${firstName} ${lastName}`;
          console.log(`[LEAD SUBMISSION] Prioritizing firstName + lastName: Changed name from "${originalName}" to "${submissionData.name}"`);
        }
      }
      
      // Final check - log the data we're about to use for creating the lead
      console.log(`[LEAD SUBMISSION] FINAL DATA for lead creation:`, {
        email: email || submissionData.email,
        name: name || submissionData.name,
        phone: submissionData.phone,
        source: formUrl,
        formId
      });
      
      // Create the lead record using the processed data
      // CRITICAL: Always use inquiry form fields if available
      let finalName;
      
      // CRITICAL: Always use inquiry form fields if available - most reliable source
      if (formData.inquiry_form_first_name && formData.inquiry_form_last_name) {
        finalName = `${formData.inquiry_form_first_name} ${formData.inquiry_form_last_name}`;
        console.log(`[LEAD SUBMISSION] [CRITICAL] Using direct inquiry form fields for name: "${finalName}"`);
      } else if (submissionData.inquiry_form_first_name && submissionData.inquiry_form_last_name) {
        // Also check in submissionData for these fields
        finalName = `${submissionData.inquiry_form_first_name} ${submissionData.inquiry_form_last_name}`;
        console.log(`[LEAD SUBMISSION] [CRITICAL] Using inquiry form fields from submissionData: "${finalName}"`);
      } else {
        // Fallback to other sources
        finalName = name || submissionData.name || '';
        const firstNameValue = submissionData.firstName || submissionData.first_name || formData.inquiry_form_first_name || '';
        const lastNameValue = submissionData.lastName || submissionData.last_name || formData.inquiry_form_last_name || '';
        
        // If we have both first and last name but the name field doesn't contain both,
        // create a combined name
        if (firstNameValue && lastNameValue && (!finalName || finalName === firstNameValue || !finalName.includes(lastNameValue))) {
          finalName = `${firstNameValue} ${lastNameValue}`;
          console.log(`[LEAD SUBMISSION] Created combined name for lead record: "${finalName}"`);
        }
      }
      
      // Debug log the final name
      console.log(`[LEAD SUBMISSION] [DEBUG] Final name decision: "${finalName}"`);
      
      // Store first and last name in notes field since Lead model doesn't have these fields
      let notesContent = '';
      const firstNameForNotes = formData.inquiry_form_first_name || submissionData.inquiry_form_first_name || submissionData.firstName || submissionData.first_name || '';
      const lastNameForNotes = formData.inquiry_form_last_name || submissionData.inquiry_form_last_name || submissionData.lastName || submissionData.last_name || '';
      
      // FINAL SAFETY CHECK: If we have first and last name but finalName doesn't reflect that, fix it
      if (firstNameForNotes && lastNameForNotes && (!finalName || finalName === firstNameForNotes || !finalName.includes(lastNameForNotes))) {
        finalName = `${firstNameForNotes} ${lastNameForNotes}`;
        console.log(`[LEAD SUBMISSION] [FINAL SAFETY] Fixed name to be combination of first and last name: "${finalName}"`);
      }
      
      if (firstNameForNotes || lastNameForNotes) {
        notesContent = `First Name: ${firstNameForNotes || 'N/A'}\nLast Name: ${lastNameForNotes || 'N/A'}`;
        console.log(`[LEAD SUBMISSION] Storing first and last name in notes field`);
      }
      
      const leadRecord = await prisma.lead.create({
        data: {
          name: finalName,
          email: email || submissionData.email || '',
          phone: phone || submissionData.phone || '',
          formId,
          status: 'NEW',
          source: formUrl, // Use the form URL as the source
          notes: notesContent, // Store first/last name in notes field
          // Connect this lead to the form submission
          submissions: {
            connect: { id: formSubmission.id }
          }
        }
      });

      leadId = leadRecord.id;
      logger.info(`Created lead: ${leadRecord.id}`, 'forms');
      console.log(`[LEAD SUBMISSION] Created lead with ID: ${leadRecord.id}`);
      
      // Update the submission with the lead ID and update the tracking token with the actual lead ID
      if (leadId) {
        console.log(`[LEAD SUBMISSION] Updating form submission with lead ID: ${leadId}`);
        
        // Create a new tracking token with the actual lead ID
        const updatedTrackingToken = `${leadId}-${formSubmission.timeStamp}`;
        console.log(`[LEAD SUBMISSION] Updating tracking token from ${formSubmission.trackingToken} to ${updatedTrackingToken}`);
        
        await prisma.formSubmission.update({
          where: { id: formSubmission.id },
          data: { 
            leadId: leadRecord.id,
            trackingToken: updatedTrackingToken
          }
        });
      }

      return {
        success: true,
        message: 'Form submission processed successfully',
        submissionId: formSubmission.id,
        leadId
      };
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      logger.error(`Error processing form submission: ${errorMessage}`, 'forms');
      console.log(`[LEAD SUBMISSION] Error processing form submission:`, error);
      
      return {
        success: false,
        message: 'Error processing form submission',
        error: errorMessage
      };
    }
  }
}

// Export a singleton instance of the service
export const bulkLeadSubmissionService = new BulkLeadSubmissionService();
