import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';
import { ensureUserExists } from '@/util/auth-helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createClient(req, res);
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Ensure user exists in the database
    let dbUser;
    try {
      dbUser = await ensureUserExists(user);
    } catch (error) {
      console.error('Failed to ensure user exists:', error);
      return res.status(401).json({ error: 'Failed to verify user in database' });
    }

    // Only ADMIN and SUPER_ADMIN can manage generic rates
    if (dbUser.role !== 'SUPER_ADMIN' && dbUser.role !== 'ADMIN') {
      console.warn('User does not have admin role:', dbUser.role);
      
      // If we're in development or the role was a fallback from a timeout,
      // allow access to prevent blocking the UI during database issues
      if (process.env.NODE_ENV === 'development' || 
          process.env.NEXT_PUBLIC_CO_DEV_ENV === 'preview') {
        if (process.env.NODE_ENV !== 'production') {
          console.log('Allowing access in development/preview environment despite role:', dbUser.role);
        }
      } else {
        return res.status(403).json({ error: 'Not authorized to manage generic rates' });
      }
    }

    if (req.method === 'GET') {
      // Get all generic rates
      const genericRates = await prisma.genericServiceRate.findMany({
        orderBy: { serviceType: 'asc' }
      });
      
      return res.status(200).json(genericRates);
    }

    if (req.method === 'POST') {
      const { serviceType, baseRate, travelRatePerKm } = req.body;

      if (!serviceType || baseRate === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Format the service type to be consistent
      const formattedServiceType = serviceType.trim();

      // Check if a rate with this service type already exists
      const existingRate = await prisma.genericServiceRate.findFirst({
        where: { 
          serviceType: {
            equals: formattedServiceType,
            mode: 'insensitive', // Case-insensitive comparison
          }
        }
      });

      if (existingRate) {
        return res.status(400).json({ 
          error: 'A generic rate for this service type already exists',
          existingRateId: existingRate.id
        });
      }

      // Create a new generic rate
      const genericRate = await prisma.genericServiceRate.create({
        data: {
          serviceType: formattedServiceType,
          baseRate: parseFloat(baseRate),
          travelRatePerKm: travelRatePerKm ? parseFloat(travelRatePerKm) : null,
        },
      });

      return res.status(201).json(genericRate);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in generic rates API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
