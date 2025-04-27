import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Initialize Supabase client for auth
  const supabase = createClient(req, res);
  
  try {
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    switch (req.method) {
      case 'GET':
        try {
          // Build the where clause based on user role
          let whereClause: any = {};
          
          // Check if user is a marriage officer
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { role: true }
          });
          
          if (dbUser?.role === 'MARRIAGE_OFFICER') {
            // First, find the marriage officer record for this user
            const officer = await prisma.marriageOfficer.findUnique({
              where: { userId: user.id }
            });
            
            if (officer) {
              // Get all invoices assigned to this officer
              const invoices = await prisma.invoice.findMany({
                where: { officerId: officer.id },
                select: { bookingId: true }
              });
              
              const bookingIds = invoices.map(invoice => invoice.bookingId);
              
              if (bookingIds.length > 0) {
                // Show submissions for bookings assigned to this officer
                whereClause = { bookingId: { in: bookingIds } };
              } else {
                // If no bookings are assigned, don't show any submissions
                whereClause = { id: 'none' }; // This ensures no results
              }
            } else {
              // If user is a marriage officer but doesn't have an officer record,
              // don't show any submissions
              whereClause = { id: 'none' }; // This ensures no results
            }
          }
          
          const submissions = await prisma.formSubmission.findMany({
            where: whereClause,
            orderBy: {
              createdAt: 'desc',
            },
          });

          return res.status(200).json(submissions);
        } catch (error) {
          console.error('Error fetching submissions:', error);
          return res.status(500).json({ error: 'Failed to fetch submissions' });
        }
        
      case 'POST':
        const { formId, data } = req.body;

        if (!formId || !data) {
          return res.status(400).json({ error: 'Form ID and data are required' });
        }

        // Get the form to determine its type
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
          return res.status(404).json({ error: 'Form not found' });
        }

        // Start a transaction to create submission and related records
        const result = await prisma.$transaction(async (tx) => {
          // Create the form submission
          const submission = await tx.formSubmission.create({
            data: {
              formId,
              data,
            }
          });

          // Handle based on form type
          if (form.type === 'BOOKING') {
            // Extract mapped fields for booking
            const mappedData = extractMappedFields(form, data);
            
            // Create booking
            const booking = await tx.booking.create({
              data: {
                formId,
                name: mappedData.name || '',
                email: mappedData.email || '',
                phone: mappedData.phone || '',
                date: mappedData.date ? new Date(mappedData.date) : new Date(),
                time: mappedData.time || '',
                location: mappedData.location || '',
                status: 'PENDING',
                assignedUserId: user.id,
              }
            });

            // Link submission to booking
            await tx.formSubmission.update({
              where: { id: submission.id },
              data: { bookingId: booking.id }
            });

            return { submission, booking };
          } else {
            // Handle inquiry form
            // Extract mapped fields for lead
            const mappedData = extractMappedFields(form, data);

            // Create lead
            const lead = await tx.lead.create({
              data: {
                formId,
                name: mappedData.name || '',
                email: mappedData.email || '',
                phone: mappedData.phone || '',
                status: 'NEW',
                assignedUserId: user.id,
              }
            });

            // Link submission to lead
            await tx.formSubmission.update({
              where: { id: submission.id },
              data: { leadId: lead.id }
            });

            return { submission, lead };
          }
        });

        return res.status(201).json(result);

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error handling submission:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function extractMappedFields(form: any, data: any) {
  const mappedData: Record<string, any> = {};
  
  // Go through all sections and their fields
  form.formSections.forEach((section: any) => {
    section.fields.forEach((field: any) => {
      if (field.mapping && data[field.id]) {
        mappedData[field.mapping] = data[field.id];
      }
    });
  });

  return mappedData;
}
