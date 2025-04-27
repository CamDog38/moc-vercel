import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/util/supabase/api';
import { getBaseUrl } from '@/util/api-helpers';
import { getBaseUrl as getUrlHelperBaseUrl } from '@/util/url-helpers';

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
    // Get the base URL using both utility functions for comparison
    const apiHelperBaseUrl = getBaseUrl();
    const urlHelperBaseUrl = getUrlHelperBaseUrl(req);
    const urlHelperBaseUrlNoReq = getUrlHelperBaseUrl();
    
    // Collect environment information
    const environmentInfo = {
      NODE_ENV: process.env.NODE_ENV || 'not set',
      VERCEL_ENV: process.env.VERCEL_ENV || 'not set',
      NEXT_PUBLIC_CO_DEV_ENV: process.env.NEXT_PUBLIC_CO_DEV_ENV || 'not set',
      VERCEL_URL: process.env.VERCEL_URL || 'not set',
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || 'not set',
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'not set',
      NEXT_PUBLIC_DEPLOYMENT_URL: process.env.NEXT_PUBLIC_DEPLOYMENT_URL || 'not set',
      VERCEL_REGION: process.env.VERCEL_REGION || 'not set',
      VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA || 'not set',
    };
    
    // Collect all request headers for comprehensive debugging
    const allHeaders = { ...req.headers };
    
    // Collect specific request information that's most relevant for URL resolution
    const requestInfo = {
      host: req.headers.host,
      'x-forwarded-proto': req.headers['x-forwarded-proto'],
      'x-forwarded-host': req.headers['x-forwarded-host'],
      'user-agent': req.headers['user-agent'],
      'x-vercel-deployment-url': req.headers['x-vercel-deployment-url'],
      'x-vercel-id': req.headers['x-vercel-id'],
      'x-real-ip': req.headers['x-real-ip'],
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'referer': req.headers.referer,
      'origin': req.headers.origin,
    };
    
    // Check if URLs match
    const urlsMatch = {
      apiHelperMatchesUrlHelper: apiHelperBaseUrl === urlHelperBaseUrl,
      apiHelperMatchesUrlHelperNoReq: apiHelperBaseUrl === urlHelperBaseUrlNoReq,
      urlHelperMatchesUrlHelperNoReq: urlHelperBaseUrl === urlHelperBaseUrlNoReq
    };
    
    // Return all the information
    return res.status(200).json({
      resolvedUrls: {
        apiHelperBaseUrl,
        urlHelperBaseUrl,
        urlHelperBaseUrlNoReq
      },
      urlsMatch,
      environment: environmentInfo,
      requestHeaders: requestInfo,
      isServerSide: typeof window === 'undefined',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in URL resolution debug endpoint:', error);
    return res.status(500).json({ 
      error: 'Failed to check URL resolution',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}