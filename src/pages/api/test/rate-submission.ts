import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/prisma'
import { createClient } from '@/util/supabase/api'
import { ensureUserExists } from '@/util/auth-helpers'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers
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

  // Generate a unique request ID for logging
  const requestId = `test-rate-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  console.log(`[TEST RATE SUBMISSION API ${requestId}] Request received:`, { 
    method: req.method, 
    body: req.body,
    url: req.url
  });
  
  const supabase = createClient(req, res)
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('[TEST RATE SUBMISSION API] Authentication error:', authError);
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('[TEST RATE SUBMISSION API] Authenticated user:', { id: user.id, email: user.email });
    }

    // Ensure user exists in the database
    let dbUser;
    try {
      dbUser = await ensureUserExists(user);
    } catch (error) {
      console.error('Failed to ensure user exists:', error);
      return res.status(401).json({ error: 'Failed to verify user in database' });
    }

    // Only allow POST method
    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST'])
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
    }

    // Check if user has permission to test rate submission
    // Only SUPER_ADMIN and ADMIN can use this test endpoint
    if (dbUser.role !== 'SUPER_ADMIN' && dbUser.role !== 'ADMIN') {
      console.error('[TEST RATE SUBMISSION API] Permission denied: User role is', dbUser.role);
      return res.status(403).json({ error: 'Not authorized to use this test endpoint' });
    }

    const { serviceType, baseRate, travelRatePerKm, officerId } = req.body
    
    console.log('[TEST RATE SUBMISSION API] Extracted values:', {
      serviceType,
      baseRate,
      travelRatePerKm,
      officerId
    });
    
    // Validate required fields
    if (!serviceType || baseRate === undefined || !officerId) {
      const missingFields = [];
      if (!serviceType) missingFields.push('serviceType');
      if (baseRate === undefined) missingFields.push('baseRate');
      if (!officerId) missingFields.push('officerId');
      
      console.error(`[TEST RATE SUBMISSION API ${requestId}] Missing required fields:`, missingFields);
      return res.status(400).json({ 
        error: 'Missing required fields', 
        details: `The following fields are required: ${missingFields.join(', ')}` 
      });
    }
    
    // Ensure baseRate is a number
    if (isNaN(parseFloat(baseRate))) {
      return res.status(400).json({ error: 'Base rate must be a valid number' });
    }
    
    // Ensure travel rate is a number if provided
    if (travelRatePerKm !== null && travelRatePerKm !== undefined && isNaN(parseFloat(travelRatePerKm))) {
      return res.status(400).json({ error: 'Travel rate must be a valid number' });
    }

    // Verify that the officer exists
    const officer = await prisma.marriageOfficer.findUnique({
      where: { id: officerId }
    });

    if (!officer) {
      return res.status(404).json({ error: 'Marriage officer not found' });
    }

    // Convert to Decimal compatible format for Prisma
    const baseRateValue = baseRate.toString();
    const travelRateValue = travelRatePerKm !== null && travelRatePerKm !== undefined 
      ? travelRatePerKm.toString() 
      : null;
    
    console.log('[TEST RATE SUBMISSION API] Preparing to test rate creation with values:', {
      serviceType,
      baseRate: baseRateValue,
      travelRatePerKm: travelRateValue,
      officerId
    });
    
    // Check for existing rate with same service type for this officer
    const existingRate = await prisma.serviceRate.findFirst({
      where: {
        officerId,
        serviceType
      }
    });

    if (existingRate) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[TEST RATE SUBMISSION API ${requestId}] Found existing rate with same service type, will update it:`, existingRate);
      }
      
      // Update the existing rate instead of creating a new one
      const updatedRate = await prisma.serviceRate.update({
        where: { id: existingRate.id },
        data: {
          baseRate: baseRateValue,
          travelRatePerKm: travelRateValue,
        }
      });
      
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[TEST RATE SUBMISSION API ${requestId}] Updated existing rate:`, updatedRate);
      }
      
      return res.status(200).json({
        success: true,
        message: 'Rate updated successfully',
        rate: updatedRate,
        testMetadata: {
          testType: 'rate_update',
          testTime: new Date().toISOString(),
          testUser: { id: user.id, email: user.email, role: dbUser.role },
        }
      });
    } else {
      // Create a new rate as before
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[TEST RATE SUBMISSION API ${requestId}] No existing rate found, creating new rate`);
      }
      
      try {
        // This is a test endpoint, so we'll create the rate but mark it as a test in the logs
        console.log(`[TEST RATE SUBMISSION API ${requestId}] Creating test service rate with data:`, {
          serviceType,
          baseRate: baseRateValue,
          baseRateType: typeof baseRateValue,
          travelRatePerKm: travelRateValue,
          travelRateType: travelRateValue !== null ? typeof travelRateValue : 'null',
          officerId
        });
        
        // Create the rate
        const rate = await prisma.serviceRate.create({
          data: {
            serviceType,
            baseRate: baseRateValue,
            travelRatePerKm: travelRateValue,
            officerId,
          },
        });
        
        // Log the created rate for debugging
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[TEST RATE SUBMISSION API ${requestId}] Created test service rate successfully:`, rate);
        }
        
        // Return success with the created rate and test metadata
        return res.status(201).json({
          success: true,
          message: 'Test rate created successfully',
          rate,
          testMetadata: {
            testType: 'rate_submission',
            testTime: new Date().toISOString(),
            testUser: { id: user.id, email: user.email, role: dbUser.role },
          }
        });
      } catch (createError) {
        console.error(`[TEST RATE SUBMISSION API ${requestId}] Error creating test service rate:`, createError);
        
        // Check for specific Prisma errors related to decimal conversion
        const errorMessage = (createError as Error).message;
        if (errorMessage.includes('Decimal') || errorMessage.includes('numeric')) {
          console.error(`[TEST RATE SUBMISSION API ${requestId}] Decimal conversion error detected. Input values:`, {
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
          error: 'Failed to create test service rate', 
          details: errorMessage 
        });
      }
    }
  } catch (error) {
    console.error(`[TEST RATE SUBMISSION API ${requestId}] Error:`, error)
    return res.status(500).json({ 
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    })
  }
}