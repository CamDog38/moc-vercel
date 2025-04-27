/**
 * Form System 2.0 API - Update Form Configuration Endpoint
 * 
 * PUT: Update a form's configuration
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/util/supabase/server';
import { FormRepository } from '@/lib/forms2/repositories/form/formRepository';
import { FormConfig } from '@/lib/forms2/core/types';

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
    // PUT - Update form configuration
    if (req.method === 'PUT') {
      // First check if the form exists and belongs to the user
      const existingForm = await formRepository.getFormById(id);
      
      if (!existingForm) {
        return res.status(404).json({ error: 'Form not found' });
      }
      
      if (existingForm.userId !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      
      const { formConfig } = req.body;
      
      if (!formConfig) {
        return res.status(400).json({ error: 'Form configuration is required' });
      }
      
      try {
        // Update the form configuration
        const result = await formRepository.updateFormConfig(id, formConfig as FormConfig);
        
        return res.status(200).json({
          success: true,
          message: 'Form configuration updated successfully',
          form: result
        });
      } catch (error) {
        console.error('Error updating form config:', error);
        return res.status(500).json({ error: 'Failed to update form configuration' });
      }
    }
    
    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in update form config API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
