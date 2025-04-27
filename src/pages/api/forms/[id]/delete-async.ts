import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/prisma'
import { createClient } from '@/util/supabase/api'

// We'll use the database to store job status instead of in-memory storage
// This ensures job status persists between serverless function invocations

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id, jobId } = req.query;
  if (process.env.NODE_ENV !== 'production') {
    console.log('Form Delete Async API called for ID:', id, 'Method:', req.method, 'JobID:', jobId);
  }
  
  let supabase;
  try {
    supabase = createClient(req, res);
  } catch (clientError) {
    console.error('API: Error creating Supabase client:', clientError);
    return res.status(500).json({ error: 'Failed to initialize authentication client' });
  }

  // Get user session
  try {
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    
    if (authError || !session) {
      console.error('API: Auth Error or no session:', authError)
      return res.status(401).json({ error: 'Authentication required' })
    }
  } catch (sessionError) {
    console.error('API: Error retrieving session:', sessionError);
    return res.status(500).json({ error: 'Error retrieving session' });
  }

  // Handle GET request to check job status
  if (req.method === 'GET' && jobId) {
    try {
      // Look up the job in the database
      const job = await prisma.backgroundJob.findUnique({
        where: { id: jobId as string }
      });
      
      if (!job) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[DELETE-ASYNC] Job ${jobId} not found in database`);
        }
        return res.status(404).json({ error: 'Job not found' });
      }
      
      return res.status(200).json({
        status: job.status,
        error: job.error || undefined
      });
    } catch (error) {
      console.error(`[DELETE-ASYNC] Error retrieving job ${jobId}:`, error);
      return res.status(500).json({ error: 'Failed to retrieve job status' });
    }
  }

  // Handle POST request to start deletion job
  if (req.method === 'POST') {
    try {
      // First check if the form exists
      const form = await prisma.form.findUnique({
        where: { id: id as string },
        include: {
          formSections: {
            include: {
              fields: true
            }
          }
        }
      });

      if (!form) {
        return res.status(404).json({ error: 'Form not found' });
      }

      // Check if there are any associated bookings
      const bookingsCount = await prisma.booking.count({
        where: { formId: id as string }
      });

      if (bookingsCount > 0) {
        return res.status(400).json({ 
          error: `Cannot delete form that has ${bookingsCount} associated bookings. Please delete the bookings first.`
        });
      }

      // Generate a unique job ID
      const newJobId = `delete_${id}_${Date.now()}`;
      
      // Create a job record in the database
      await prisma.backgroundJob.create({
        data: {
          id: newJobId,
          type: 'FORM_DELETION',
          status: 'pending',
          resourceId: id as string,
          createdAt: new Date()
        }
      });

      // Start the deletion process in the background
      deleteFormAsync(id as string, newJobId);

      // Return the job ID immediately
      return res.status(202).json({ 
        jobId: newJobId,
        message: 'Form deletion started'
      });
    } catch (error: any) {
      console.error('Error starting form deletion:', error);
      return res.status(500).json({ error: 'Failed to start form deletion' });
    }
  }

  // Handle unsupported methods
  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

// Asynchronous function to delete the form
async function deleteFormAsync(formId: string, jobId: string) {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[DELETE-ASYNC] Starting background deletion of form ${formId}, job ${jobId}`);
  }
  
  try {
    // First, get all the form sections and fields for logging
    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: {
        formSections: {
          include: {
            fields: true
          }
        }
      }
    });

    if (!form) {
      console.error(`[DELETE-ASYNC] Form ${formId} not found`);
      await prisma.backgroundJob.update({
        where: { id: jobId },
        data: { 
          status: 'failed',
          error: 'Form not found',
          completedAt: new Date()
        }
      });
      return;
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DELETE-ASYNC] Found form with ${form.formSections.length} sections`);
    }
    
    // Delete form submissions
    const deletedSubmissions = await prisma.formSubmission.deleteMany({
      where: { formId }
    });
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DELETE-ASYNC] Deleted ${deletedSubmissions.count} form submissions`);
    }

    // Delete leads
    const deletedLeads = await prisma.lead.deleteMany({
      where: { formId }
    });
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DELETE-ASYNC] Deleted ${deletedLeads.count} leads`);
    }

    // Delete form fields in batches
    let totalDeletedFields = 0;
    for (const section of form.formSections) {
      const deletedFields = await prisma.formField.deleteMany({
        where: { sectionId: section.id }
      });
      totalDeletedFields += deletedFields.count;
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DELETE-ASYNC] Deleted ${deletedFields.count} fields from section ${section.id}`);
      }
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DELETE-ASYNC] Deleted ${totalDeletedFields} form fields in total`);
    }

    // Delete form sections
    const deletedSections = await prisma.formSection.deleteMany({
      where: { formId }
    });
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DELETE-ASYNC] Deleted ${deletedSections.count} form sections`);
    }

    // Finally delete the form itself
    await prisma.form.delete({
      where: { id: formId }
    });
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DELETE-ASYNC] Successfully deleted form ${formId}`);
    }

    // Update job status in the database
    await prisma.backgroundJob.update({
      where: { id: jobId },
      data: { 
        status: 'completed',
        completedAt: new Date()
      }
    });
    
    // Jobs will be automatically cleaned up by database retention policies
    // or by a scheduled cleanup job
  } catch (error: any) {
    console.error(`[DELETE-ASYNC] Error deleting form ${formId}:`, error);
    
    // Update job status in the database
    await prisma.backgroundJob.update({
      where: { id: jobId },
      data: { 
        status: 'failed',
        error: error.message || 'Unknown error during form deletion',
        completedAt: new Date()
      }
    });
  }
}