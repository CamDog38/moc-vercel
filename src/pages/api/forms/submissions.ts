import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';
import path from 'path';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Standard logging header
  const fileName = path.basename(__filename);
  const filePath = __filename;
  const fileVersion = '1.0';
  const apiSource = req.headers['referer'] || 'Unknown';
  
  console.log(`[FILE NAME] ${fileName}`);
  console.log(`[FILE PATH] ${filePath}`);
  console.log(`[${fileVersion} FILE]`);
  console.log(`[API RECEIVED FROM] ${apiSource}`);
  console.log(`[PROCESSING] Form submissions API handler starting`);
  // Check authentication
  console.log(`[AUTHENTICATION] Checking user authentication`);
  const supabase = createClient(req, res);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.log(`[ERROR] Unauthorized access attempt - no valid session`);
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  console.log(`[AUTHENTICATION] User authenticated: ${user.id}`);

  // Only allow GET requests
  console.log(`[REQUEST] Method: ${req.method}`);
  if (req.method !== 'GET') {
    console.log(`[ERROR] Method not allowed: ${req.method}`);
    return res.status(405).json({ error: 'Method not allowed' });
  }
  console.log(`[PROCESSING] Handling GET request for form submissions`);

  try {
    // Parse query parameters
    console.log(`[REQUEST] Query parameters: ${JSON.stringify(req.query)}`);
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const formId = req.query.formId as string | undefined;
    
    console.log(`[PROCESSING] Using limit: ${limit}`);
    if (formId) {
      console.log(`[PROCESSING] Filtering by form ID: ${formId}`);
    }
    
    // Build the where clause
    console.log(`[DATABASE] Building query where clause`);
    const where: any = {
      form: {
        userId: user.id
      }
    };
    
    // Add form filter if provided
    if (formId) {
      console.log(`[DATABASE] Adding form ID filter: ${formId}`);
      where.formId = formId;
    }
    
    console.log(`[DATABASE] Final where clause: ${JSON.stringify(where)}`);

    // Get form submissions with related data
    console.log(`[DATABASE] Querying FormSubmission table with related data`);
    const submissions = await prisma.formSubmission.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      include: {
        form: {
          select: {
            id: true,
            name: true,
            type: true,
            isActive: true
          }
        },
        emailLogs: {
          select: {
            id: true,
            templateId: true,
            recipient: true,
            subject: true,
            status: true,
            createdAt: true,
            template: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    console.log(`[DATABASE] Found ${submissions.length} form submissions`);
    console.log(`[RESPONSE] Sending ${submissions.length} submissions`);
    return res.status(200).json(submissions);
  } catch (error) {
    console.error(`[ERROR] Error fetching form submissions:`, error);
    console.log(`[RESPONSE] Sending 500 error response`);
    return res.status(500).json({ error: 'Failed to fetch form submissions' });
  }
  
  console.log(`[PROCESSING] Form submissions API handler completed`);
}
