/**
 * Form System 2.0 API - Async Form Deletion Endpoint
 * 
 * POST: Start an async job to delete a form
 * GET: Check the status of an async deletion job
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/util/supabase/server';
import { FormRepository } from '@/lib/forms2/repositories/formRepository';
import { v4 as uuidv4 } from 'uuid';

// In-memory job store (in production, this should be a database or Redis)
const jobs: Record<string, { status: 'pending' | 'processing' | 'completed' | 'failed', error?: string }> = {};

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
  
  // POST - Start deletion job
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
      
      // Start the deletion process in the background
      deleteFormAsync(id, jobId);
      
      return res.status(202).json({ jobId });
    } catch (error) {
      console.error('Error starting form deletion:', error);
      return res.status(500).json({ error: 'Failed to start form deletion' });
    }
  }
  
  // Method not allowed
  return res.status(405).json({ error: 'Method not allowed' });
}

async function deleteFormAsync(formId: string, jobId: string) {
  try {
    // Update job status to processing
    jobs[jobId] = { status: 'processing' };
    
    // Delete the form
    await formRepository.deleteForm(formId);
    
    // Update job status to completed
    jobs[jobId] = { status: 'completed' };
  } catch (error) {
    console.error('Error in async form deletion:', error);
    jobs[jobId] = { status: 'failed', error: (error as Error).message };
  }
}
