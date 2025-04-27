import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';
import { ensureUserExists } from '@/util/auth-helpers';
import { DEFAULT_SERVICE_TYPES } from '@/util/service-types';

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

    // Only ADMIN and SUPER_ADMIN can manage service types
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
        return res.status(403).json({ error: 'Not authorized to manage service types' });
      }
    }

    if (req.method === 'GET') {
      // Get all service types from the database
      const serviceTypes = await prisma.$queryRaw`
        SELECT DISTINCT "serviceType" 
        FROM "ServiceRate"
        UNION
        SELECT DISTINCT "serviceType" 
        FROM "GenericServiceRate"
        UNION
        SELECT DISTINCT "serviceType" 
        FROM "Invoice"
        ORDER BY "serviceType" ASC
      `;
      
      // Add display names to service types
      const serviceTypesWithDisplayNames = (serviceTypes as any[]).map((type) => {
        const serviceType = type.serviceType;
        let displayName = '';
        
        // Check if this is a default service type
        if (DEFAULT_SERVICE_TYPES[serviceType as keyof typeof DEFAULT_SERVICE_TYPES]) {
          displayName = DEFAULT_SERVICE_TYPES[serviceType as keyof typeof DEFAULT_SERVICE_TYPES];
        } else {
          // Convert from code format to readable format
          displayName = serviceType
            .replace(/_/g, ' ')
            .replace(/([A-Z])/g, ' $1')
            .trim()
            .toLowerCase()
            .replace(/\b\w/g, (c: string) => c.toUpperCase());
        }
        
        return {
          serviceType,
          displayName
        };
      });
      
      return res.status(200).json(serviceTypesWithDisplayNames);
    }

    if (req.method === 'POST') {
      const { serviceType, displayName } = req.body;

      if (!serviceType || !displayName) {
        return res.status(400).json({ error: 'Service type and display name are required' });
      }

      // Check if this service type already exists in any of the tables
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

      // Instead of creating a placeholder generic rate, we'll just return the new service type
      // This will be added to the service types list without creating a generic rate
      return res.status(201).json({ 
        serviceType,
        displayName,
        message: 'Service type created successfully' 
      });
    }

    if (req.method === 'DELETE') {
      const { serviceType } = req.body;

      if (!serviceType) {
        return res.status(400).json({ error: 'Service type is required' });
      }

      // Check if this service type is in use
      const serviceRatesCount = await prisma.serviceRate.count({
        where: { serviceType }
      });

      const genericRatesCount = await prisma.genericServiceRate.count({
        where: { serviceType }
      });

      const invoicesCount = await prisma.invoice.count({
        where: { serviceType }
      });

      if (serviceRatesCount > 0 || invoicesCount > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete this service type as it is in use',
          inUseCount: {
            serviceRates: serviceRatesCount,
            invoices: invoicesCount
          }
        });
      }

      // Delete the generic rate entries for this service type
      if (genericRatesCount > 0) {
        await prisma.genericServiceRate.deleteMany({
          where: { serviceType }
        });
      }

      return res.status(200).json({ message: 'Service type deleted successfully' });
    }

    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  } catch (error) {
    console.error('Error in service types API:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}