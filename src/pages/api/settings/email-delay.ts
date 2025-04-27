import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';
import { addApiLog } from '../debug/logs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check authentication
  const supabase = createClient(req, res);
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Get user role
  const userRecord = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true }
  });

  // Only allow admins and super admins to manage email delay settings
  if (!userRecord || (userRecord.role !== 'ADMIN' && userRecord.role !== 'SUPER_ADMIN')) {
    return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
  }

  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return getEmailDelay(req, res);
    case 'POST':
      return updateEmailDelay(req, res);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * Get the current email delay setting
 */
async function getEmailDelay(req: NextApiRequest, res: NextApiResponse) {
  try {
    const setting = await prisma.systemSettings.findUnique({
      where: { key: 'emailDelaySeconds' }
    });
    
    addApiLog(`Retrieved email delay setting: ${JSON.stringify(setting)}`, 'info', 'emails');
    
    return res.status(200).json({
      delay: setting ? parseInt(setting.value, 10) : 0
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    addApiLog(`Error getting email delay setting: ${errorMessage}`, 'error', 'emails');
    return res.status(500).json({ error: errorMessage });
  }
}

/**
 * Update the email delay setting
 */
async function updateEmailDelay(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { delay } = req.body;
    
    // Validate delay value
    const delaySeconds = parseInt(delay, 10);
    if (isNaN(delaySeconds) || delaySeconds < 0) {
      return res.status(400).json({ error: 'Invalid delay value. Must be a non-negative number.' });
    }
    
    // Update or create the setting
    const setting = await prisma.systemSettings.upsert({
      where: { key: 'emailDelaySeconds' },
      update: { value: delaySeconds.toString() },
      create: {
        key: 'emailDelaySeconds',
        value: delaySeconds.toString(),
        description: 'Delay in seconds before processing emails'
      }
    });
    
    addApiLog(`Updated email delay setting to ${delaySeconds} seconds`, 'success', 'emails');
    
    return res.status(200).json({
      delay: parseInt(setting.value, 10)
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    addApiLog(`Error updating email delay setting: ${errorMessage}`, 'error', 'emails');
    return res.status(500).json({ error: errorMessage });
  }
}