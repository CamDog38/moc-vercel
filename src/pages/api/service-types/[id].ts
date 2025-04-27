import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';
import { ensureUserExists } from '@/util/auth-helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createClient(req, res);
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Service type ID is required' });
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

    // Only ADMIN and SUPER_ADMIN can manage service types
    if (dbUser.role !== 'SUPER_ADMIN' && dbUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Not authorized to manage service types' });
    }

    if (req.method === 'PUT') {
      const { serviceType, displayName } = req.body;

      if (!serviceType || !displayName) {
        return res.status(400).json({ error: 'Service type and display name are required' });
      }

      // Check if the new service type already exists (if it's different from the current one)
      if (id !== serviceType) {
        const existingServiceTypes = await prisma.$queryRaw`
          SELECT "serviceType" 
          FROM "ServiceRate" 
          WHERE "serviceType" = ${serviceType}
          UNION
          SELECT "serviceType" 
          FROM "GenericServiceRate" 
          WHERE "serviceType" = ${serviceType}
          UNION
          SELECT "serviceType" 
          FROM "Invoice" 
          WHERE "serviceType" = ${serviceType}
        `;

        if ((existingServiceTypes as any[]).length > 0) {
          return res.status(400).json({ error: 'This service type already exists' });
        }
      }

      // Update all occurrences of the old service type to the new one
      await prisma.$transaction([
        prisma.serviceRate.updateMany({
          where: { serviceType: id },
          data: { serviceType }
        }),
        prisma.genericServiceRate.updateMany({
          where: { serviceType: id },
          data: { serviceType }
        }),
        prisma.invoice.updateMany({
          where: { serviceType: id },
          data: { serviceType }
        })
      ]);

      return res.status(200).json({ 
        serviceType,
        displayName,
        message: 'Service type updated successfully' 
      });
    }

    res.setHeader('Allow', ['PUT']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  } catch (error) {
    console.error('Error in service type API:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}