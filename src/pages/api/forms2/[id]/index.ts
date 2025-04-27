/**
 * Form System 2.0 API - Form Detail Endpoint
 * 
 * GET: Get a specific form with sections and fields
 * PUT: Update a form
 * DELETE: Delete a form
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/util/supabase/server';
import { FormRepository } from '@/lib/forms2/repositories/formRepository';
import { prisma } from '@/lib/forms2/repositories/baseRepository';

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

  try {
    // GET - Get a specific form with sections and fields
    if (req.method === 'GET') {
      const form = await formRepository.getFormById(id);
      
      if (!form) {
        return res.status(404).json({ error: 'Form not found' });
      }
      
      // Check if the user has access to this form
      if (form.userId !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      
      // Ensure description is never undefined for type compatibility
      // Also ensure fields and sections are properly typed for JsonValue
      const formWithNullableDesc = {
        ...form,
        description: form.description || null,
        fields: form.fields || null,
        sections: form.sections || null,
        isMultiPage: form.isMultiPage || false
      };
      
      // Get the form sections
      const sections = await prisma.formSection.findMany({
        where: { formId: id },
        include: { fields: true },
        orderBy: { order: 'asc' }
      });
      
      // Convert to FormConfig format with better error handling
      let formConfig;
      try {
        formConfig = await formRepository.convertToFormConfig(formWithNullableDesc, sections as any[]);
      } catch (configError) {
        console.error('Error converting form to FormConfig:', configError);
        // Return a simplified form config if conversion fails
        formConfig = {
          id: form.id,
          title: form.name,
          description: form.description || '',
          sections: sections.map(s => ({
            id: s.id,
            title: s.title || '',
            description: s.description || '',
            fields: [],
            order: s.order || 0
          })),
          submitButtonText: 'Submit',
          successMessage: 'Thank you for your submission!',
          isMultiPage: form.isMultiPage || false,
          isPublic: (form as any).isPublic || false,
          version: 'modern'
        };
      }
      
      // Create a safe copy of the form with null description if undefined
      const safeForm = form ? {
        ...form,
        description: form.description || null // Ensure description is never undefined
      } : null;
      
      return res.status(200).json({
        form: safeForm,
        formConfig
      });
    }
    
    // PUT - Update a form
    if (req.method === 'PUT') {
      // First check if the form exists and belongs to the user
      const existingForm = await formRepository.getFormById(id);
      
      if (!existingForm) {
        return res.status(404).json({ error: 'Form not found' });
      }
      
      if (existingForm.userId !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      
      // Check if we're updating the form configuration or just the form metadata
      if (req.body.formConfig) {
        console.log('Received form configuration update request:', {
          formId: id,
          configSections: req.body.formConfig.sections?.length || 0,
          userId: userId
        });
        
        try {
          // Update the form configuration (sections and fields)
          const updatedForm = await formRepository.updateFormConfig(id, req.body.formConfig);
          console.log('Form configuration updated successfully');
          return res.status(200).json(updatedForm);
        } catch (error: any) {
          console.error('Error updating form configuration:', error);
          return res.status(500).json({ error: `Error updating form configuration: ${error.message || String(error)}` });
        }
      } else {
        // Update just the form metadata
        const { 
          name, 
          description, 
          isActive, 
          isPublic, 
          submitButtonText, 
          successMessage,
          isMultiPage,  // Add isMultiPage field
          type,         // Add form type field
          metadata,     // Add metadata field
          fields        // Add fields JSON string
        } = req.body;
        
        console.log('Updating form metadata:', {
          id,
          name,
          isMultiPage,
          type,
          hasMetadata: !!metadata
        });
        
        const updatedForm = await formRepository.updateForm(id, {
          name,
          description,
          isActive,
          isPublic,
          submitButtonText,
          successMessage,
          isMultiPage,  // Include isMultiPage in the update
          type,         // Include form type in the update
          metadata,     // Include metadata in the update
          fields,       // Include fields JSON string in the update
          updatedAt: new Date(),
        });
        
        return res.status(200).json(updatedForm);
      }
    }
    
    // DELETE - Delete a form
    if (req.method === 'DELETE') {
      try {
        // First check if the form exists and belongs to the user
        const existingForm = await formRepository.getFormById(id);
        
        if (!existingForm) {
          return res.status(404).json({ error: 'Form not found' });
        }
        
        if (existingForm.userId !== userId) {
          return res.status(403).json({ error: 'Forbidden' });
        }
        
        try {
          const deletedForm = await formRepository.deleteForm(id);
          return res.status(200).json(deletedForm);
        } catch (deleteError: any) {
          console.error('Error deleting form:', deleteError);
          
          // Check if this is a specific error about associated bookings or leads
          if (deleteError.message && (deleteError.message.includes('bookings') || deleteError.message.includes('leads'))) {
            return res.status(400).json({ error: deleteError.message });
          }
          
          // For other errors, return a generic error message
          return res.status(500).json({ error: 'Failed to delete form' });
        }
      } catch (error: any) {
        console.error('Error in form deletion process:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }
    
    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in form2 detail API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
