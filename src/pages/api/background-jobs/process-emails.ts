import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { addApiLog } from '@/pages/api/debug/logs';

/**
 * DEPRECATED: This background job processor is no longer used
 * Emails are now processed directly in process-async.ts
 * This file remains for backward compatibility but no actual email processing happens here
 */

export const config = {
  maxDuration: 60, // 60 seconds max for Vercel hobby plan
};

// Validate API key
function validateApiKey(req: NextApiRequest): boolean {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const providedKey = authHeader.replace('Bearer ', '');
  const validKey = process.env.JOB_PROCESSOR_API_KEY;

  return Boolean(validKey && providedKey === validKey);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate API key
  if (!validateApiKey(req)) {
    addApiLog('Invalid or missing API key for job processor', 'error', 'emails');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { jobId } = req.body;

  if (!jobId) {
    return res.status(400).json({ error: 'Missing jobId' });
  }

  try {
    // Find the job
    const job = await prisma.backgroundJob.findUnique({
      where: { id: jobId }
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Email processing via background jobs is disabled
    addApiLog(`DEPRECATED: Email processing via background jobs is disabled. Job ID: ${jobId}`, 'error', 'emails');
    addApiLog(`Emails are now processed directly in process-async.ts`, 'info', 'emails');

    // Mark the job as completed without actually processing it
    await prisma.backgroundJob.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date()
      }
    });

    return res.status(200).json({ 
      success: true,
      message: 'DEPRECATED: Email processing via background jobs is disabled. Emails are now processed directly.'
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    addApiLog(`Error updating job status: ${errorMessage}`, 'error', 'emails');

    return res.status(500).json({ error: errorMessage });
  }
}