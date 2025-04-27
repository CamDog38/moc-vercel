import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/util/supabase/api';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check authentication
  const supabase = createClient(req, res);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Import the getBaseUrl function and logging
    const { getBaseUrl } = require('@/util/api-helpers');
    const dynamicBaseUrl = getBaseUrl();
    
    // Try to log this check
    try {
      const { addApiLog } = require('./logs');
      addApiLog('Environment variables check called', 'info', 'emails');
    } catch (e) {
      console.warn('Could not log to API logs:', e);
    }
    
    // Check for required environment variables
    const envCheck = {
      SENDGRID_API_KEY: {
        exists: !!process.env.SENDGRID_API_KEY,
        value: process.env.SENDGRID_API_KEY ? '********' : undefined,
        status: !!process.env.SENDGRID_API_KEY ? 'OK' : 'MISSING'
      },
      SENDGRID_FROM_EMAIL: {
        exists: !!process.env.SENDGRID_FROM_EMAIL,
        value: process.env.SENDGRID_FROM_EMAIL,
        status: !!process.env.SENDGRID_FROM_EMAIL ? 'OK' : 'MISSING'
      },
      DATABASE_URL: {
        exists: !!process.env.DATABASE_URL,
        value: process.env.DATABASE_URL ? '********' : undefined,
        status: !!process.env.DATABASE_URL ? 'OK' : 'MISSING'
      },
      NEXT_PUBLIC_SUPABASE_URL: {
        exists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        value: process.env.NEXT_PUBLIC_SUPABASE_URL,
        status: !!process.env.NEXT_PUBLIC_SUPABASE_URL ? 'OK' : 'MISSING'
      },
      NEXT_PUBLIC_SUPABASE_ANON_KEY: {
        exists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '********' : undefined,
        status: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'OK' : 'MISSING'
      },
      SUPABASE_SERVICE_ROLE_KEY: {
        exists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        value: process.env.SUPABASE_SERVICE_ROLE_KEY ? '********' : undefined,
        status: !!process.env.SUPABASE_SERVICE_ROLE_KEY ? 'OK' : 'MISSING'
      },
      NEXT_PUBLIC_BASE_URL: {
        exists: !!process.env.NEXT_PUBLIC_BASE_URL,
        value: process.env.NEXT_PUBLIC_BASE_URL,
        status: !!process.env.NEXT_PUBLIC_BASE_URL ? 'OK' : 'MISSING'
      },
      NEXT_PUBLIC_CO_DEV_ENV: {
        exists: !!process.env.NEXT_PUBLIC_CO_DEV_ENV,
        value: process.env.NEXT_PUBLIC_CO_DEV_ENV,
        status: !!process.env.NEXT_PUBLIC_CO_DEV_ENV ? 'OK' : 'MISSING'
      }
    };

    // Check if all required email variables are set
    const emailConfigStatus = 
      envCheck.SENDGRID_API_KEY.exists && 
      envCheck.SENDGRID_FROM_EMAIL.exists ? 'OK' : 'INCOMPLETE';

    // Check if all required auth variables are set
    const authConfigStatus = 
      envCheck.NEXT_PUBLIC_SUPABASE_URL.exists && 
      envCheck.NEXT_PUBLIC_SUPABASE_ANON_KEY.exists &&
      envCheck.SUPABASE_SERVICE_ROLE_KEY.exists ? 'OK' : 'INCOMPLETE';

    // Check if all required database variables are set
    const dbConfigStatus = 
      envCheck.DATABASE_URL.exists ? 'OK' : 'INCOMPLETE';

    // Log the email config status
    try {
      const { addApiLog } = require('./logs');
      addApiLog(`Email config status: ${emailConfigStatus}`, emailConfigStatus === 'OK' ? 'success' : 'error', 'emails');
      
      // Log specific SendGrid variables
      addApiLog(`SENDGRID_API_KEY: ${envCheck.SENDGRID_API_KEY.exists ? 'Configured' : 'Missing'}`, 
               envCheck.SENDGRID_API_KEY.exists ? 'info' : 'error', 'emails');
      addApiLog(`SENDGRID_FROM_EMAIL: ${envCheck.SENDGRID_FROM_EMAIL.exists ? envCheck.SENDGRID_FROM_EMAIL.value : 'Missing'}`, 
               envCheck.SENDGRID_FROM_EMAIL.exists ? 'info' : 'error', 'emails');
    } catch (e) {
      console.warn('Could not log to API logs:', e);
    }
    
    return res.status(200).json({
      emailConfig: {
        status: emailConfigStatus,
        message: emailConfigStatus === 'OK' 
          ? 'Email configuration is complete' 
          : 'Email configuration is incomplete'
      },
      authConfig: {
        status: authConfigStatus,
        message: authConfigStatus === 'OK' 
          ? 'Authentication configuration is complete' 
          : 'Authentication configuration is incomplete'
      },
      dbConfig: {
        status: dbConfigStatus,
        message: dbConfigStatus === 'OK' 
          ? 'Database configuration is complete' 
          : 'Database configuration is incomplete'
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || 'unknown',
        coDevEnv: process.env.NEXT_PUBLIC_CO_DEV_ENV || 'unknown',
        dynamicBaseUrl: dynamicBaseUrl,
        configuredBaseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'not set'
      },
      variables: envCheck,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking environment variables:', error);
    return res.status(500).json({ 
      error: 'Failed to check environment variables',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
