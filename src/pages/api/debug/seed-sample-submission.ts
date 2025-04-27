import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check authentication
  const supabase = createClient(req, res);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get form ID from query parameters
    const { formId } = req.query;
    
    if (!formId) {
      return res.status(400).json({ error: 'Form ID is required' });
    }

    // Check if the form exists and belongs to the user
    const form = await prisma.form.findFirst({
      where: {
        id: String(formId),
        userId: user.id,
      },
    });

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    // Get the most recent submission for this form
    const existingSubmission = await prisma.formSubmission.findFirst({
      where: {
        formId: String(formId),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Create sample data with Gauteng and Both South African
    let sampleData = {
      name: "Sample User",
      email: "sample@example.com",
      phone: "+27123456789",
      // Using the specific field IDs from the email rule conditions
      cm7ykl0810008xuzv6fhxdkcq: "Gauteng", // Location field
      cm7ykl081000dxuzv5yml4du3: "Both South African", // Nationality field
      location: "Gauteng", // Keep original fields for backward compatibility
      nationality: "Both South African",
      weddingDate: new Date().toISOString().split('T')[0],
      message: "This is a sample submission for testing email rules."
    };

    // If there's an existing submission, merge its data with our sample data
    if (existingSubmission) {
      sampleData = {
        ...existingSubmission.data as any,
        ...sampleData
      };
    }

    // Create or update the sample submission
    let submission;
    if (existingSubmission) {
      submission = await prisma.formSubmission.update({
        where: {
          id: existingSubmission.id
        },
        data: {
          data: sampleData
        }
      });
    } else {
      submission = await prisma.formSubmission.create({
        data: {
          formId: String(formId),
          data: sampleData
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Sample submission created/updated successfully',
      submission
    });
  } catch (error) {
    console.error('Error creating sample submission:', error);
    return res.status(500).json({ error: 'Failed to create sample submission' });
  }
}