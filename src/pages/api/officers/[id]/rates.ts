import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/prisma'
import { createClient } from '@/util/supabase/api'
import { ensureUserExists } from '@/util/auth-helpers'

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

  console.log('[OFFICER RATES API] Request received:', { 
    method: req.method, 
    body: req.body,
    url: req.url,
    headers: req.headers
  });
  
  const supabase = createClient(req, res)
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('[OFFICER RATES API] Authentication error:', authError);
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('[OFFICER RATES API] Authenticated user:', { id: user.id, email: user.email });
    }

    // Ensure user exists in the database
    let dbUser;
    try {
      dbUser = await ensureUserExists(user);
    } catch (error) {
      console.error('Failed to ensure user exists:', error);
      return res.status(401).json({ error: 'Failed to verify user in database' });
    }

    const { id } = req.query

    switch (req.method) {
      case 'GET':
        const rates = await prisma.serviceRate.findMany({
          where: { officerId: id as string }
        })
        return res.status(200).json(rates)

      case 'POST':
        if (process.env.NODE_ENV !== 'production') {
          console.log('[OFFICER RATES API] Processing POST request with body:', req.body);
        }
        
        const { serviceType, baseRate, travelRate, travelRatePerKm, officerId } = req.body
        
        // Use the officerId from the URL if not provided in the body
        const effectiveOfficerId = officerId || id;
        
        console.log('[OFFICER RATES API] Extracted values:', {
          serviceType,
          baseRate,
          travelRate,
          travelRatePerKm,
          officerId: effectiveOfficerId
        });
        
        // Use travelRatePerKm if provided, otherwise fall back to travelRate for backward compatibility
        const travelRateField = travelRatePerKm !== undefined ? travelRatePerKm : travelRate;

        if (!serviceType || baseRate === undefined) {
          return res.status(400).json({ error: 'Missing required fields', details: 'Service type and base rate are required' })
        }
        
        // Ensure baseRate is a number
        if (isNaN(parseFloat(baseRate))) {
          return res.status(400).json({ error: 'Base rate must be a valid number' });
        }
        
        // Ensure travel rate is a number if provided
        if (travelRateField !== null && travelRateField !== undefined && isNaN(parseFloat(travelRateField))) {
          return res.status(400).json({ error: 'Travel rate must be a valid number' });
        }

        // Verify that the officer exists
        const officer = await prisma.marriageOfficer.findUnique({
          where: { id: effectiveOfficerId as string }
        });

        if (!officer) {
          return res.status(404).json({ error: 'Marriage officer not found' });
        }

        // Check if user has permission to create rates
        if (process.env.NODE_ENV !== 'production') {
          console.log('[OFFICER RATES API] Checking permissions for user role:', dbUser.role);
        }
        
        // SUPER_ADMIN can add rates for any officer
        if (dbUser.role === 'SUPER_ADMIN') {
          if (process.env.NODE_ENV !== 'production') {
            console.log('[OFFICER RATES API] User is SUPER_ADMIN, allowing rate creation for any officer');
          }
          // Allow the operation to continue
        } 
        // ADMIN can add rates for any officer
        else if (dbUser.role === 'ADMIN') {
          if (process.env.NODE_ENV !== 'production') {
            console.log('[OFFICER RATES API] User is ADMIN, allowing rate creation for any officer');
          }
          // Allow the operation to continue
        }
        // Marriage officers can only create their own rates
        else {
          if (process.env.NODE_ENV !== 'production') {
            console.log('[OFFICER RATES API] User is MARRIAGE_OFFICER, checking if they own this officer profile');
          }
          const userOfficer = await prisma.marriageOfficer.findUnique({
            where: { userId: user.id }
          });

          if (!userOfficer || userOfficer.id !== effectiveOfficerId) {
            console.error('[OFFICER RATES API] Permission denied: Marriage officer attempting to create rates for another officer');
            return res.status(403).json({ error: 'Not authorized to create rates for this officer' });
          }
          if (process.env.NODE_ENV !== 'production') {
            console.log('[OFFICER RATES API] Marriage officer creating rates for their own profile, allowed');
          }
        }

        // Convert to Decimal compatible format for Prisma
        // For Decimal fields, Prisma accepts strings, numbers, or Decimal objects
        // Using string representation ensures precision is maintained
        const baseRateValue = baseRate.toString();
        const travelRateValue = travelRateField !== null && travelRateField !== undefined 
          ? travelRateField.toString() 
          : null;
        
        console.log('[OFFICER RATES API] Creating service rate with values:', {
          serviceType,
          baseRate: baseRateValue,
          travelRatePerKm: travelRateValue,
          officerId: effectiveOfficerId
        });
        
        try {
          // Add more detailed logging before the create operation
          console.log('[OFFICER RATES API] Attempting to create service rate with data:', {
            serviceType,
            baseRate: baseRateValue,
            baseRateType: typeof baseRateValue,
            travelRatePerKm: travelRateValue,
            travelRateType: travelRateValue !== null ? typeof travelRateValue : 'null',
            officerId: effectiveOfficerId
          });
          
          const rate = await prisma.serviceRate.create({
            data: {
              serviceType,
              baseRate: baseRateValue,
              travelRatePerKm: travelRateValue,
              officerId: effectiveOfficerId as string,
            },
          });
          
          // Log the created rate for debugging
          if (process.env.NODE_ENV !== 'production') {
            console.log('[OFFICER RATES API] Created service rate successfully:', rate);
          }
          
          // Return success with the created rate
          return res.status(201).json({
            success: true,
            rate
          });
        } catch (createError) {
          console.error('[OFFICER RATES API] Error creating service rate:', createError);
          
          // Check for specific Prisma errors related to decimal conversion
          const errorMessage = (createError as Error).message;
          if (errorMessage.includes('Decimal') || errorMessage.includes('numeric')) {
            console.error('[OFFICER RATES API] Decimal conversion error detected. Input values:', {
              baseRate,
              travelRatePerKm,
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

      default:
        res.setHeader('Allow', ['GET', 'POST'])
        return res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  } catch (error) {
    console.error('[OFFICER RATES API] Error:', error)
    return res.status(500).json({ 
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    })
  }
}