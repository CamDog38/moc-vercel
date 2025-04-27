/**
 * Form System 2.0 API - Async Form Duplication Endpoint
 * 
 * POST: Start an async job to duplicate a form
 * GET: Check the status of an async duplication job
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/util/supabase/server';
import { FormRepository } from '@/lib/forms2/repositories/formRepository';
import { prisma } from '@/lib/forms2/repositories/baseRepository';
import { v4 as uuidv4 } from 'uuid';

// In-memory job store (in production, this should be a database or Redis)
const jobs: Record<string, { status: 'pending' | 'processing' | 'completed' | 'failed', formId?: string, error?: string }> = {};

const formRepository = new FormRepository();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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

  // GET - Check job status
  if (req.method === 'GET') {
    const { jobId } = req.query;
    
    if (!jobId || typeof jobId !== 'string') {
      return res.status(400).json({ error: 'Job ID is required' });
    }
    
    const job = jobs[jobId];
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    return res.status(200).json(job);
  }
  
  // POST - Start duplication job
  if (req.method === 'POST') {
    try {
      // First check if the form exists and belongs to the user
      const existingForm = await formRepository.getFormById(id);
      
      if (!existingForm) {
        return res.status(404).json({ error: 'Form not found' });
      }
      
      if (existingForm.userId !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      
      // Create a new job
      const jobId = uuidv4();
      jobs[jobId] = { status: 'pending' };
      
      // Start the duplication process in the background
      duplicateFormAsync(id, userId, jobId);
      
      return res.status(202).json({ jobId });
    } catch (error) {
      console.error('Error starting form duplication:', error);
      return res.status(500).json({ error: 'Failed to start form duplication' });
    }
  }
  
  // Method not allowed
  return res.status(405).json({ error: 'Method not allowed' });
}

async function duplicateFormAsync(formId: string, userId: string, jobId: string) {
  try {
    // Update job status to processing
    jobs[jobId] = { status: 'processing' };
    
    // Get the form
    const existingForm = await formRepository.getFormById(formId);
    
    if (!existingForm) {
      jobs[jobId] = { status: 'failed', error: 'Form not found' };
      return;
    }
    
    // Get the form sections and fields
    const sections = await prisma.formSection.findMany({
      where: { formId },
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
    
    // Update job status to completed
    jobs[jobId] = { status: 'completed', formId: duplicatedForm.id };
  } catch (error) {
    console.error('Error in async form duplication:', error);
    jobs[jobId] = { status: 'failed', error: (error as Error).message };
  }
}
