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

    // Get the rate to check ownership/permissions
    const rate = await prisma.serviceRate.findUnique({
      where: { id },
      include: { officer: true }
    });

    if (!rate) {
      return res.status(404).json({ error: 'Rate not found' });
    }

    // Check permissions
    if (dbUser.role !== 'SUPER_ADMIN' && dbUser.role !== 'ADMIN') {
      // Marriage officers can only modify their own rates
      const officer = await prisma.marriageOfficer.findUnique({
        where: { userId: user.id }
      });

      if (!officer || officer.id !== rate.officerId) {
        return res.status(403).json({ error: 'Not authorized to modify this rate' });
      }
    }

    // Handle different HTTP methods
    switch (req.method) {
      case 'PUT':
      case 'PATCH':
        const { serviceType, baseRate, travelRatePerKm } = req.body;

        if (serviceType === undefined || baseRate === undefined) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        const updatedRate = await prisma.serviceRate.update({
          where: { id },
          data: {
            serviceType,
            baseRate: typeof baseRate === 'string' ? parseFloat(baseRate) : baseRate,
            travelRatePerKm: travelRatePerKm !== undefined && travelRatePerKm !== null
              ? typeof travelRatePerKm === 'string' 
                ? parseFloat(travelRatePerKm) 
                : travelRatePerKm
              : null,
          }
        });

        return res.status(200).json(updatedRate);

      case 'DELETE':
        await prisma.serviceRate.delete({
          where: { id }
        });

        return res.status(200).json({ message: 'Rate deleted successfully' });

      default:
        res.setHeader('Allow', ['PUT', 'PATCH', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Error in rates API:', error);
    return res.status(500).json({ error: 'Internal server error: ' + (error as Error).message });
  }
}
