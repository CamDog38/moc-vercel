import { createClient } from './api';
import { NextApiRequest, NextApiResponse } from 'next';

/**
 * Creates a Supabase client for use in API routes
 * This function handles authentication via cookies
 */
export function createServerSupabaseClient({ req, res }: { req: NextApiRequest; res: NextApiResponse }) {
  return createClient(req, res);
}
