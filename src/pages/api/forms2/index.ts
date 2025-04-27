/**
 * Form System 2.0 API - Forms Endpoint
 * 
 * GET: List all forms
 * POST: Create a new form
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/util/supabase/server';
import { FormRepository } from '@/lib/forms2/repositories/formRepository';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
  const formRepository = new FormRepository();

  try {
    // GET - List all forms
    if (req.method === 'GET') {
      console.log('Fetching Form System 2.0 forms for user:', userId);
      
      // Get all forms first to see what's available
      const allForms = await prisma.form.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      });
      
      console.log('All forms count:', allForms.length);
      
      // Log some sample data to see what's in the database
      if (allForms.length > 0) {
        console.log('Sample form data:', {
          id: allForms[0].id,
          name: allForms[0].name,
          type: allForms[0].type,
          isActive: allForms[0].isActive
        });
        console.log('Sample form fields type:', typeof allForms[0].fields);
      } else {
        console.log('No forms found in the database for this user');
      }
      
      // If no forms are found, return an empty array early
      if (allForms.length === 0) {
        return res.status(200).json([]);
      }
      
      // Get filtered forms
      const forms = await formRepository.getAllForms(userId);
      console.log('Filtered forms count:', forms.length);
      
      // If no filtered forms are found, use all forms as a fallback
      const formsToTransform = forms.length > 0 ? forms : allForms;
      
      // Transform the data to match the expected format in the frontend
      const transformedForms = formsToTransform.map(form => {
        // Parse fields from JSON if it's a string
        let fieldsObj = {};
        try {
          if (form.fields) {
            fieldsObj = typeof form.fields === 'string' 
              ? JSON.parse(form.fields) 
              : form.fields;
          }
        } catch (e) {
          console.error('Error parsing fields for form', form.id, e);
        }
        
        // Create a form object that matches the format expected by the frontend
        const transformedForm = {
          id: form.id,
          name: form.name, // Include both name and title for compatibility
          title: form.name,
          description: form.description || '',
          createdAt: form.createdAt,
          updatedAt: form.updatedAt,
          isActive: form.isActive !== undefined ? form.isActive : true,
          isPublic: fieldsObj && 'isPublic' in fieldsObj ? fieldsObj.isPublic : false,
          type: form.type || 'standard',
          version: '2.0',
          legacyFormId: 'legacyFormId' in form ? form.legacyFormId : null
        };
        
        console.log(`Transformed form ${form.id}:`, transformedForm);
        return transformedForm;
      });
      
      console.log(`Returning ${transformedForms.length} forms`);
      
      return res.status(200).json(transformedForms);
    }
    
    // POST - Create a new form
    if (req.method === 'POST') {
      const { title, description, type, isActive, isPublic, submitButtonText, successMessage, legacyFormId, formConfig, name } = req.body;
      
      if (!title) {
        return res.status(400).json({ error: 'Title is required' });
      }
      
      const form = await formRepository.createForm({
        title,
        description,
        type: type || 'standard',
        userId,
        isActive,
        isPublic,
        submitButtonText,
        successMessage,
        legacyFormId,
        formConfig,
        // Use the provided name or fall back to title if name is not provided
        name: name || title,
      });
      
      return res.status(201).json(form);
    }
    
    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in forms2 API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
