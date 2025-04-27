import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';
import { ensureUserExists } from '@/util/auth-helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers - use the origin from the request instead of wildcard
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // Handle OPTIONS request (preflight)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const requestId = `rates-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  console.log(`[RATES API ${requestId}] Request received:`, { 
    method: req.method, 
    body: req.body,
    query: req.query,
    url: req.url
  });
  
  const supabase = createClient(req, res);
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error(`[RATES API ${requestId}] Authentication error:`, authError);
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[RATES API ${requestId}] Authenticated user:`, { id: user.id, email: user.email });
    }

    // Ensure user exists in the database
    let dbUser;
    try {
      dbUser = await ensureUserExists(user);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[RATES API ${requestId}] Verified user in database:`, { id: dbUser.id, role: dbUser.role });
      }
    } catch (error) {
      console.error(`[RATES API ${requestId}] Failed to ensure user exists:`, error);
      return res.status(401).json({ error: 'Failed to verify user in database' });
    }

    if (req.method === 'POST') {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[RATES API ${requestId}] Processing POST request with body:`, req.body);
      }
      
      const { serviceType, baseRate, travelRate, travelRatePerKm, officerId } = req.body;
      
      console.log(`[RATES API ${requestId}] Extracted values:`, {
        serviceType,
        baseRate: baseRate,
        baseRateType: typeof baseRate,
        travelRate,
        travelRateType: typeof travelRate,
        travelRatePerKm,
        travelRatePerKmType: typeof travelRatePerKm,
        officerId
      });
      
      // Use travelRatePerKm if provided, otherwise fall back to travelRate for backward compatibility
      const travelRateField = travelRatePerKm !== undefined ? travelRatePerKm : travelRate;
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[RATES API ${requestId}] Using travel rate field:`, travelRateField);
      }

      if (!serviceType || baseRate === undefined || !officerId) {
        console.error(`[RATES API ${requestId}] Missing required fields:`, { serviceType, baseRate, officerId });
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      // Ensure baseRate is a number
      if (isNaN(parseFloat(String(baseRate)))) {
        console.error(`[RATES API ${requestId}] Invalid base rate:`, baseRate);
        return res.status(400).json({ error: 'Base rate must be a valid number' });
      }
      
      // Ensure travel rate is a number if provided
      if (travelRateField !== null && travelRateField !== undefined && isNaN(parseFloat(String(travelRateField)))) {
        console.error(`[RATES API ${requestId}] Invalid travel rate:`, travelRateField);
        return res.status(400).json({ error: 'Travel rate must be a valid number' });
      }

      // Check if user has permission to create rates
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[RATES API ${requestId}] Checking permissions for user role:`, dbUser.role);
      }
      
      // SUPER_ADMIN can add rates for any officer
      if (dbUser.role === 'SUPER_ADMIN') {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[RATES API ${requestId}] User is SUPER_ADMIN, allowing rate creation for any officer`);
        }
        // Allow the operation to continue
      } 
      // ADMIN can add rates for any officer
      else if (dbUser.role === 'ADMIN') {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[RATES API ${requestId}] User is ADMIN, allowing rate creation for any officer`);
        }
        // Allow the operation to continue
      }
      // Marriage officers can only create their own rates
      else {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[RATES API ${requestId}] User is MARRIAGE_OFFICER, checking if they own this officer profile`);
        }
        const officer = await prisma.marriageOfficer.findUnique({
          where: { userId: user.id }
        });

        if (!officer || officer.id !== officerId) {
          console.error(`[RATES API ${requestId}] Permission denied: Marriage officer attempting to create rates for another officer`);
          return res.status(403).json({ error: 'Not authorized to create rates for this officer' });
        }
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[RATES API ${requestId}] Marriage officer creating rates for their own profile, allowed`);
        }
      }

      // Convert to Decimal compatible format for Prisma
      // For Decimal fields, Prisma accepts strings, numbers, or Decimal objects
      // Using string representation ensures precision is maintained
      const baseRateValue = String(baseRate);
      const travelRateValue = travelRateField !== null && travelRateField !== undefined 
        ? String(travelRateField) 
        : null;
      
      console.log(`[RATES API ${requestId}] Creating service rate with values:`, {
        serviceType,
        baseRate: baseRateValue,
        travelRatePerKm: travelRateValue,
        officerId
      });
      
      try {
        // Check if the officer exists first
        const officer = await prisma.marriageOfficer.findUnique({
          where: { id: officerId }
        });

        if (!officer) {
          console.error(`[RATES API ${requestId}] Officer not found with ID:`, officerId);
          return res.status(404).json({ error: 'Marriage officer not found' });
        }

        if (process.env.NODE_ENV !== 'production') {
          console.log(`[RATES API ${requestId}] Found officer:`, officer);
        }
        
        // Add more detailed logging before the create operation
        console.log(`[RATES API ${requestId}] Attempting to create service rate with data:`, {
          serviceType,
          baseRate: baseRateValue,
          baseRateType: typeof baseRateValue,
          travelRatePerKm: travelRateValue,
          travelRateType: travelRateValue !== null ? typeof travelRateValue : 'null',
          officerId
        });
        
        const rate = await prisma.serviceRate.create({
          data: {
            serviceType,
            baseRate: baseRateValue,
            travelRatePerKm: travelRateValue,
            officerId, // Direct assignment without using connect
          },
        });
        
        // Log the created rate for debugging
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[RATES API ${requestId}] Created service rate successfully:`, rate);
        }
        return res.status(200).json(rate);
      } catch (createError) {
        console.error(`[RATES API ${requestId}] Error creating service rate:`, createError);
        
        // Check for specific Prisma errors related to decimal conversion
        const errorMessage = (createError as Error).message;
        if (errorMessage.includes('Decimal') || errorMessage.includes('numeric')) {
          console.error(`[RATES API ${requestId}] Decimal conversion error detected. Input values:`, {
            baseRate,
            travelRatePerKm: travelRateField,
            convertedBaseRate: baseRateValue,
            convertedTravelRate: travelRateValue
          });
          return res.status(400).json({
            error: 'Invalid decimal value provided',
            details: 'Please ensure all rate values are valid decimal numbers',
            technicalDetails: errorMessage
          });
        }
        
        return res.status(500).json({ 
          error: 'Failed to create service rate', 
          details: errorMessage 
        });
      }
    }

    if (req.method === 'GET') {
      // Get officerId from query parameters if provided
      const officerId = req.query.officerId as string;

      console.log(`[RATES API ${requestId}] Processing GET request with params:`, { 
        officerId: officerId || 'not provided',
        userRole: dbUser.role 
      });

      try {
        // If officerId is provided, filter rates for that officer
        if (officerId) {
          if (process.env.NODE_ENV !== 'production') {
            console.log(`[RATES API ${requestId}] Finding rates for specific officer: ${officerId}`);
          }
          
          try {
            const rates = await prisma.serviceRate.findMany({
              where: {
                officerId: officerId,
              },
              include: {
                officer: true
              },
              orderBy: {
                serviceType: 'asc'
              }
            });
            
            if (process.env.NODE_ENV !== 'production') {
              console.log(`[RATES API ${requestId}] Found ${rates.length} rates for officer ${officerId}`);
            }
            if (process.env.NODE_ENV !== 'production') {
              console.log(`[RATES API ${requestId}] Rate IDs:`, rates.map(r => r.id));
            }
            return res.status(200).json(rates);
          } catch (dbError) {
            console.error(`[RATES API ${requestId}] Database error fetching rates for officer ${officerId}:`, dbError);
            return res.status(500).json({ 
              error: 'Failed to fetch rates', 
              details: process.env.NODE_ENV === 'development' ? (dbError as Error).message : undefined 
            });
          }
        }

        // ADMIN and SUPER_ADMIN can see all rates
        if (dbUser.role === 'ADMIN' || dbUser.role === 'SUPER_ADMIN') {
          if (process.env.NODE_ENV !== 'production') {
            console.log(`[RATES API ${requestId}] User is ${dbUser.role}, fetching all rates`);
          }
          
          const allRates = await prisma.serviceRate.findMany({
            include: {
              officer: true
            },
            orderBy: {
              serviceType: 'asc'
            }
          });
          
          if (process.env.NODE_ENV !== 'production') {
            console.log(`[RATES API ${requestId}] Found ${allRates.length} rates total (admin view)`);
          }
          if (process.env.NODE_ENV !== 'production') {
            console.log(`[RATES API ${requestId}] Rate types:`, allRates.map(r => r.serviceType));
          }
          return res.status(200).json(allRates);
        }

        // Marriage officers can only see their own rates
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[RATES API ${requestId}] User is MARRIAGE_OFFICER, finding their officer record`);
        }
        
        const officer = await prisma.marriageOfficer.findUnique({
          where: {
            userId: user.id,
          },
        });

        if (!officer) {
          if (process.env.NODE_ENV !== 'production') {
            console.log(`[RATES API ${requestId}] No officer found for user ID ${user.id}`);
          }
          return res.status(404).json({ error: 'Marriage officer not found' });
        }

        if (process.env.NODE_ENV !== 'production') {
          console.log(`[RATES API ${requestId}] Found officer record: ${officer.id}`);
        }
        
        const rates = await prisma.serviceRate.findMany({
          where: {
            officerId: officer.id,
          },
          include: {
            officer: true
          },
          orderBy: {
            serviceType: 'asc'
          }
        });

        if (process.env.NODE_ENV !== 'production') {
          console.log(`[RATES API ${requestId}] Found ${rates.length} rates for marriage officer ${officer.id}`);
        }
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[RATES API ${requestId}] Rate IDs for officer:`, rates.map(r => r.id));
        }
        return res.status(200).json(rates);
      } catch (error) {
        console.error(`[RATES API ${requestId}] Error fetching rates:`, error);
        return res.status(500).json({ 
          error: 'Internal server error', 
          details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined 
        });
      }
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  } catch (error) {
    console.error(`[RATES API ${requestId}] Error in rates API:`, error);
    return res.status(500).json({ error: 'Internal server error: ' + (error as Error).message });
  }
}