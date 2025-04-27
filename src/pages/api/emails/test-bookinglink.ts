import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';
import { addApiLog } from '@/pages/api/debug/logs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST
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

    // Get parameters from the request
    const { leadId, formId, html, data = {} } = req.body;

    if (!leadId) {
      return res.status(400).json({ error: 'Lead ID is required' });
    }

    // Verify that the lead exists
    const lead = await prisma.lead.findUnique({
      where: { id: leadId }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[TEST-BOOKINGLINK] Generating booking link for lead: ${leadId}`);
    }

    // Get the booking form ID (from request or default)
    let bookingFormId = formId;
    
    if (!bookingFormId) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[TEST-BOOKINGLINK] No form ID provided, using default');
      }
      
      // Use the hardcoded default booking form ID
      bookingFormId = 'cm8smo5r4008ucq3z5uau87d4';
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[TEST-BOOKINGLINK] Using hardcoded default booking form ID: ${bookingFormId}`);
      }
      
      // Also check system settings as a fallback
      const defaultBookingFormSetting = await prisma.systemSettings.findUnique({
        where: { key: 'defaultBookingFormId' }
      });
      
      if (defaultBookingFormSetting) {
        bookingFormId = defaultBookingFormSetting.value;
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[TEST-BOOKINGLINK] Found default booking form in settings: ${bookingFormId}`);
        }
      }
    }
    
    // Verify that the form exists and is a booking form
    const form = await prisma.form.findFirst({
      where: { 
        id: bookingFormId,
        type: 'BOOKING'
      }
    });
    
    if (!form) {
      return res.status(404).json({ 
        error: `Form ${bookingFormId} not found or is not a booking form` 
      });
    }
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[TEST-BOOKINGLINK] Using form: ${form.name} (${bookingFormId})`);
    }
    
    // Replace the booking link generation with a placeholder
    addApiLog('Booking link generation in emails is disabled', 'info', 'emails');
    
    return res.status(200).json({
      success: true,
      message: 'Booking link generation in emails is disabled',
      bookingLink: '[Booking Link Generation Disabled in Emails]',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ 
      success: false, 
      error: errorMessage 
    });
  }
}

/**
 * Simple variable replacement function for this test endpoint
 */
function replaceVariables(text: string, data: Record<string, any>): string {
  return text.replace(/\{\{([^}]+)\}\}/g, (match, variableName) => {
    const key = variableName.trim();
    
    if (data[key] !== undefined) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[TEST-BOOKINGLINK] Replacing {{${key}}} with: ${data[key]}`);
      }
      return String(data[key]);
    }
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[TEST-BOOKINGLINK] Variable {{${key}}} not found in data`);
    }
    return match; // Keep the variable as is if not found
  });
} 