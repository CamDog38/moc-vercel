import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';
import { addApiLog } from '../debug/logs';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate the user
    const supabase = createClient(req, res);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if the default booking form ID is already set
    const existingSetting = await prisma.systemSettings.findUnique({
      where: { key: 'defaultBookingFormId' }
    });

    // If the setting already exists, return it
    if (existingSetting) {
      addApiLog(`Default booking form ID already set: ${existingSetting.value}`, 'info', 'emails');
      return res.status(200).json({
        message: 'Default booking form ID already set',
        setting: existingSetting
      });
    }

    // Get the hardcoded default booking form ID
    const defaultBookingFormId = 'cm8smo5r4008ucq3z5uau87d4';

    // Verify that the form exists
    const form = await prisma.form.findUnique({
      where: { id: defaultBookingFormId }
    });

    if (!form) {
      addApiLog(`Default booking form not found: ${defaultBookingFormId}`, 'error', 'emails');
      return res.status(404).json({ error: 'Default booking form not found' });
    }

    // Create the setting
    const setting = await prisma.systemSettings.create({
      data: {
        key: 'defaultBookingFormId',
        value: defaultBookingFormId,
        description: 'Default booking form ID for {{bookingLink}} variable in email templates'
      }
    });

    addApiLog(`Default booking form ID set: ${setting.value}`, 'success', 'emails');
    return res.status(200).json({
      message: 'Default booking form ID set successfully',
      setting
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    addApiLog(`Error ensuring default booking form ID: ${errorMessage}`, 'error', 'emails');
    return res.status(500).json({ error: errorMessage });
  }
}