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

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse query parameters
    const { page = '1', limit = '10', status, templateId, type, formSubmissionId } = req.query;
    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * limitNumber;

    // Build the where clause
    const where: any = { userId: user.id };
    
    if (status) {
      where.status = status;
    }
    
    if (templateId) {
      where.templateId = templateId;
    }

    if (formSubmissionId) {
      where.formSubmissionId = formSubmissionId;
    }

    // Get the logs
    const logs = await prisma.emailLog.findMany({
      where,
      include: {
        template: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        booking: {
          select: {
            id: true,
            name: true,
          },
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
          },
        },
        formSubmission: {
          select: {
            id: true,
            formId: true,
            leadId: true,
            bookingId: true,
            createdAt: true,
            form: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNumber,
    });

    // If this is a simple request for all logs (no pagination)
    if (req.query.limit && !req.query.page) {
      return res.status(200).json(logs);
    }

    // Get the total count
    const totalCount = await prisma.emailLog.count({ where });

    return res.status(200).json({
      logs,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        totalCount,
        totalPages: Math.ceil(totalCount / limitNumber),
      },
    });
  } catch (error) {
    console.error('Error fetching email logs:', error);
    return res.status(500).json({ error: 'Failed to fetch email logs' });
  }
}