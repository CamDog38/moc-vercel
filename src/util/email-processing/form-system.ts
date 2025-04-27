import { Form, FormSubmission } from '@prisma/client';
import prisma from '@/lib/prisma';
import { addApiLog } from '@/pages/api/debug/logs';

/**
 * Helper function to determine if a form is using Form System 2.0
 */
export function isFormSystem2(form: any): boolean {
  // Check if form has a source property indicating it's from Form System 2.0
  if (form?.source === 'forms2-api') {
    console.log('[Forms2] Detected Form System 2.0 based on form source');
    return true;
  }
  
  // Check if form has a formSystem property set to 2.0
  if (form?.formSystem === '2.0') {
    console.log('[Forms2] Detected Form System 2.0 based on formSystem property');
    return true;
  }
  
  // Check if form ID has a specific format that indicates Form System 2.0
  if (form?.id && typeof form.id === 'string' && form.id.startsWith('cm')) {
    console.log('[Forms2] Detected Form System 2.0 based on form ID format');
    return true;
  }
  
  // Check submission source
  if (form?.submission?.source === 'forms2-api') {
    console.log('[Forms2] Detected Form System 2.0 based on submission source');
    return true;
  }
  
  return false;
}

/**
 * Process form data for variable replacement
 * This extracts and flattens data from Form System 2.0 submissions
 */
export function processFormData(submission: FormSubmission): Record<string, any> {
  const processedData: Record<string, any> = {};
  
  // Add submission data
  processedData.submission = submission;
  processedData.formSubmission = submission;
  
  // Add lead ID if available
  if (submission.leadId) {
    processedData.leadId = submission.leadId;
  }
  
  // Add timestamp
  if (submission.timeStamp) {
    processedData.timeStamp = submission.timeStamp;
  } else if (submission.createdAt) {
    // Convert Date to timestamp string
    if (submission.createdAt instanceof Date) {
      processedData.timeStamp = submission.createdAt.getTime().toString();
    } else if (typeof submission.createdAt === 'string') {
      try {
        processedData.timeStamp = new Date(submission.createdAt).getTime().toString();
      } catch (e) {
        processedData.timeStamp = submission.createdAt;
      }
    }
  } else {
    processedData.timeStamp = Date.now().toString();
  }
  
  // Flatten submission data for direct access
  if (submission?.data && typeof submission.data === 'object') {
    Object.entries(submission.data).forEach(([key, value]) => {
      processedData[key] = value;
      
      // Special case for firstName extraction
      if (key.toLowerCase() === 'name' || key.toLowerCase() === 'fullname') {
        const nameParts = String(value).split(' ');
        if (nameParts.length > 0) {
          processedData.firstName = nameParts[0];
        }
      }
    });
    
    // Also add formData property for consistent access
    processedData.formData = submission.data;
  }
  
  // Ensure firstName is available
  if (!processedData.firstName) {
    // Try to extract from name field
    if (processedData.name && typeof processedData.name === 'string') {
      const nameParts = processedData.name.split(' ');
      if (nameParts.length > 0) {
        processedData.firstName = nameParts[0];
      }
    }
    
    // If still not found, check formData
    if (!processedData.firstName && processedData.formData) {
      // Check common field names
      if (processedData.formData.firstName) {
        processedData.firstName = processedData.formData.firstName;
      } else if (processedData.formData.first_name) {
        processedData.firstName = processedData.formData.first_name;
      } else if (processedData.formData.name) {
        const nameParts = String(processedData.formData.name).split(' ');
        if (nameParts.length > 0) {
          processedData.firstName = nameParts[0];
        }
      }
    }
    
    // If still not found, use default
    if (!processedData.firstName) {
      processedData.firstName = "Customer";
    }
  }
  
  return processedData;
}

/**
 * Extract field mappings from form structure
 * This is especially important for Form System 2.0 where field IDs might be different
 */
export async function extractFieldMappings(formId: string, formData: Record<string, any>): Promise<Record<string, any>> {
  const formDataWithMappings = { ...formData };
  
  try {
    // Get form with fields and their mappings
    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: {
        formSections: {
          include: {
            fields: {
              select: {
                id: true,
                type: true,
                mapping: true,
                label: true
              }
            }
          }
        }
      }
    });
    
    if (form?.formSections) {
      // Extract fields from all sections
      const formFields = form.formSections.flatMap((section: any) => section.fields || []);
      
      // Map fields to form data
      formFields.forEach((field: any) => {
        // Map both the field ID and any custom mapping to the field value
        if (field && field.id && formData[field.id] !== undefined) {
          formDataWithMappings[field.id] = formData[field.id];
          if (field.mapping) {
            formDataWithMappings[field.mapping] = formData[field.id];
          }
          
          // Also map using the field label for better variable replacement
          if (field.label) {
            formDataWithMappings[field.label] = formData[field.id];
          }
        }
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    addApiLog(`Error extracting field mappings: ${errorMessage}`, 'error', 'emails');
  }
  
  return formDataWithMappings;
}
