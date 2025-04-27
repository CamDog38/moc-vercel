/**
 * Form System 2.0 API - Form Duplication Endpoint
 * 
 * POST: Duplicate a form with all its sections and fields
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/util/supabase/server';
import { FormRepository } from '@/lib/forms2/repositories/formRepository';
import { prisma } from '@/lib/forms2/repositories/baseRepository';

const formRepository = new FormRepository();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Create a Supabase client authenticated with the user's session cookie
  const supabase = createServerSupabaseClient({ req, res });
  
  // Get the user from the session
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = user.id;
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Form ID is required' });
  }

  try {
    // First check if the form exists and belongs to the user
    const existingForm = await formRepository.getFormById(id);
    
    if (!existingForm) {
      return res.status(404).json({ error: 'Form not found' });
    }
    
    if (existingForm.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    // Get the form sections and fields
    const sections = await prisma.formSection.findMany({
      where: { formId: id },
      include: { fields: true },
      orderBy: { order: 'asc' }
    });
    
    // Start a transaction to duplicate the form with all its sections and fields
    const duplicatedForm = await prisma.$transaction(async (tx) => {
      // Create a new form with similar data but a different name
      const newForm = await tx.form.create({
        data: {
          name: `${existingForm.name} (Copy)`,
          description: existingForm.description,
          type: existingForm.type,
          userId: userId,
          isActive: existingForm.isActive,
          isMultiPage: existingForm.isMultiPage,
          fields: existingForm.fields, // This contains version, isPublic, etc.
        },
      });
      
      // Duplicate all sections and fields
      for (const section of sections) {
        const newSection = await tx.formSection.create({
          data: {
            formId: newForm.id,
            title: section.title,
            description: section.description,
            order: section.order,
            conditionalLogic: section.conditionalLogic,
          },
        });
        
        // Duplicate all fields in this section
        for (const field of section.fields) {
          await tx.formField.create({
            data: {
              sectionId: newSection.id,
              type: field.type,
              label: field.label,
              name: field.name,
              placeholder: field.placeholder,
              helpText: field.helpText,
              required: field.required,
              order: field.order,
              config: field.config,
              validation: field.validation,
              conditionalLogic: field.conditionalLogic,
              mapping: field.mapping,
              stableId: field.stableId,
              inUseByRules: field.inUseByRules,
            },
          });
        }
      }
      
      return newForm;
    });
    
    return res.status(200).json(duplicatedForm);
  } catch (error) {
    console.error('Error duplicating form:', error);
    return res.status(500).json({ error: 'Failed to duplicate form' });
  }
}
