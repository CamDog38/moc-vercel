import { PrismaClient } from '@prisma/client';
import * as logger from '@/util/logger';
import { extractContactInfo } from '@/lib/forms2/services/mapping';

const prisma = new PrismaClient();

/**
 * Creates a lead from the mapped form data
 * @param formId The form ID
 * @param mappedData The mapped form data
 * @param formData The raw form data (used as fallback)
 * @returns The created lead ID
 */
export const createLeadFromFormData = async (
  formId: string,
  mappedData: Record<string, any>,
  formData: Record<string, any>
): Promise<string> => {
  logger.info(`Creating lead for inquiry form: ${formId}`, 'forms');
  
  // Extract email, name, and phone from the mapped data
  let email = mappedData.email || null;
  let name = mappedData.name || null;
  let phone = mappedData.phone || null;
  
  // Log the values we're using for lead creation
  logger.info(`Creating lead with: email=${email}, name=${name}, phone=${phone}`, 'forms');
  
  // Fallback to raw form data if mapping didn't work
  if (!email && !name && !phone) {
    logger.info(`No mapped data found, attempting to extract directly from form data`, 'forms');
    
    // Try to find email, name, and phone in the raw form data
    const extractedData = extractContactInfo(formData);
    
    // Use found values if available
    if (extractedData.email || extractedData.name || extractedData.phone) {
      email = extractedData.email;
      name = extractedData.name;
      phone = extractedData.phone;
      
      logger.info(`Using extracted values: email=${email}, name=${name}, phone=${phone}`, 'forms');
    }
  }
  
  // Create lead with mapped or extracted data
  const lead = await prisma.lead.create({
    data: {
      email,
      name,
      phone,
      source: 'public_form',
      formId,
      status: 'NEW',
    },
  });
  
  logger.info(`Lead created: ${lead.id}`, 'forms');
  return lead.id;
};
