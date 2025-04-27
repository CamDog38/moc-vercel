import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';
import { addApiLog } from '../debug/logs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    addApiLog(`Invalid lead ID: ${id}`, 'error', 'leads');
    return res.status(400).json({ error: 'Invalid lead ID' });
  }

  // Check if this is a public context request (for form success pages)
  const isPublicContext = req.headers['x-public-context'] === 'true';

  if (!isPublicContext) {
    // Get the authenticated user
    const supabase = createClient(req, res);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      addApiLog('Auth error or no user', 'error', 'leads');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    addApiLog(`Authenticated user: ${user.id}`, 'success', 'leads');
  }

  try {
    addApiLog(`Fetching lead details for ID: ${id}`, 'info', 'leads');

    // Set a timeout for the database query to prevent hanging requests
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Database query timeout'));
      }, 5000); // 5 second timeout
    });

    // Check if we need to return minimal data (for faster loading)
    const minimal = req.query.minimal === 'true';
    
    // Create the database query promise with appropriate data based on minimal flag
    const queryPromise = prisma.lead.findUnique({
      where: { id },
      include: {
        form: {
          select: {
            id: true,
            name: true,
            type: true,
            // Only include form sections and fields if not minimal
            ...(minimal ? {} : {
              formSections: {
                include: {
                  fields: true
                }
              }
            })
          }
        },
        submissions: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1,
          // For minimal requests, only select essential data
          ...(minimal ? {
            select: {
              id: true,
              data: true,
              createdAt: true
            }
          } : {})
        }
      }
    });

    // Race the database query against the timeout
    const lead = await Promise.race([queryPromise, timeoutPromise]) as any;

    if (!lead) {
      addApiLog(`Lead not found for ID: ${id}`, 'error', 'leads');
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Set cache control headers to prevent 304 responses
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    addApiLog(`Successfully fetched lead details: ${lead.id}`, 'success', 'leads');
    return res.status(200).json(lead);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    addApiLog(`Error fetching lead details: ${errorMessage}`, 'error', 'leads');
    
    if (errorMessage === 'Database query timeout') {
      return res.status(504).json({ 
        error: 'Request timed out while fetching lead details',
        message: 'The server took too long to respond. Please try again later.'
      });
    }
    
    return res.status(500).json({ 
      error: 'Failed to fetch lead details',
      message: errorMessage
    });
  }
}
