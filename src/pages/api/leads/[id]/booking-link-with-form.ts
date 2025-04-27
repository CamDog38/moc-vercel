import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { generateBookingLink } from '@/util/tracking-links';
import { createClient } from '@/util/supabase/api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the lead ID from the URL
    const { id } = req.query;
    const leadId = String(id);

    // Get the form ID from the request body
    const { formId } = req.body;

    if (!formId) {
      return res.status(400).json({ error: 'Form ID is required' });
    }

    // Authenticate the user
    const supabase = createClient(req, res);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Find the lead
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        form: {
          select: {
            id: true,
            name: true,
            type: true
          }
        }
      }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Find the specified booking form
    const bookingForm = await prisma.form.findFirst({
      where: {
        id: formId,
        type: 'BOOKING',
        isActive: true
      }
    });

    if (!bookingForm) {
      return res.status(404).json({ error: 'Booking form not found or not active' });
    }

    // Generate the booking link
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_DEPLOYMENT_URL || '';
    const bookingLink = generateBookingLink(baseUrl, bookingForm.id, leadId);

    return res.status(200).json({
      bookingLink,
      formId: bookingForm.id,
      formName: bookingForm.name
    });

  } catch (error) {
    console.error('Error generating booking link:', error);
    return res.status(500).json({ 
      error: 'Failed to generate booking link',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 