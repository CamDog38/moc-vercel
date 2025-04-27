import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';
import { ensureUserExists } from '@/util/auth-helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createClient(req, res);
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid rate ID' });
  }
  
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
      return res.status(403).json({ error: 'Not authorized to manage generic rates' });
    }

    // Check if the rate exists
    const existingRate = await prisma.genericServiceRate.findUnique({
      where: { id },
    });

    if (!existingRate) {
      return res.status(404).json({ error: 'Generic service rate not found' });
    }

    if (req.method === 'GET') {
      return res.status(200).json(existingRate);
    }

    if (req.method === 'PUT') {
      const { serviceType, baseRate, travelRatePerKm } = req.body;

      if (!serviceType || baseRate === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Check if updating to a service type that already exists (excluding current record)
      if (serviceType !== existingRate.serviceType) {
        const duplicateServiceType = await prisma.genericServiceRate.findFirst({
          where: { 
            serviceType,
            id: { not: id }
          }
        });

        if (duplicateServiceType) {
          return res.status(400).json({ 
            error: 'A generic rate for this service type already exists',
            existingRateId: duplicateServiceType.id
          });
        }
      }

      // Update the generic rate
      const updatedRate = await prisma.genericServiceRate.update({
        where: { id },
        data: {
          serviceType,
          baseRate: typeof baseRate === 'string' ? parseFloat(baseRate) : baseRate,
          travelRatePerKm: travelRatePerKm 
            ? (typeof travelRatePerKm === 'string' ? parseFloat(travelRatePerKm) : travelRatePerKm)
            : null,
        },
      });

      return res.status(200).json(updatedRate);
    }

    if (req.method === 'DELETE') {
      // Delete the generic rate
      await prisma.genericServiceRate.delete({
        where: { id },
      });

      return res.status(200).json({ message: 'Generic service rate deleted successfully' });
    }

    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  } catch (error) {
    console.error('Error in generic rates API:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}
