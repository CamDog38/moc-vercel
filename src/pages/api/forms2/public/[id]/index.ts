/**
 * Form System 2.0 API - Public Form Detail Endpoint
 * 
 * GET: Get a specific form with sections and fields for public viewing
 * This endpoint does not require authentication and is used for public form views
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { FormRepository } from '@/lib/forms2/repositories/formRepository';
import { prisma } from '@/lib/forms2/repositories/baseRepository';
import * as logger from '@/util/logger';

const formRepository = new FormRepository();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Form ID is required' });
  }

  try {
    // GET - Get a specific form with sections and fields for public viewing
    if (req.method === 'GET') {
      logger.info(`Public form request for form ID: ${id}`, 'forms');
      
      const form = await formRepository.getFormById(id);
      
      if (!form) {
        logger.warn(`Public form not found: ${id}`, 'forms');
        return res.status(404).json({ error: 'Form not found' });
      }
      
      // Parse form fields
      const formFields = typeof form.fields === 'string' ? JSON.parse(form.fields) : form.fields;
      
      // All forms are public by default for now
      // No need to check isPublic flag
      logger.info(`Form ${id} accessed publicly`, 'forms');
      
      // Check if the form is active
      if (!form.isActive) {
        logger.warn(`Attempted to access inactive form: ${id}`, 'forms');
        return res.status(403).json({ error: 'This form is currently inactive' });
      }

      // Get the form sections
      const sections = await prisma.formSection.findMany({
        where: { formId: id },
        orderBy: { order: 'asc' },
        include: {
          fields: {
            orderBy: { order: 'asc' },
          },
        },
      });

      // Parse fields JSON if needed
      const parsedSections = sections.map(section => {
        // Log the section for debugging
        console.log(`Processing section ${section.id}:`, section.title || 'Unnamed Section');
        
        return {
          ...section,
          fields: section.fields.map(field => {
            // Log the field options for debugging
            console.log(`Field ${field.id} (${field.type}) raw options:`, field.options);
            
            let parsedOptions;
            if (field.options) {
              if (typeof field.options === 'string') {
                try {
                  parsedOptions = JSON.parse(field.options);
                  console.log(`Field ${field.id} parsed options:`, parsedOptions);
                } catch (e) {
                  console.error(`Error parsing options for field ${field.id}:`, e);
                  parsedOptions = [];
                }
              } else {
                parsedOptions = field.options;
                console.log(`Field ${field.id} object options:`, parsedOptions);
              }
            } else {
              console.log(`Field ${field.id} has no options`);
              parsedOptions = undefined;
            }
            
            return {
              ...field,
              options: parsedOptions,
              validation: field.validation ? 
                (typeof field.validation === 'string' ? JSON.parse(field.validation) : field.validation) : 
                undefined,
              conditionalLogic: field.conditionalLogic ? 
                (typeof field.conditionalLogic === 'string' ? JSON.parse(field.conditionalLogic) : field.conditionalLogic) : 
                undefined,
            };
          }),
        };
      });

      // Create form config object
      const formConfig = {
        id: form.id,
        title: form.name,
        description: form.description || '',
        type: form.type,
        sections: parsedSections,
        submitButtonText: formFields?.submitButtonText || 'Submit',
        successMessage: formFields?.successMessage || 'Thank you for your submission!',
        theme: formFields?.theme || {
          primaryColor: '#3b82f6',
          primaryColorHover: '#2563eb',
          buttonTextColor: '#ffffff',
        }
      };

      logger.info(`Public form successfully retrieved: ${id}`, 'forms');
      return res.status(200).json({ 
        form,
        formConfig
      });
    }

    // Only GET method is allowed for public forms
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in public form API:', error);
    logger.error(`Error in public form API: ${error instanceof Error ? error.message : 'Unknown error'}`, 'forms', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
