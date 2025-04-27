/**
 * Submission Repository
 * 
 * This file contains the repository for form submission operations.
 */

import { FormSubmission } from '@prisma/client';
import { prisma, BaseRepository } from './baseRepository';
import { FormSubmissionData } from '../core/types';

export class SubmissionRepository extends BaseRepository {
  /**
   * Create a new form submission
   */
  async createSubmission(data: {
    formId: string;
    data: FormSubmissionData;
    leadId?: string;
    bookingId?: string;
    sourceLeadId?: string;
    trackingToken?: string;
    timeStamp?: string;
  }): Promise<FormSubmission> {
    const { formId, data: submissionData, leadId, bookingId, sourceLeadId, trackingToken, timeStamp } = data;
    
    // Create the submission
    const submission = await prisma.formSubmission.create({
      data: {
        formId,
        data: JSON.stringify(submissionData),
        // Include optional fields if provided
        ...(leadId ? { leadId } : {}),
        ...(bookingId ? { bookingId } : {}),
        ...(sourceLeadId ? { sourceLeadId } : {}),
        ...(trackingToken ? { trackingToken } : {}),
        ...(timeStamp ? { timeStamp } : {}),
      },
    });
    
    return submission;
  }

  /**
   * Get all submissions for a form
   */
  async getSubmissionsByFormId(formId: string): Promise<any[]> {
    const submissions = await prisma.formSubmission.findMany({
      where: {
        formId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    // Parse the JSON data for each submission
    return submissions.map(submission => ({
      ...submission,
      data: JSON.parse(submission.data as string),
    }));
  }

  /**
   * Get a submission by ID
   */
  async getSubmissionById(id: string): Promise<any | null> {
    const submission = await prisma.formSubmission.findUnique({
      where: {
        id,
      },
    });
    
    if (!submission) {
      return null;
    }
    
    // Parse the JSON data
    return {
      ...submission,
      data: JSON.parse(submission.data as string),
    };
  }

  /**
   * Update a submission
   */
  async updateSubmission(id: string, data: Partial<any>): Promise<any> {
    // Extract data that needs to be stringified
    const { data: submissionData, ...rest } = data;
    
    const updateData: any = {
      ...rest,
    };
    
    // Stringify JSON fields if provided
    if (submissionData) {
      updateData.data = JSON.stringify(submissionData);
    }
    
    const submission = await prisma.formSubmission.update({
      where: {
        id,
      },
      data: updateData,
    });
    
    return {
      ...submission,
      data: JSON.parse(submission.data as string),
      metadata: submission.metadata ? JSON.parse(submission.metadata as string) : null,
    };
  }

  /**
   * Delete a submission
   */
  async deleteSubmission(id: string): Promise<any> {
    return prisma.formSubmission.delete({
      where: {
        id,
      },
    });
  }

  /**
   * Process form submission data for leads/bookings
   */
  async processSubmissionData(formId: string, submissionData: FormSubmissionData): Promise<Record<string, any>> {
    // Get the form with its fields to determine mappings
    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: {
        sections: {
          include: {
            fields: true,
          },
        },
      },
    });
    
    if (!form) {
      throw new Error(`Form with ID ${formId} not found`);
    }
    
    // Initialize processed data
    const processedData: Record<string, any> = {
      formId,
      rawData: submissionData,
    };
    
    // Process fields based on their mappings
    if (form.sections) {
      for (const section of form.sections) {
        for (const field of section.fields) {
          try {
            // Get the field mapping if it exists
            const mapping = field.mapping ? JSON.parse(field.mapping as string) : null;
            
            if (mapping && submissionData[field.name]) {
              if (mapping.type === 'email') {
                processedData.email = submissionData[field.name];
              } else if (mapping.type === 'name') {
                processedData.name = submissionData[field.name];
              } else if (mapping.type === 'phone') {
                processedData.phone = submissionData[field.name];
              } else if (mapping.type === 'custom' && mapping.customKey) {
                processedData[mapping.customKey] = submissionData[field.name];
              } else {
                // Default mapping by field type
                processedData[mapping.type] = submissionData[field.name];
              }
            }
          } catch (error) {
            console.error(`Error processing field mapping for ${field.name}:`, error);
          }
        }
      }
    }
    
    return processedData;
  }
}
